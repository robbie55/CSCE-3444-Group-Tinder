from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.db.connect import get_db
from app.models.schemas import GroupCreate, GroupRead, UserRead
from app.routers.auth import get_current_user

router = APIRouter()


# Helper: turn MongoDB group doc to GroupRead object
def _group_doc_to_group_read(group_doc: dict, members: list[UserRead]) -> GroupRead:
    return GroupRead(
        _id=str(group_doc["_id"]),
        created_by=str(group_doc["created_by"]),
        members=members,
        created_at=group_doc["created_at"],
        name=group_doc["name"],
        description=group_doc["description"],
        course_code=group_doc.get("course_code"),
        max_members=group_doc["max_members"],
        tags=group_doc.get("tags", []),
    )


# create group
@router.post("/", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
def create_group(
    group: GroupCreate,
    db=Depends(get_db),
    current_user=Depends(
        get_current_user
    ),  # GroupCreate is the pydantic model that request from the frontend uses
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
    group_read = _group_doc_to_group_read(group_doc=group_dict, members=members)
    return group_read


# List all groups
@router.get(
    "/",
    response_model=list[GroupRead],
)
def list_groups(db=Depends(get_db), current_user=Depends(get_current_user)):
    list_of_groups = []
    groups_cursor = db["groups"].find({})

    for group_doc in groups_cursor:
        member_ids = group_doc.get("member_ids", [])  # list of member ids
        user_filter = {
            "_id": {"$in": member_ids}
        }  # Find all documents where _id is one of the values in member_ids

        members = []
        user_cursor = db["users"].find(user_filter)
        for user_doc in user_cursor:
            user_doc["_id"] = str(user_doc["_id"])
            members.append(UserRead(**user_doc))

        group_read = _group_doc_to_group_read(group_doc=group_doc, members=members)
        list_of_groups.append(group_read)

    return list_of_groups


# single group by id
@router.get("/{group_id}", response_model=GroupRead)
def get_group_by_id(
    group_id: str, db=Depends(get_db), current_user=Depends(get_current_user)
):
    try:
        oid = ObjectId(group_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid group id format."
        )

    group_doc = db["groups"].find_one({"_id": oid})
    if not group_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found.",
        )
    group_doc["_id"] = str(group_doc["_id"])
    member_ids = group_doc.get("member_ids", [])
    user_filter = {"_id": {"$in": member_ids}}
    user_cursor = db["users"].find(user_filter)
    members: list[UserRead] = []

    for user_doc in user_cursor:
        user_cursor["_id"] = str(user_cursor["_id"])
        members.append(UserRead(**user_doc))

    group_read = _group_doc_to_group_read(group_doc=group_doc, members=members)
    return group_read


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
