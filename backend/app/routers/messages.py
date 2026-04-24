# sender uses POST response; receiver uses WS + GET.
import json

from bson import ObjectId
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from fastapi.encoders import jsonable_encoder
from jose import JWTError, jwt

from app.core.messaging import (
    connection_manager,
    conversation_has_participant,
    get_or_create_conversation,
    list_conversations_for_user,
    list_messages_page,
    message_doc_to_api_dict,
    other_participant_id,
    try_delete_dm_message,
    try_commit_dm,
)
from app.db.connect import get_db
from app.models.schemas import (
    ConversationRead,
    DmOpenRequest,
    MessageCreate,
    MessageRead,
    UserRead,
)
from app.routers.auth import JWT_ALGORITHM, _get_jwt_secret, get_current_user

router = APIRouter()

# WebSocket error codes (WEBSOCKET ONLY)
ERR_INVALID_JSON = "invalid_json"
ERR_INVALID_ENVELOPE = "invalid_envelope"
ERR_UNKNOWN_TYPE = "unknown_type"


def _conversation_to_read(db, conv: dict) -> ConversationRead:
    """Build ConversationRead with embedded UserRead for each participant."""
    participants: list[UserRead] = []
    for pid in conv.get("participant_ids", []):
        doc = db["users"].find_one({"_id": pid})
        if doc is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Participant user missing for this conversation.",
            )
        doc = doc.copy()
        doc["_id"] = str(doc["_id"])
        participants.append(UserRead(**doc))

    return ConversationRead(
        id=str(conv["_id"]),
        participants=participants,
        last_message_at=conv.get("last_message_at"),
        last_message_preview=conv.get("last_message_preview"),
        created_at=conv["created_at"],
    )


def _ws_error_envelope(code: str, message: str) -> dict:
    return {"type": "error", "payload": {"code": code, "message": message}}


def _ws_message_created_envelope(message_api_dict: dict) -> dict:
    return {
        "type": "message_created",
        "payload": jsonable_encoder(message_api_dict),
    }


def _raise_http_for_failed_dm(result) -> None:
    """Map try_commit_dm failure to HTTPException."""
    if result.ok:
        return
    assert result.error is not None
    code = result.error.code
    msg = result.error.message
    status_map = {
        "invalid_conversation_id": status.HTTP_400_BAD_REQUEST,
        "conversation_not_found": status.HTTP_404_NOT_FOUND,
        "forbidden": status.HTTP_403_FORBIDDEN,
        "validation_error": status.HTTP_422_UNPROCESSABLE_CONTENT,
        "internal_error": status.HTTP_500_INTERNAL_SERVER_ERROR,
    }
    st = status_map.get(code, status.HTTP_500_INTERNAL_SERVER_ERROR)
    raise HTTPException(status_code=st, detail=msg)


def _raise_http_for_failed_delete_dm(result) -> None:
    """Map try_delete_dm_message failure to HTTPException."""
    if result.ok:
        return
    assert result.error is not None
    code = result.error.code
    msg = result.error.message
    status_map = {
        "invalid_conversation_id": status.HTTP_400_BAD_REQUEST,
        "invalid_message_id": status.HTTP_400_BAD_REQUEST,
        "conversation_not_found": status.HTTP_404_NOT_FOUND,
        "message_not_found": status.HTTP_404_NOT_FOUND,
        "forbidden": status.HTTP_403_FORBIDDEN,
        "internal_error": status.HTTP_500_INTERNAL_SERVER_ERROR,
    }
    st = status_map.get(code, status.HTTP_500_INTERNAL_SERVER_ERROR)
    raise HTTPException(status_code=st, detail=msg)


# REST: Open or resume a DM with another user; returns the conversation (idempotent).
@router.post(
    "/conversations",
    response_model=ConversationRead,
    status_code=status.HTTP_200_OK,
)
def open_or_get_dm(
    body: DmOpenRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create or return the 1:1 DM with the other user (idempotent)."""
    try:
        other_oid = ObjectId(body.other_user_id)
        me_oid = ObjectId(current_user["_id"])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id."
        )

    if other_oid == me_oid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot open a DM with yourself.",
        )

    if db["users"].find_one({"_id": other_oid}) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    conv = get_or_create_conversation(db, me_oid, other_oid)
    return _conversation_to_read(db, conv)


# REST: List all conversations the current user participates in (inbox).
@router.get("/conversations", response_model=list[ConversationRead])
def list_my_conversations(
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Inbox: conversations for the current user, newest activity first."""
    user_oid = ObjectId(current_user["_id"])
    convs = list_conversations_for_user(db, user_oid)
    return [_conversation_to_read(db, c) for c in convs]


# REST: Paginated message history for one conversation.
@router.get(
    "/conversations/{conversation_id}",
    response_model=list[MessageRead],
)
def get_conversation_messages(
    conversation_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    before: str | None = Query(
        default=None,
        description="Message id; return only messages older than this anchor.",
    ),
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Paginated message history; membership required."""
    try:
        conv_oid = ObjectId(conversation_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation id.",
        )

    conv = db["conversations"].find_one({"_id": conv_oid})
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )

    me = ObjectId(current_user["_id"])
    if not conversation_has_participant(conv, me):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this conversation.",
        )

    rows = list_messages_page(db, conv_oid, limit=limit, before_message_id=before)
    return [MessageRead(**message_doc_to_api_dict(doc)) for doc in rows]


# REST: Send a message; sender uses this response as source of truth.
# Peer receives message_created over WebSocket if connected.
@router.post(
    "/conversations/{conversation_id}",
    response_model=MessageRead,
    status_code=status.HTTP_201_CREATED,
)
async def send_conversation_message(
    conversation_id: str,
    body: MessageCreate,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    sender_oid = ObjectId(current_user["_id"])
    result = try_commit_dm(db, sender_oid, conversation_id, body.content)
    _raise_http_for_failed_dm(result)
    assert result.message is not None
    api_dict = result.message
    msg_read = MessageRead(**api_dict)
    conv = db["conversations"].find_one({"_id": ObjectId(conversation_id)})
    if conv is not None:
        peer = other_participant_id(conv, sender_oid)
        if peer is not None:
            frame = _ws_message_created_envelope(api_dict)
            await connection_manager.send_envelope(str(peer), frame)
    return msg_read


@router.delete(
    "/conversations/{conversation_id}/messages/{message_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_conversation_message(
    conversation_id: str,
    message_id: str,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    requester_oid = ObjectId(current_user["_id"])
    result = try_delete_dm_message(db, requester_oid, conversation_id, message_id)
    _raise_http_for_failed_delete_dm(result)
    return None


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
                            ERR_INVALID_JSON, "Body must be a valid JSON."
                        )
                    )
                )
                continue

            if not isinstance(data, dict):
                await websocket.send_text(
                    json.dumps(
                        _ws_error_envelope(
                            ERR_INVALID_ENVELOPE, "Top-level JSON must be an object."
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
                            ERR_INVALID_ENVELOPE,
                            "Required: type (string) and payload (object).",
                        )
                    )
                )
                continue

            if msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "payload": {}}))
                continue

            await websocket.send_text(
                json.dumps(
                    _ws_error_envelope(ERR_UNKNOWN_TYPE, f"Unknown type: {msg_type!r}.")
                )
            )

    except WebSocketDisconnect:
        pass
    finally:
        connection_manager.disconnect(user_id_str, websocket)
