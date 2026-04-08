from dataclasses import dataclass
from typing import Any

from bson import ObjectId
from pydantic import ValidationError

from app.models.schemas import MessageCreate


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
