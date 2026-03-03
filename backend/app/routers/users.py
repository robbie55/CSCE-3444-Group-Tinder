from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.db.connect import get_db
from app.models.schemas import UserRead, UserUpdate
from app.routers.auth import get_current_user

router = APIRouter()


# list all users, returns list of all users
@router.get("/users", response_model=list[UserRead])
def list_users(db=Depends(get_db)):
    # db is the Mongo Database object
    allUsers = db["users"].find({})
    users = []
    for user_doc in allUsers:
        user_doc["_id"] = str(user_doc["_id"])
        users.append(UserRead(**user_doc))
    return users


# current user , uses authentication
@router.get("/users/me", response_model=UserRead)
def get_me(current_user=Depends(get_current_user)):
    return UserRead(**current_user)


# update current user, uses authentication
@router.patch("/users/me", response_model=UserRead)
def update_me(
    user_update: UserUpdate, current_user=Depends(get_current_user), db=Depends(get_db)
):
    update_data = user_update.model_dump(exclude_unset=True)
    if not update_data:
        return UserRead(**current_user)

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


# delete current user , uses authentication
# frontend will have to clear token and redirect to login/register page
@router.delete("/users/me", status_code=status.HTTP_200_OK)
def delete_me(current_user=Depends(get_current_user), db=Depends(get_db)):
    db["users"].delete_one({"_id": ObjectId(current_user["_id"])})
    return {"detail": "User deleted"}


# get one user by id , returns UserRead model
@router.get("/users/{user_id}", response_model=UserRead)
def get_user_by_id(user_id: str, db=Depends(get_db)):
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
