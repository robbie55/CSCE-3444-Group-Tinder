from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from bson import ObjectId
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pymongo.errors import DuplicateKeyError

from app.app import app
from app.db.connect import get_db
from app.routers import groups as groups_router
from app.routers.auth import get_current_user

TEST_USER_ID = str(ObjectId())
TEST_GROUP_ID = str(ObjectId())


@pytest.fixture()
def mock_db():
    """Mock DB with distinct collections so groups.find and users.find don't share state."""
    groups_collection = MagicMock()
    users_collection = MagicMock()

    def getitem(k):
        if k == "groups":
            return groups_collection
        if k == "users":
            return users_collection
        return MagicMock()

    db = MagicMock()
    db.__getitem__.side_effect = getitem
    return db


@pytest.fixture()
def client(mock_db):
    app.dependency_overrides[get_db] = lambda: mock_db

    def _fake_current_user():
        return {
            "_id": TEST_USER_ID,
            "email": "groupuser@my.unt.edu",
            "username": "groupuser",
        }

    app.dependency_overrides[get_current_user] = _fake_current_user

    yield TestClient(app)

    app.dependency_overrides.clear()


@pytest.fixture()
def client_no_auth(mock_db):
    """Client with only get_db overridden; get_current_user runs for real (no token → 401)."""
    app.dependency_overrides[get_db] = lambda: mock_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def valid_user_doc():
    return {
        "_id": ObjectId(TEST_USER_ID),
        "username": "groupuser",
        "full_name": "Group User",
        "major": "Computer Science",
        "bio": None,
        "skills": [],
        "external_links": {},
        "email": "groupuser@my.unt.edu",
        "created_at": datetime.now(timezone.utc),
    }


@pytest.fixture()
def valid_group_doc():
    creator_oid = ObjectId(TEST_USER_ID)
    return {
        "_id": ObjectId(TEST_GROUP_ID),
        "created_by": creator_oid,
        "member_ids": [creator_oid],
        "created_at": datetime.now(timezone.utc),
        "name": "Study Group 1",
        "description": "A test study group.",
        "course_code": "CSCE3444",
        "max_members": 5,
        "tags": ["python", "project"],
    }


class TestParseGroupId:
    def test_valid_hex_returns_objectid(self):
        """Valid 24-char hex string → returns ObjectId."""
        result = groups_router._parse_group_id(TEST_GROUP_ID)
        assert isinstance(result, ObjectId)
        assert str(result) == TEST_GROUP_ID

    def test_invalid_string_raises_http_400(self):
        """Clearly invalid string → raises HTTPException 400 with correct message."""
        with pytest.raises(HTTPException) as exc_info:
            groups_router._parse_group_id("not-a-valid-object-id")
        assert exc_info.value.status_code == 400
        assert exc_info.value.detail == "Invalid group id format."


class TestGetGroupDocOr404:
    def test_returns_group_doc_when_found(self, mock_db, valid_group_doc):
        """When db['groups'].find_one returns a dict → returns it."""
        oid = ObjectId(TEST_GROUP_ID)
        mock_db["groups"].find_one.return_value = valid_group_doc.copy()
        result = groups_router._get_group_doc_or_404(mock_db, oid)
        assert result == valid_group_doc
        mock_db["groups"].find_one.assert_called_once_with({"_id": oid})

    def test_raises_404_when_not_found(self, mock_db):
        """When find_one returns None → raises 404 with correct detail."""
        oid = ObjectId(TEST_GROUP_ID)
        mock_db["groups"].find_one.return_value = None
        with pytest.raises(HTTPException) as exc_info:
            groups_router._get_group_doc_or_404(mock_db, oid)
        assert exc_info.value.status_code == 404
        assert exc_info.value.detail == "Group not found."


class TestFetchMembersAsUserReads:
    def test_empty_member_ids_returns_empty_and_no_db_call(self, mock_db):
        """Empty list → returns [] and does not query DB."""
        result = groups_router._fetch_members_as_user_reads(mock_db, [])
        assert result == []
        mock_db["users"].find.assert_not_called()

    def test_non_empty_member_ids_calls_db_and_returns_user_reads(
        self, mock_db, valid_user_doc
    ):
        """Non-empty list → calls db['users'].find with correct filter, returns UserRead with _id stringified."""
        member_oid = ObjectId(TEST_USER_ID)
        member_ids = [member_oid]
        user_doc = valid_user_doc.copy()
        mock_db["users"].find.return_value = [user_doc]
        result = groups_router._fetch_members_as_user_reads(mock_db, member_ids)
        mock_db["users"].find.assert_called_once_with({"_id": {"$in": member_ids}})
        assert len(result) == 1
        assert result[0].id == str(member_oid)
        assert result[0].username == user_doc["username"]


class TestRequireGroupOwner:
    def test_current_user_is_owner_returns_group_doc(self, mock_db, valid_group_doc):
        """When current user's _id matches created_by → returns group_doc."""
        mock_db["groups"].find_one.return_value = valid_group_doc.copy()
        current_user = {"_id": TEST_USER_ID}

        result = groups_router._require_group_owner(
            TEST_GROUP_ID, db=mock_db, current_user=current_user
        )

        assert result["_id"] == valid_group_doc["_id"]
        mock_db["groups"].find_one.assert_called_once()

    def test_non_owner_raises_403(self, mock_db, valid_group_doc):
        """When not owner → raises 403 with 'Current user does not match group creator.'"""
        group_doc = valid_group_doc.copy()
        group_doc["created_by"] = ObjectId()  # different owner
        mock_db["groups"].find_one.return_value = group_doc
        current_user = {"_id": TEST_USER_ID}

        with pytest.raises(HTTPException) as exc_info:
            groups_router._require_group_owner(
                TEST_GROUP_ID, db=mock_db, current_user=current_user
            )

        assert exc_info.value.status_code == 403
        assert exc_info.value.detail == "Current user does not match group creator."


# ---------------------------------------------------------------------------
# POST /api/groups/ (create_group)
# ---------------------------------------------------------------------------

# Valid JSON body for creating a group. Matches GroupCreate: name, description, optional course_code, max_members, tags.
VALID_GROUP_CREATE_PAYLOAD = {
    "name": "Study Group Alpha",
    "description": "We study together.",
    "course_code": "CSCE3444",
    "max_members": 5,
    "tags": ["python", "project"],
}


class TestCreateGroup:
    def test_create_group_success(self, client, mock_db, valid_user_doc):
        """Success: 201, response matches GroupRead; insert_one called with creator as only member."""
        mock_db["groups"].insert_one.return_value = MagicMock(
            inserted_id=ObjectId(TEST_GROUP_ID)
        )
        mock_db["users"].find.return_value = [valid_user_doc.copy()]

        resp = client.post("/api/groups/", json=VALID_GROUP_CREATE_PAYLOAD)

        assert resp.status_code == 201
        body = resp.json()
        assert body["_id"] == TEST_GROUP_ID
        assert body["created_by"] == TEST_USER_ID
        assert "name" in body and body["name"] == VALID_GROUP_CREATE_PAYLOAD["name"]
        assert "members" in body and len(body["members"]) == 1
        assert body["members"][0]["username"] == valid_user_doc["username"]

        mock_db["groups"].insert_one.assert_called_once()
        call_args = mock_db["groups"].insert_one.call_args[0][0]
        assert call_args["created_by"] == ObjectId(TEST_USER_ID)
        assert call_args["member_ids"] == [ObjectId(TEST_USER_ID)]
        assert "created_at" in call_args
        assert call_args["name"] == VALID_GROUP_CREATE_PAYLOAD["name"]

    def test_create_group_duplicate_key_returns_400(self, client, mock_db):
        """DuplicateKeyError on insert_one → 400 with 'A group with this name already exists.'"""
        mock_db["groups"].insert_one.side_effect = DuplicateKeyError("dup")

        resp = client.post("/api/groups/", json=VALID_GROUP_CREATE_PAYLOAD)

        assert resp.status_code == 400
        assert "A group with this name already exists." in resp.json()["detail"]

    def test_create_group_generic_db_error_returns_500(self, client, mock_db):
        """HTTPException from insert path → 500 with 'Failed to create group.'"""
        mock_db["groups"].insert_one.side_effect = HTTPException(
            status_code=500, detail="db error"
        )

        resp = client.post("/api/groups/", json=VALID_GROUP_CREATE_PAYLOAD)

        assert resp.status_code == 500
        assert resp.json()["detail"] == "Failed to create group."


# ---------------------------------------------------------------------------
# GET /api/groups/ (list_groups)
# ---------------------------------------------------------------------------


class TestListGroups:
    def test_list_groups_success(
        self, client, mock_db, valid_group_doc, valid_user_doc
    ):
        """Status 200, list of GroupRead; length and members match fake groups."""
        other_group_id = str(ObjectId())
        group1 = valid_group_doc.copy()
        group2 = valid_group_doc.copy()
        group2["_id"] = ObjectId(other_group_id)
        group2["name"] = "Study Group 2"
        mock_db["groups"].find.return_value = [group1, group2]
        mock_db["users"].find.return_value = [valid_user_doc.copy()]

        resp = client.get("/api/groups/")

        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 2
        assert data[0]["_id"] == TEST_GROUP_ID
        assert data[0]["name"] == "Study Group 1"
        assert len(data[0]["members"]) == len(group1["member_ids"])
        assert data[1]["_id"] == other_group_id
        assert data[1]["name"] == "Study Group 2"
        assert len(data[1]["members"]) == len(group2["member_ids"])

    def test_list_groups_unauthenticated_returns_401(self, client_no_auth):
        """No Bearer token → 401 Unauthorized."""
        resp = client_no_auth.get("/api/groups/")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/groups/{group_id} (get_group_by_id)
# ---------------------------------------------------------------------------


class TestGetGroupById:
    def test_get_group_by_id_success(
        self, client, mock_db, valid_group_doc, valid_user_doc
    ):
        """Valid group_id, find_one returns doc → 200 and correct GroupRead fields."""
        mock_db["groups"].find_one.return_value = valid_group_doc.copy()
        mock_db["users"].find.return_value = [valid_user_doc.copy()]

        resp = client.get(f"/api/groups/{TEST_GROUP_ID}")

        assert resp.status_code == 200
        body = resp.json()
        assert body["_id"] == TEST_GROUP_ID
        assert body["name"] == valid_group_doc["name"]
        assert body["created_by"] == TEST_USER_ID
        assert len(body["members"]) == 1
        assert body["members"][0]["username"] == valid_user_doc["username"]

    def test_get_group_by_id_invalid_format_returns_400(self, client):
        """Invalid group_id format → 400 with correct message."""
        resp = client.get("/api/groups/not-an-objectid")

        assert resp.status_code == 400
        assert "Invalid group id format" in resp.json()["detail"]

    def test_get_group_by_id_not_found_returns_404(self, client, mock_db):
        """Valid group_id but find_one returns None → 404."""
        mock_db["groups"].find_one.return_value = None

        resp = client.get(f"/api/groups/{TEST_GROUP_ID}")

        assert resp.status_code == 404
        assert "Group not found" in resp.json()["detail"]

    def test_get_group_by_id_unauthenticated_returns_401(self, client_no_auth):
        """No Bearer token → 401 Unauthorized."""
        resp = client_no_auth.get(f"/api/groups/{TEST_GROUP_ID}")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# PATCH /api/groups/{group_id} (update_group)
# ---------------------------------------------------------------------------


class TestUpdateGroup:
    def test_update_group_success(
        self, client, mock_db, valid_group_doc, valid_user_doc
    ):
        """Owner can update; 200 and updated fields in response."""
        group_doc = valid_group_doc.copy()
        app.dependency_overrides[groups_router._require_group_owner] = (
            lambda group_id=None, db=None, current_user=None: group_doc
        )
        updated_doc = group_doc.copy()
        updated_doc["name"] = "Updated Name"
        updated_doc["description"] = "Updated description."
        mock_db["groups"].find_one.return_value = updated_doc
        mock_db["users"].find.return_value = [valid_user_doc.copy()]

        resp = client.patch(
            f"/api/groups/{TEST_GROUP_ID}",
            json={"name": "Updated Name", "description": "Updated description."},
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["name"] == "Updated Name"
        assert body["description"] == "Updated description."
        mock_db["groups"].update_one.assert_called_once()
        call_args = mock_db["groups"].update_one.call_args[0]
        assert call_args[0] == {"_id": group_doc["_id"]}
        assert "$set" in call_args[1]

    def test_update_group_empty_payload_returns_400(
        self, client, mock_db, valid_group_doc
    ):
        """PATCH with {} → 400 'No fields provided.'"""
        app.dependency_overrides[groups_router._require_group_owner] = (
            lambda group_id=None, db=None, current_user=None: valid_group_doc.copy()
        )

        resp = client.patch(f"/api/groups/{TEST_GROUP_ID}", json={})

        assert resp.status_code == 400
        assert "No fields provided" in resp.json()["detail"]

    def test_update_group_max_members_less_than_current_returns_400(
        self, client, mock_db, valid_group_doc
    ):
        """max_members < len(member_ids) → 400 with correct message."""
        group_doc = valid_group_doc.copy()
        group_doc["member_ids"] = [ObjectId(TEST_USER_ID), ObjectId()]
        app.dependency_overrides[groups_router._require_group_owner] = (
            lambda group_id=None, db=None, current_user=None: group_doc
        )

        resp = client.patch(f"/api/groups/{TEST_GROUP_ID}", json={"max_members": 1})

        assert resp.status_code == 400
        assert (
            "max_members cannot be less than current member count"
            in resp.json()["detail"]
        )

    def test_update_group_not_found_after_update_returns_404(
        self, client, mock_db, valid_group_doc
    ):
        """find_one returns None after update_one → 404."""
        app.dependency_overrides[groups_router._require_group_owner] = (
            lambda group_id=None, db=None, current_user=None: valid_group_doc.copy()
        )
        mock_db["groups"].find_one.return_value = None

        resp = client.patch(f"/api/groups/{TEST_GROUP_ID}", json={"name": "New Name"})

        assert resp.status_code == 404
        assert "Group not found" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# DELETE /api/groups/{group_id} (delete_group)
# ---------------------------------------------------------------------------


class TestDeleteGroup:
    def test_delete_group_success(self, client, mock_db, valid_group_doc):
        """Owner can delete; 200 and delete_one called with correct filter."""
        app.dependency_overrides[groups_router._require_group_owner] = (
            lambda group_id=None, db=None, current_user=None: valid_group_doc.copy()
        )

        resp = client.delete(f"/api/groups/{TEST_GROUP_ID}")

        assert resp.status_code == 200
        assert resp.json() == {"detail": "Group deleted"}
        mock_db["groups"].delete_one.assert_called_once_with(
            {"_id": valid_group_doc["_id"]}
        )


# ---------------------------------------------------------------------------
# POST /api/groups/{group_id}/join (add_member)
# ---------------------------------------------------------------------------


class TestAddMember:
    def test_join_group_success(self, client, mock_db, valid_group_doc, valid_user_doc):
        """User not in group, group not full → 200 and user in members."""
        other_oid = ObjectId()
        group_doc = valid_group_doc.copy()
        group_doc["created_by"] = other_oid
        group_doc["member_ids"] = [other_oid]
        updated_doc = group_doc.copy()
        updated_doc["member_ids"] = [other_oid, ObjectId(TEST_USER_ID)]
        mock_db["groups"].find_one.side_effect = [group_doc, updated_doc]
        mock_db["users"].find.return_value = [valid_user_doc.copy()]

        resp = client.post(f"/api/groups/{TEST_GROUP_ID}/join")

        assert resp.status_code == 200
        body = resp.json()
        assert len(body["members"]) >= 1
        mock_db["groups"].update_one.assert_called_once()
        call_args = mock_db["groups"].update_one.call_args[0]
        assert call_args[0] == {"_id": group_doc["_id"]}
        assert "$addToSet" in call_args[1]

    def test_join_group_already_member_returns_409(
        self, client, mock_db, valid_group_doc
    ):
        """User already in member_ids → 409 'User already in group.'"""
        group_doc = valid_group_doc.copy()
        mock_db["groups"].find_one.return_value = group_doc

        resp = client.post(f"/api/groups/{TEST_GROUP_ID}/join")

        assert resp.status_code == 409
        assert "User already in group" in resp.json()["detail"]

    def test_join_group_full_returns_400(self, client, mock_db, valid_group_doc):
        """len(member_ids) >= max_members → 400 'Group is full.'"""
        group_doc = valid_group_doc.copy()
        group_doc["max_members"] = 2
        group_doc["member_ids"] = [ObjectId(), ObjectId()]
        group_doc["created_by"] = group_doc["member_ids"][0]
        mock_db["groups"].find_one.return_value = group_doc

        resp = client.post(f"/api/groups/{TEST_GROUP_ID}/join")

        assert resp.status_code == 400
        assert "Group is full" in resp.json()["detail"]

    def test_join_group_invalid_id_returns_400(self, client):
        """Invalid group_id format → 400."""
        resp = client.post("/api/groups/not-an-objectid/join")
        assert resp.status_code == 400
        assert "Invalid group id format" in resp.json()["detail"]

    def test_join_group_not_found_returns_404(self, client, mock_db):
        """Valid group_id but find_one returns None → 404."""
        mock_db["groups"].find_one.return_value = None

        resp = client.post(f"/api/groups/{TEST_GROUP_ID}/join")

        assert resp.status_code == 404
        assert "Group not found" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# POST /api/groups/{group_id}/leave (leave_group)
# ---------------------------------------------------------------------------


class TestLeaveGroup:
    def test_leave_group_success(
        self, client, mock_db, valid_group_doc, valid_user_doc
    ):
        """User is member but not owner → 200 and user removed from members."""
        other_user_oid = ObjectId()
        group_doc = valid_group_doc.copy()
        group_doc["created_by"] = other_user_oid
        group_doc["member_ids"] = [other_user_oid, ObjectId(TEST_USER_ID)]
        mock_db["groups"].find_one.return_value = group_doc
        after_leave = group_doc.copy()
        after_leave["member_ids"] = [other_user_oid]
        mock_db["groups"].find_one.side_effect = [group_doc, after_leave]
        mock_db["users"].find.return_value = [valid_user_doc.copy()]

        resp = client.post(f"/api/groups/{TEST_GROUP_ID}/leave")

        assert resp.status_code == 200
        body = resp.json()
        assert len(body["members"]) == 1
        mock_db["groups"].update_one.assert_called_once()
        call_args = mock_db["groups"].update_one.call_args[0]
        assert "$pull" in call_args[1]

    def test_leave_group_owner_cannot_leave_returns_403(
        self, client, mock_db, valid_group_doc
    ):
        """created_by == current user → 403 owner cannot leave."""
        mock_db["groups"].find_one.return_value = valid_group_doc.copy()

        resp = client.post(f"/api/groups/{TEST_GROUP_ID}/leave")

        assert resp.status_code == 403
        assert "Owner cannot leave" in resp.json()["detail"]

    def test_leave_group_not_member_returns_400(self, client, mock_db, valid_group_doc):
        """current_user not in member_ids → 400 'User is not a member of this group.'"""
        group_doc = valid_group_doc.copy()
        group_doc["created_by"] = ObjectId()  # owner is someone else
        group_doc["member_ids"] = [
            group_doc["created_by"]
        ]  # only owner, not current user
        mock_db["groups"].find_one.return_value = group_doc

        resp = client.post(f"/api/groups/{TEST_GROUP_ID}/leave")

        assert resp.status_code == 400
        assert "not a member" in resp.json()["detail"]

    def test_leave_group_invalid_id_returns_400(self, client):
        """Invalid group_id format → 400."""
        resp = client.post("/api/groups/not-an-objectid/leave")
        assert resp.status_code == 400
        assert "Invalid group id format" in resp.json()["detail"]

    def test_leave_group_not_found_returns_404(self, client, mock_db):
        """Valid group_id but find_one returns None → 404."""
        mock_db["groups"].find_one.return_value = None

        resp = client.post(f"/api/groups/{TEST_GROUP_ID}/leave")

        assert resp.status_code == 404
        assert "Group not found" in resp.json()["detail"]
