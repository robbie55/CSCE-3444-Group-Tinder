"""
Mongo helpers, pagination, and WebSocket fan-out.
REST remains the source of truth for history; WebSocket pushes `message_created`
to the other participant when their socket is connected.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from pydantic import ValidationError
from pymongo import ASCENDING, DESCENDING
from starlette.websockets import WebSocket

from app.models.schemas import MessageCreate

logger = logging.getLogger(__name__)

PREVIEW_MAX_LEN = 200


class ConnectionManager:
    """Maps authenticated user id (string) -> one active WebSocket."""

    def __init__(self) -> None:
        self._connections: dict[str, WebSocket] = {}

    async def register(self, user_id: str, websocket: WebSocket) -> None:
        self._connections[user_id] = websocket

    def disconnect(self, user_id: str) -> None:
        self._connections.pop(user_id, None)

    async def send_envelope(self, user_id: str, envelope: dict[str, Any]) -> None:
        ws = self._connections.get(user_id)
        if ws is None:
            return
        try:
            await ws.send_text(json.dumps(envelope))
        except Exception:
            logger.debug("WS send failed for user %s; dropping connection", user_id)
            self.disconnect(user_id)


connection_manager = ConnectionManager()


def ensure_messaging_indexes(db) -> None:
    """Idempotent index setup for conversations and messages."""
    db["conversations"].create_index(
        [("participant_ids", ASCENDING)],
        unique=True,
        name="uniq_dm_participants",
    )
    db["messages"].create_index(
        [("conversation_id", ASCENDING), ("created_at", DESCENDING)],
        name="messages_by_conversation_recent",
    )


def canonical_participant_ids(a: ObjectId, b: ObjectId) -> list[ObjectId]:
    """Stable two-element list so each DM pair maps to one document."""
    return [a, b] if a <= b else [b, a]


def get_or_create_conversation(db, user_a: ObjectId, user_b: ObjectId) -> dict:
    if user_a == user_b:
        raise ValueError("Cannot open a DM with yourself.")
    participants = canonical_participant_ids(user_a, user_b)
    existing = db["conversations"].find_one({"participant_ids": participants})
    if existing:
        return existing

    now = datetime.now(timezone.utc)
    doc = {
        "participant_ids": participants,
        "created_at": now,
        "updated_at": now,
        "last_message_at": None,
        "last_message_preview": None,
    }
    try:
        result = db["conversations"].insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc
    except Exception:
        # Race: another request created the same pair; return canonical row.
        existing = db["conversations"].find_one({"participant_ids": participants})
        if existing:
            return existing
        raise


def conversation_has_participant(conv: dict, user_oid: ObjectId) -> bool:
    return user_oid in conv.get("participant_ids", [])


def other_participant_id(conv: dict, sender_oid: ObjectId) -> ObjectId | None:
    for oid in conv.get("participant_ids", []):
        if oid != sender_oid:
            return oid
    return None


def insert_message(
    db,
    conv: dict,
    sender_oid: ObjectId,
    content: str,
) -> dict:
    """Persist a message and bump conversation summary fields."""
    now = datetime.now(timezone.utc)
    text = content.strip()
    preview = (
        text if len(text) <= PREVIEW_MAX_LEN else text[: PREVIEW_MAX_LEN - 1] + "..."
    )

    msg = {
        "conversation_id": conv["_id"],
        "sender_id": sender_oid,
        "content": text,
        "created_at": now,
    }
    ins = db["messages"].insert_one(msg)
    msg["_id"] = ins.inserted_id

    db["conversations"].update_one(
        {"_id": conv["_id"]},
        {
            "$set": {
                "updated_at": now,
                "last_message_at": now,
                "last_message_preview": preview,
            }
        },
    )
    return msg


def list_messages_page(
    db,
    conversation_oid: ObjectId,
    *,
    limit: int,
    before_message_id: str | None,
) -> list[dict]:
    """
    Return the most recent `limit` messages in chronological order (oldest first).
    When before_message_id is set, only messages strictly older than that anchor
    (by created_at, then _id) are considered, used to load older history.
    """
    query: dict[str, Any] = {"conversaton_id": conversation_oid}
    if before_message_id:
        try:
            anchor_oid = ObjectId(before_message_id)
        except Exception:
            return []
        anchor = db["messages"].find_one(
            {"_id": anchor_oid, "conversation_id": conversation_oid}
        )
        if not anchor:
            return []
        query["$or"] = [
            {"created_at": {"$lt": anchor["created_at"]}},
            {
                "created_at": anchor["created_at"],
                "_id": {"$lt": anchor_oid},
            },
        ]

    cursor = (
        db["messages"]
        .find(query)
        .sort([("created_at", DESCENDING), ("_id", DESCENDING)])
        .limit(limit)
    )
    batch = list(cursor)
    batch.reverse()
    return batch


def list_conversations_for_user(db, user_oid: ObjectId) -> list[dict]:
    """Conversations that include this user, newest activity first."""
    return list(
        db["conversations"]
        .find({"participant_ids": user_oid})
        .sort([("last_message_at", DESCENDING), ("updated_at", DESCENDING)])
    )


def message_doc_to_api_dict(doc: dict) -> dict:
    out = doc.copy()
    out["_id"] = str(doc["_id"])
    out["conversation_id"] = str(doc["conversation_id"])
    out["sender_id"] = str(doc["sender_id"])
    return out


@dataclass(frozen=True)
class _DmSendError:
    code: str
    message: str


@dataclass(frozen=True)
class _DmSendResult:
    ok: bool
    message: dict[str, Any] | None = None
    error: _DmSendError | None = None

    @classmethod
    def success(cls, message: dict[str, Any]) -> "_DmSendResult":
        return cls(ok=True, message=message, error=None)

    @classmethod
    def failure(cls, code: str, message: str) -> "_DmSendResult":
        return cls(ok=False, message=None, error=_DmSendError(code, message))


def try_commit_dm(
    db,
    sender_oid: ObjectId,
    conversation_id: str,
    content: str,
) -> _DmSendResult:
    try:
        conv_oid = ObjectId(conversation_id)
    except Exception:
        return _DmSendResult.failure(
            "invalid_conversation_id", "Invalid conversation id."
        )

    conv = db["conversations"].find_one({"_id": conv_oid})
    if not conv:
        return _DmSendResult.failure(
            "conversation_not_found", "Conversation not found."
        )

    if not conversation_has_participant(conv, sender_oid):
        return _DmSendResult.failure(
            "forbidden", "You are not a member of this conversation."
        )

    try:
        body = MessageCreate.model_validate({"content": content})
    except ValidationError as e:
        err = e.errors()[0]
        return _DmSendResult.failure(
            "validation_error",
            err.get("msg", "Invalid message body."),
        )

    try:
        msg_doc = insert_message(db, conv, sender_oid, body.content)
    except Exception:
        return _DmSendResult.failure("internal_error", "Could not save message.")

    return _DmSendResult.success(message_doc_to_api_dict(msg_doc))
