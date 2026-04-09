"""
REST: open DM, list conversations,
list/send messages (optional HTTP send).
"""

import json
import logging

from bson import ObjectId
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from fastapi.encoders import jsonable_encoder
from jose import JWTError, jwt

from app.core.messaging import (
    connection_manager,
    other_participant_id,
    try_commit_dm,
)
from app.db.connect import get_db
from app.routers.auth import JWT_ALGORITHM, _get_jwt_secret

logger = logging.getLogger(__name__)

router = APIRouter()


def _ws_error_envelope(code: str, message: str) -> dict:
    return {"type": "error", "payload": {"code": code, "message": message}}


def _ws_message_created_envelope(message_api_dict: dict) -> dict:
    return {
        "type": "message_created",
        "payload": jsonable_encoder(message_api_dict),
    }


async def _handle_send_message(
    db, sender_oid: ObjectId, payload: object
) -> dict | None:
    if not isinstance(payload, dict):
        return _ws_error_envelope("invalid_payload", "Payload must be an object.")

    conv_id = payload.get("conversation_id")
    content = payload.get("content")
    if not isinstance(conv_id, str) or not isinstance(content, str):
        return _ws_error_envelope(
            "invalid_payload", "conversation_id and content must be strings."
        )

    result = try_commit_dm(db, sender_oid, conv_id, content)
    if not result.ok:
        assert result.error is not None
        return _ws_error_envelope(result.error.code, result.error.message)

    assert result.message is not None
    frame = _ws_message_created_envelope(result.message)

    peer = other_participant_id(
        db["conversations"].find_one({"_id": ObjectId(conv_id)}),
        sender_oid,
    )

    if peer is not None:
        await connection_manager.send_envelope(str(peer), frame)

    return frame


@router.websocket("/ws")
async def dm_socket(
    websocket: WebSocket, token: str | None = Query(default=None), db=Depends(get_db)
):
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        if not email:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user = db["users"].find_one({"email": email})
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id_str = str(user["_id"])
    sender_oid = ObjectId(user_id_str)

    await websocket.accept()
    await connection_manager.register(user_id_str, websocket)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(
                    json.dumps(
                        _ws_error_envelope(
                            "invalid_envelope", "Top-level JSON must be an object."
                        )
                    )
                )
                continue

            if not isinstance(data, dict):
                await websocket.send_text(
                    json.dumps(
                        _ws_error_envelope(
                            "invalid_envelope", "Top-level JSON must be an object."
                        )
                    )
                )
                continue

            msg_type = data.get("type")
            msg_payload = data.get("payload")
            if not isinstance(msg_type, str) or not isinstance(msg_payload, dict):
                await websocket.send_text(
                    json.dumps(
                        _ws_error_envelope(
                            "invalid_envelope",
                            "Required: type (string) and payload (object).",
                        )
                    )
                )
                continue

            if msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "payload": {}}))
                continue

            if msg_type == "send_message":
                out = await _handle_send_message(db, sender_oid, msg_payload)
                if out is not None:
                    await websocket.send_text(json.dumps(out))
                continue

            await websocket.send_text(
                json.dumps(
                    _ws_error_envelope("unknown_type", f"Unknown type: {msg_type!r}.")
                )
            )

    except WebSocketDisconnect:
        pass
    finally:
        connection_manager.disconnect(user_id_str)
