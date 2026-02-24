from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pymongo.errors import DuplicateKeyError, PyMongoError

from app.db.connect import get_db
from app.models.schemas import UserCreate, UserRead

router = APIRouter()


@router.post("/sign-up", response_model=UserRead)
def sign_up(user: UserCreate, db=Depends(get_db)):
    """
    Test endpoint for User Registration.
    Expects a JSON body matching the UserCreate schema.
    """

    new_user = user.model_dump()
    # new_user["password"] = hash_password_function(new_user["password"])
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
    except PyMongoError as e:
        # Catches general database connection/insertion issues
        print(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while communicating with the database.",
        )

    return new_user


@router.post("/login")
def login(credentials: OAuth2PasswordRequestForm = Depends()):
    """
    Test endpoint for User Login.
    Expects Form Data (x-www-form-urlencoded), NOT JSON!
    """
    # TODO: Add MongoDB reading/hashing validation here later

    # For testing, we echo back what Postman sent to prove the connection works.
    # We also return a mock JWT token format.
    return {
        "message": "Login successful!",
        "received_username_or_email": credentials.username,
        "received_password": credentials.password,  # DANGER: Only echoing for testing
        "access_token": "mock_jwt_token_12345",
        "token_type": "bearer",
    }
