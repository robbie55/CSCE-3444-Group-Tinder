from fastapi import APIRouter

router = APIRouter()


@router.post("/login")
def get_user_auth():
    """Should validate credentials, or throw an unaothorized exception"""
    return {"Hello": "From auth"}
