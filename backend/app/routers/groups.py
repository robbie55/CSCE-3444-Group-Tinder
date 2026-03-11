from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.db.connect import get_db
from app.models.schemas import GroupCreate, GroupRead, UserRead
from app.routers.auth import get_current_user

router = APIRouter()
# can i do this db =Depends(get_db), current_user=Depends(get_current_user)
# then just pass db into the parameters for each function like create_group(db,current_user)


# create group
@router.post("/", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
def create_group(
    group: GroupCreate, db=Depends(get_db), current_user=Depends(get_current_user)
):
    group_dict = group.model_dump()  # convert to dictonary

    creator_oid = ObjectId(current_user["_id"])

    group_dict["created_by"] = creator_oid  # current users id
    group_dict["created_at"] = datetime.now(timezone.utc)
    group_dict["member_ids"] = [creator_oid]  # insert creator as first memeber of group

    # inserting to MongoDb
    try:
        result = db["groups"].insert_one(group_dict)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A group with this name already exists.",
        )
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create group.",
        )

    group_dict["_id"] = result.inserted_id  # id for the group
    group_dict["_id"] = str(group_dict["_id"])

    # making members list
    members: list[UserRead] = []
    for member_oid in group_dict["member_ids"]:
        user_doc = db["users"].find_one({"_id": member_oid})
        if not user_doc:
            raise HTTPException(
                status_code=500, detail="Group creator not found in database."
            )
        user_doc["_id"] = str(user_doc["_id"])
        members.append(UserRead(**user_doc))

    # what api returns
    return GroupRead(
        _id=group_dict["_id"],
        created_by=current_user["_id"],
        members=members,
        created_at=group_dict["created_at"],
        name=group_dict["name"],
        description=group_dict["description"],
        course_code=group_dict.get("course_code"),
        max_members=group_dict["max_members"],
        tags=group_dict.get("tags", []),
    )


# List all groups
@router.get(
    "/",
    response_model=list[GroupRead],
)  # not sure if its groupread or groupcreate since i think i need the Pyobjectid, double check this
def list_groups(db=Depends(get_db), current_user=Depends(get_current_user)):
    pass


# todo: For each group doc:
# Convert _id to str.
# Load all user docs for member_ids from db["users"].
# Transform them into UserRead models.
# Build a GroupRead object.
# Return the list.


# single group by id
@router.get("/{group_id}", response_model=GroupRead)
def get_group_by_id(
    group_id: str, db=Depends(get_db), current_user=Depends(get_current_user)
):
    pass


# Todo: Parse group_id into an ObjectId.
# If parsing fails, return 400 Bad Request (same as users router).
# Find the group with db["groups"].find_one({"_id": oid}).
# If not found, return 404 Not Found.
# Convert _id to str.
# Fetch member user docs from db["users"] using the stored member_ids.
# Build UserRead models for each member.
# Return a GroupRead populated with these values.


# update group details
# @router.patch("/{group_id}", response_model=GroupUpdate)
def update_group(
    group_id: str,
):
    pass


# delete group
@router.delete("/{group_id}")
def delete_group():
    pass


# add member to group

# remove/delete memebr from group

# get group by id? this might have to go at the bottom
