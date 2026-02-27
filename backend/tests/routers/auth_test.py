from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient
from pymongo.errors import DuplicateKeyError

from app.app import app
from app.db.connect import get_db
from app.routers.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

FAKE_OBJ_ID = str(ObjectId())


@pytest.fixture()
def valid_user_doc():
    return {
        "_id": ObjectId(FAKE_OBJ_ID),
        "username": "testuser",
        "full_name": "Test User",
        "major": "Computer Science",
        "bio": None,
        "skills": [],
        "external_links": {},
        "email": "test@my.unt.edu",
        "password": hash_password("Secret123!"),
        "created_at": datetime.now(timezone.utc),
    }


VALID_SIGNUP_PAYLOAD = {
    "username": "testuser",
    "full_name": "Test User",
    "major": "Computer Science",
    "email": "test@my.unt.edu",
    "password": "Secret123!",
}


@pytest.fixture()
def mock_db():
    """Return a mock database whose collections are also mocks."""
    db = MagicMock()
    return db


@pytest.fixture()
def client(mock_db):
    """TestClient with get_db overridden to use mock_db."""
    app.dependency_overrides[get_db] = lambda: mock_db
    yield TestClient(app)
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Unit helpers: hash_password / verify_password
# ---------------------------------------------------------------------------


class TestPasswordHelpers:
    def test_hash_password_returns_string(self):
        hashed = hash_password("password")
        assert isinstance(hashed, str)

    def test_hash_password_not_plaintext(self):
        hashed = hash_password("password")
        assert hashed != "password"

    def test_verify_password_correct(self):
        hashed = hash_password("password")
        assert verify_password("password", hashed) is True

    def test_verify_password_incorrect(self):
        hashed = hash_password("password")
        assert verify_password("wrong", hashed) is False


# ---------------------------------------------------------------------------
# Unit helper: create_access_token
# ---------------------------------------------------------------------------


class TestCreateAccessToken:
    def test_returns_string(self):
        token = create_access_token({"sub": "test@my.unt.edu"})
        assert isinstance(token, str)

    def test_token_contains_three_segments(self):
        token = create_access_token({"sub": "test@my.unt.edu"})
        assert len(token.split(".")) == 3

    @patch("app.routers.auth._get_jwt_secret", return_value="test-secret")
    def test_token_decodes_with_correct_sub(self, _mock_secret):
        from jose import jwt

        token = create_access_token({"sub": "test@my.unt.edu"})
        payload = jwt.decode(token, "test-secret", algorithms=["HS256"])
        assert payload["sub"] == "test@my.unt.edu"
        assert "exp" in payload


# ---------------------------------------------------------------------------
# POST /auth/sign-up
# ---------------------------------------------------------------------------


class TestSignUp:
    def test_sign_up_success(self, client, mock_db):
        mock_db["users"].insert_one.return_value = MagicMock(
            inserted_id=ObjectId(FAKE_OBJ_ID)
        )

        resp = client.post("/api/auth/sign-up", json=VALID_SIGNUP_PAYLOAD)

        assert resp.status_code == 200
        body = resp.json()
        assert body["token_type"] == "bearer"
        assert "access_token" in body
        assert body["user"]["username"] == "testuser"
        assert body["user"]["full_name"] == "Test User"
        mock_db["users"].insert_one.assert_called_once()

    def test_sign_up_duplicate_email(self, client, mock_db):
        mock_db["users"].insert_one.side_effect = DuplicateKeyError("dup")

        resp = client.post("/api/auth/sign-up", json=VALID_SIGNUP_PAYLOAD)

        assert resp.status_code == 400
        assert "already exists" in resp.json()["detail"]

    def test_sign_up_missing_fields(self, client):
        resp = client.post("/api/auth/sign-up", json={"username": "incomplete"})
        assert resp.status_code == 422

    def test_sign_up_hashes_password(self, client, mock_db):
        mock_db["users"].insert_one.return_value = MagicMock(
            inserted_id=ObjectId(FAKE_OBJ_ID)
        )

        client.post("/api/auth/sign-up", json=VALID_SIGNUP_PAYLOAD)

        saved_doc = mock_db["users"].insert_one.call_args[0][0]
        assert saved_doc["password"] != "Secret123!"
        assert verify_password("Secret123!", saved_doc["password"])


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------


class TestLogin:
    def test_login_success(self, client, mock_db, valid_user_doc):
        mock_db["users"].find_one.return_value = valid_user_doc.copy()

        resp = client.post(
            "/api/auth/login",
            data={"username": "test@my.unt.edu", "password": "Secret123!"},
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["token_type"] == "bearer"
        assert "access_token" in body

    def test_login_wrong_password(self, client, mock_db, valid_user_doc):
        mock_db["users"].find_one.return_value = valid_user_doc.copy()

        resp = client.post(
            "/api/auth/login",
            data={"username": "test@my.unt.edu", "password": "WrongPass!"},
        )

        assert resp.status_code == 401
        assert "Incorrect email or password" in resp.json()["detail"]

    def test_login_user_not_found(self, client, mock_db):
        mock_db["users"].find_one.return_value = None

        resp = client.post(
            "/api/auth/login",
            data={"username": "noone@my.unt.edu", "password": "whatever"},
        )

        assert resp.status_code == 401

    def test_login_missing_fields(self, client):
        resp = client.post("/api/auth/login", data={})
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# get_current_user dependency
# ---------------------------------------------------------------------------


class TestGetCurrentUser:
    def _make_token(self, sub="test@my.unt.edu"):
        return create_access_token({"sub": sub})

    def test_valid_token_returns_user(self, mock_db, valid_user_doc):
        user_doc = valid_user_doc.copy()
        mock_db["users"].find_one.return_value = user_doc

        token = self._make_token()
        user = get_current_user(token=token, db=mock_db)

        assert user["email"] == "test@my.unt.edu"
        assert isinstance(user["_id"], str)

    def test_invalid_token_raises_401(self, mock_db):
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(token="garbage.token.here", db=mock_db)
        assert exc_info.value.status_code == 401

    def test_expired_token_raises_401(self, mock_db):
        from fastapi import HTTPException
        from jose import jwt

        expired_payload = {
            "sub": "test@my.unt.edu",
            "exp": datetime(2020, 1, 1, tzinfo=timezone.utc),
        }
        token = jwt.encode(expired_payload, "dev-fallback-secret", algorithm="HS256")

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(token=token, db=mock_db)
        assert exc_info.value.status_code == 401

    def test_token_missing_sub_raises_401(self, mock_db):
        from fastapi import HTTPException
        from jose import jwt

        payload = {"data": "no-sub", "exp": 9999999999}
        token = jwt.encode(payload, "dev-fallback-secret", algorithm="HS256")

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(token=token, db=mock_db)
        assert exc_info.value.status_code == 401

    def test_user_not_in_db_raises_401(self, mock_db):
        from fastapi import HTTPException

        mock_db["users"].find_one.return_value = None
        token = self._make_token()

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(token=token, db=mock_db)
        assert exc_info.value.status_code == 401
