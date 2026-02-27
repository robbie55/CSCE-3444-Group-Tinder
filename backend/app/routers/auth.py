import os
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel
from pymongo.errors import DuplicateKeyError

from app.db.connect import get_db
from app.models.schemas import UserCreate, UserRead

router = APIRouter()

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def _get_jwt_secret() -> str:
    return os.getenv("JWT_SECRET", "dev-fallback-secret")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class SignUpResponse(TokenResponse):
    user: UserRead


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(to_encode, _get_jwt_secret(), algorithm=JWT_ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        email: str | None = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db["users"].find_one({"email": email})
    if user is None:
        raise credentials_exception
    user["_id"] = str(user["_id"])
    return user


def hash_password(raw_pass: str) -> str:
    pwd_bytes = raw_pass.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed_pwd = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_pwd.decode("utf-8")


def verify_password(raw_pass: str, hashed_pass: str) -> bool:
    return bcrypt.checkpw(raw_pass.encode("utf-8"), hashed_pass.encode("utf-8"))


@router.post("/sign-up", response_model=SignUpResponse)
def sign_up(user: UserCreate, db=Depends(get_db)):
    new_user = user.model_dump()
    new_user["password"] = hash_password(new_user["password"])
    new_user["created_at"] = datetime.now(timezone.utc)

    try:
        result = db["users"].insert_one(new_user)
        new_user["_id"] = str(result.inserted_id)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email or username already exists.",
        )

    access_token = create_access_token({"sub": new_user["email"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserRead(**new_user).model_dump(),
    }


@router.post("/login", response_model=TokenResponse)
def login(credentials: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    username, password = credentials.username, credentials.password
    user_db = db["users"].find_one({"email": username})

    if not user_db or not verify_password(password, user_db["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token({"sub": user_db["email"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }
