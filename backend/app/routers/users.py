from fastapi import APIRouter

router = APIRouter()


@router.get("/users")
def list_users():
    """Return a simple list of fake users."""
    return [
        {"id": 1, "name": "John"},
        {"id": 2, "name": "Bob"},
    ]
