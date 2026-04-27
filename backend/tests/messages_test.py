import asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient

from app.app import app
from app.core.messaging import (
    ConnectionManager,
    canonical_participant_ids,
    conversation_has_participant,
    message_doc_to_api_dict,
    other_participant_id,
    try_commit_dm,
    try_delete_dm_message,
)
from app.db.connect import get_db
from app.routers.auth import get_current_user

TEST_USER_ID = str(ObjectId())
OTHER_USER_ID = str(ObjectId())
THIRD_USER_ID = str(ObjectId())
TEST_CONV_ID = str(ObjectId())
TEST_MSG_ID = str(ObjectId())


@pytest.fixture()
def mock_db():
    return MagicMock()


@pytest.fixture()
def client(mock_db):
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: {"_id": TEST_USER_ID}
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def valid_conv_doc():
    now = datetime.now(timezone.utc)
    return {
        "_id": ObjectId(TEST_CONV_ID),
        "participant_ids": [ObjectId(TEST_USER_ID), ObjectId(OTHER_USER_ID)],
        "created_at": now,
        "updated_at": now,
        "last_message_at": None,
        "last_message_preview": None,
    }


@pytest.fixture()
def valid_message_doc():
    return {
        "_id": ObjectId(TEST_MSG_ID),
        "conversation_id": ObjectId(TEST_CONV_ID),
        "sender_id": ObjectId(TEST_USER_ID),
        "content": "hello",
        "created_at": datetime.now(timezone.utc),
    }


class TestMessagingHelpers:
    def test_canonical_participant_ids_stable_order(self):
        user_a = ObjectId(TEST_USER_ID)
        user_b = ObjectId(OTHER_USER_ID)

        first = canonical_participant_ids(user_a, user_b)
        second = canonical_participant_ids(user_b, user_a)

        assert first == second
        assert len(first) == 2

    def test_conversation_has_participant_true(self, valid_conv_doc):
        has_member = conversation_has_participant(
            valid_conv_doc, ObjectId(TEST_USER_ID)
        )
        assert has_member is True

    def test_conversation_has_participant_false(self, valid_conv_doc):
        has_member = conversation_has_participant(
            valid_conv_doc, ObjectId(THIRD_USER_ID)
        )
        assert has_member is False

    def test_other_participant_id_returns_peer(self, valid_conv_doc):
        sender_oid = ObjectId(TEST_USER_ID)
        peer_oid = other_participant_id(valid_conv_doc, sender_oid)
        assert peer_oid == ObjectId(OTHER_USER_ID)

    def test_message_doc_to_api_dict_stringifies_ids(self, valid_message_doc):
        api_dict = message_doc_to_api_dict(valid_message_doc)
        assert api_dict["_id"] == TEST_MSG_ID
        assert api_dict["conversation_id"] == TEST_CONV_ID
        assert api_dict["sender_id"] == TEST_USER_ID


class TestTryCommitDm:
    def test_invalid_conversation_id_returns_failure(self, mock_db):
        result = try_commit_dm(mock_db, ObjectId(TEST_USER_ID), "bad-id", "hi")
        assert result.ok is False
        assert result.error is not None
        assert result.error.code == "invalid_conversation_id"

    def test_conversation_not_found_returns_failure(self, mock_db):
        mock_db["conversations"].find_one.return_value = None
        result = try_commit_dm(mock_db, ObjectId(TEST_USER_ID), TEST_CONV_ID, "hi")
        assert result.ok is False
        assert result.error is not None
        assert result.error.code == "conversation_not_found"

    def test_forbidden_when_not_participant(self, mock_db):
        mock_db["conversations"].find_one.return_value = {
            "_id": ObjectId(TEST_CONV_ID),
            "participant_ids": [ObjectId(OTHER_USER_ID), ObjectId(THIRD_USER_ID)],
        }
        result = try_commit_dm(mock_db, ObjectId(TEST_USER_ID), TEST_CONV_ID, "hi")
        assert result.ok is False
        assert result.error is not None
        assert result.error.code == "forbidden"

    def test_validation_error_on_empty_content(self, mock_db, valid_conv_doc):
        mock_db["conversations"].find_one.return_value = valid_conv_doc
        result = try_commit_dm(mock_db, ObjectId(TEST_USER_ID), TEST_CONV_ID, "")
        assert result.ok is False
        assert result.error is not None
        assert result.error.code == "validation_error"

    def test_success_persists_message_and_updates_conversation(
        self, mock_db, valid_conv_doc
    ):
        mock_db["conversations"].find_one.return_value = valid_conv_doc
        mock_db["messages"].insert_one.return_value.inserted_id = ObjectId(TEST_MSG_ID)

        result = try_commit_dm(mock_db, ObjectId(TEST_USER_ID), TEST_CONV_ID, "hello")

        assert result.ok is True
        assert result.message is not None
        assert result.message["_id"] == TEST_MSG_ID
        assert result.message["conversation_id"] == TEST_CONV_ID
        assert result.message["sender_id"] == TEST_USER_ID
        mock_db["messages"].insert_one.assert_called_once()
        mock_db["conversations"].update_one.assert_called_once()


class TestTryDeleteDmMessage:
    @staticmethod
    def _wire_message_collections(mock_db):
        conversations = MagicMock()
        messages = MagicMock()

        def _get_collection(name):
            if name == "conversations":
                return conversations
            if name == "messages":
                return messages
            return MagicMock()

        mock_db.__getitem__.side_effect = _get_collection
        return conversations, messages

    def test_invalid_conversation_id_returns_failure(self, mock_db):
        result = try_delete_dm_message(
            mock_db, ObjectId(TEST_USER_ID), "bad-id", TEST_MSG_ID
        )
        assert result.ok is False
        assert result.error is not None
        assert result.error.code == "invalid_conversation_id"

    def test_invalid_message_id_returns_failure(self, mock_db):
        result = try_delete_dm_message(
            mock_db, ObjectId(TEST_USER_ID), TEST_CONV_ID, "bad-id"
        )
        assert result.ok is False
        assert result.error is not None
        assert result.error.code == "invalid_message_id"

    def test_conversation_not_found_returns_failure(self, mock_db):
        conversations, _messages = self._wire_message_collections(mock_db)
        conversations.find_one.return_value = None
        result = try_delete_dm_message(
            mock_db, ObjectId(TEST_USER_ID), TEST_CONV_ID, TEST_MSG_ID
        )
        assert result.ok is False
        assert result.error is not None
        assert result.error.code == "conversation_not_found"

    def test_message_not_found_returns_failure(self, mock_db, valid_conv_doc):
        conversations, messages = self._wire_message_collections(mock_db)
        conversations.find_one.return_value = valid_conv_doc
        messages.find_one.side_effect = [None]
        result = try_delete_dm_message(
            mock_db, ObjectId(TEST_USER_ID), TEST_CONV_ID, TEST_MSG_ID
        )
        assert result.ok is False
        assert result.error is not None
        assert result.error.code == "message_not_found"

    def test_success_deletes_message_and_refreshes_summary(
        self, mock_db, valid_conv_doc
    ):
        conversations, messages = self._wire_message_collections(mock_db)
        conversations.find_one.return_value = valid_conv_doc
        messages.find_one.side_effect = [
            {
                "_id": ObjectId(TEST_MSG_ID),
                "conversation_id": ObjectId(TEST_CONV_ID),
                "sender_id": ObjectId(TEST_USER_ID),
                "content": "to delete",
                "created_at": datetime.now(timezone.utc),
            },
            {
                "_id": ObjectId(),
                "conversation_id": ObjectId(TEST_CONV_ID),
                "sender_id": ObjectId(OTHER_USER_ID),
                "content": "remaining latest",
                "created_at": datetime.now(timezone.utc),
            },
        ]

        result = try_delete_dm_message(
            mock_db, ObjectId(TEST_USER_ID), TEST_CONV_ID, TEST_MSG_ID
        )

        assert result.ok is True
        messages.delete_one.assert_called_once()
        conversations.update_one.assert_called_once()

    def test_delete_fails_when_requester_is_not_message_sender(
        self, mock_db, valid_conv_doc
    ):
        conversations, messages = self._wire_message_collections(mock_db)
        conversations.find_one.return_value = valid_conv_doc
        messages.find_one.return_value = {
            "_id": ObjectId(TEST_MSG_ID),
            "conversation_id": ObjectId(TEST_CONV_ID),
            "sender_id": ObjectId(OTHER_USER_ID),
            "content": "not yours",
            "created_at": datetime.now(timezone.utc),
        }

        result = try_delete_dm_message(
            mock_db, ObjectId(TEST_USER_ID), TEST_CONV_ID, TEST_MSG_ID
        )

        assert result.ok is False
        assert result.error is not None
        assert result.error.code == "forbidden"
        messages.delete_one.assert_not_called()


class TestConnectionManager:
    def test_second_register_closes_previous_socket(self):
        async def _run() -> None:
            mgr = ConnectionManager()
            ws_old = AsyncMock()
            ws_old.close = AsyncMock()
            ws_new = AsyncMock()
            ws_new.close = AsyncMock()
            await mgr.register("u1", ws_old)
            await mgr.register("u1", ws_new)
            ws_old.close.assert_awaited_once_with(code=1001)
            assert mgr._connections["u1"] is ws_new
            ws_new.close.assert_not_awaited()

        asyncio.run(_run())

    def test_disconnect_superseded_socket_does_not_remove_current(self):
        async def _run() -> None:
            mgr = ConnectionManager()
            ws_old = AsyncMock()
            ws_old.close = AsyncMock()
            ws_new = AsyncMock()
            await mgr.register("u1", ws_old)
            await mgr.register("u1", ws_new)
            mgr.disconnect("u1", ws_old)
            assert mgr._connections.get("u1") is ws_new

        asyncio.run(_run())

    def test_disconnect_other_socket_instance_does_not_pop(self):
        async def _run() -> None:
            mgr = ConnectionManager()
            ws_a = AsyncMock()
            ws_a.close = AsyncMock()
            await mgr.register("u1", ws_a)
            other = AsyncMock()
            mgr.disconnect("u1", other)
            assert mgr._connections.get("u1") is ws_a

        asyncio.run(_run())

    def test_send_envelope_failure_drops_only_that_connection(self):
        async def _run() -> None:
            mgr = ConnectionManager()
            ws = AsyncMock()
            ws.send_text = AsyncMock(side_effect=RuntimeError("send failed"))
            await mgr.register("u1", ws)
            await mgr.send_envelope("u1", {"type": "message_created", "payload": {}})
            assert "u1" not in mgr._connections

        asyncio.run(_run())


class TestMessagesRouter:
    def test_open_or_get_dm_success_returns_200(self, client, mock_db):
        target_user_doc = {
            "_id": ObjectId(OTHER_USER_ID),
            "username": "other",
            "full_name": "Other User",
            "major": "CS",
            "bio": None,
            "skills": [],
            "external_links": {},
            "email": "other@my.unt.edu",
            "created_at": datetime.now(timezone.utc),
        }
        me_user_doc = {
            "_id": ObjectId(TEST_USER_ID),
            "username": "me",
            "full_name": "Me User",
            "major": "CS",
            "bio": None,
            "skills": [],
            "external_links": {},
            "email": "me@my.unt.edu",
            "created_at": datetime.now(timezone.utc),
        }
        mock_db["users"].find_one.side_effect = [
            target_user_doc,
            me_user_doc,
            target_user_doc,
        ]
        mock_db["conversations"].find_one.return_value = None
        mock_db["conversations"].insert_one.return_value.inserted_id = ObjectId(
            TEST_CONV_ID
        )

        resp = client.post(
            "/api/messages/conversations",
            json={"other_user_id": OTHER_USER_ID},
        )

        assert resp.status_code == 200
        body = resp.json()
        assert "participants" in body

    def test_get_messages_forbidden_returns_403(self, client, mock_db):
        mock_db["conversations"].find_one.return_value = {
            "_id": ObjectId(TEST_CONV_ID),
            "participant_ids": [ObjectId(OTHER_USER_ID), ObjectId(THIRD_USER_ID)],
        }

        resp = client.get(f"/api/messages/conversations/{TEST_CONV_ID}")

        assert resp.status_code == 403

    def test_send_message_success_returns_201(self, client, mock_db, valid_conv_doc):
        mock_db["conversations"].find_one.side_effect = [valid_conv_doc, valid_conv_doc]
        mock_db["messages"].insert_one.return_value.inserted_id = ObjectId(TEST_MSG_ID)

        resp = client.post(
            f"/api/messages/conversations/{TEST_CONV_ID}",
            json={"content": "hello"},
        )

        assert resp.status_code == 201
        body = resp.json()
        assert body["_id"] == TEST_MSG_ID
        assert body["conversation_id"] == TEST_CONV_ID
        assert body["content"] == "hello"

    def test_delete_message_success_returns_204(self, client, mock_db, valid_conv_doc):
        conversations = MagicMock()
        messages = MagicMock()
        mock_db.__getitem__.side_effect = lambda name: (
            conversations if name == "conversations" else messages
        )
        conversations.find_one.return_value = valid_conv_doc
        messages.find_one.side_effect = [
            {
                "_id": ObjectId(TEST_MSG_ID),
                "conversation_id": ObjectId(TEST_CONV_ID),
                "sender_id": ObjectId(TEST_USER_ID),
                "content": "delete me",
                "created_at": datetime.now(timezone.utc),
            },
            {
                "_id": ObjectId(),
                "conversation_id": ObjectId(TEST_CONV_ID),
                "sender_id": ObjectId(TEST_USER_ID),
                "content": "new latest",
                "created_at": datetime.now(timezone.utc),
            },
        ]

        resp = client.delete(
            f"/api/messages/conversations/{TEST_CONV_ID}/messages/{TEST_MSG_ID}"
        )

        assert resp.status_code == 204

    def test_delete_message_forbidden_returns_403(self, client, mock_db):
        conversations = MagicMock()
        messages = MagicMock()
        mock_db.__getitem__.side_effect = lambda name: (
            conversations if name == "conversations" else messages
        )
        conversations.find_one.return_value = {
            "_id": ObjectId(TEST_CONV_ID),
            "participant_ids": [ObjectId(OTHER_USER_ID), ObjectId(THIRD_USER_ID)],
        }

        resp = client.delete(
            f"/api/messages/conversations/{TEST_CONV_ID}/messages/{TEST_MSG_ID}"
        )

        assert resp.status_code == 403
