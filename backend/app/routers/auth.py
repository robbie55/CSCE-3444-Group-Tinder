from datetime import datetime, timezone

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pymongo.errors import DuplicateKeyError

from app.db.connect import get_db
from app.models.schemas import UserCreate, UserRead

router = APIRouter()


def hash(raw_pass: str):
    """
    Helper to hash a raw password
    """
    pwd_bytes = raw_pass.encode("utf-8")
    salt = bcrypt.gensalt()

    hashed_pwd = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_pwd.decode("utf-8")


def validateHash(raw_pass: str, hashed_pass: str):
    """
    Helper to validate a raw password with a stored hash pass
    """
    return bcrypt.checkpw(raw_pass.encode("utf-8"), hashed_pass.encode("utf-8"))


@router.post("/sign-up", response_model=UserRead)
def sign_up(user: UserCreate, db=Depends(get_db)):
    """
    Test endpoint for User Registration.
    Expects a JSON body matching the UserCreate schema.
    """

    new_user = user.model_dump()
    new_user["password"] = hash(new_user["password"])
    new_user["created_at"] = datetime.now(timezone.utc)

    try:
        # Attempt to insert the new user into the database
        result = db["users"].insert_one(new_user)
        new_user["_id"] = str(result.inserted_id)

    except DuplicateKeyError:
        # Catches if the email/username already exists in MongoDB
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email or username already exists.",
        )

    return new_user


@router.post("/login")
def login(credentials: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    """
    Test endpoint for User Login.
    Expects Form Data (x-www-form-urlencoded), NOT JSON!
    """
    # TODO: Add MongoDB reading/hashing validation here later
    username, password = credentials.username, credentials.password
    user_db = None
    try:
        user_db = db["users"].find_one({"email": username})
    except Exception as e:
        print("An error occured logging in: \n", e)

    if not user_db or not validateHash(password, user_db["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # return a mock jwt token for now
    return {
        "message": "Login successful!",
        "access_token": "mock_jwt_token_12345",
        "token_type": "bearer",
    }
