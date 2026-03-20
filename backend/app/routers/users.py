from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.matching import get_suggestions
from app.db.connect import get_db
from app.models.schemas import SuggestionRead, UserRead, UserUpdate
from app.routers.auth import get_current_user

router = APIRouter()
# all routes are protected, meaning only those who have an account aka have access token
# are able to use any of the following api calls. Outsiders are not able to hit endpoint and see
# student sensitive data


# list all users, returns list of all users
@router.get("/", response_model=list[UserRead])
def list_users(db=Depends(get_db), current_user=Depends(get_current_user)):
    # db is the Mongo Database object
    allUsers = db["users"].find({})
    users = []
    for user_doc in allUsers:
        user_doc["_id"] = str(user_doc["_id"])
        users.append(UserRead(**user_doc))
    return users


# current user
@router.get("/me", response_model=UserRead)
def get_me(current_user=Depends(get_current_user)):
    return UserRead(**current_user)


# update current user
@router.patch("/me", response_model=UserRead)
def update_me(
    user_update: UserUpdate, current_user=Depends(get_current_user), db=Depends(get_db)
):
    update_data = user_update.model_dump(exclude_unset=True, mode="json")
    if not update_data:
        return UserRead(**current_user)

    # sanitize skills field
    if "skills" in update_data and update_data["skills"] is None:
        update_data["skills"] = []

    db["users"].update_one(
        {"_id": ObjectId(current_user["_id"])}, {"$set": update_data}
    )

    updated = db["users"].find_one({"_id": ObjectId(current_user["_id"])})
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    updated["_id"] = str(updated["_id"])
    return UserRead(**updated)


# delete current user
# frontend will have to clear token and redirect to login/register page
@router.delete("/me", status_code=status.HTTP_200_OK)
def delete_me(current_user=Depends(get_current_user), db=Depends(get_db)):
    db["users"].delete_one({"_id": ObjectId(current_user["_id"])})
    return {"detail": "User deleted"}


# suggest compatible users based on skills + major
@router.get("/users/suggestions", response_model=list[SuggestionRead])
def suggest_users(
    limit: int = 10,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    candidates = []
    for doc in db["users"].find({"_id": {"$ne": ObjectId(current_user["_id"])}}):
        doc["_id"] = str(doc["_id"])
        candidates.append(doc)

    ranked = get_suggestions(current_user, candidates, limit=limit)
    return [SuggestionRead(**user, match_score=score) for user, score in ranked]


# get one user by id , returns UserRead model
@router.get("/{user_id}", response_model=UserRead)
def get_user_by_id(
    user_id: str, db=Depends(get_db), current_user=Depends(get_current_user)
):
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user id format.",
        )

    user_doc = db["users"].find_one({"_id": oid})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    user_doc["_id"] = str(user_doc["_id"])
    return UserRead(**user_doc)
