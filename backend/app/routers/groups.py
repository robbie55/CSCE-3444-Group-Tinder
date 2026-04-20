from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.db.connect import get_db
from app.models.schemas import GroupCreate, GroupRead, GroupUpdate, UserRead
from app.routers.auth import get_current_user
from app.routers.match import get_connection_ids

router = APIRouter()


def _resolve_invite_oids(
    invite_user_ids_raw: list[str],
    inviter_oid: ObjectId,
) -> list[ObjectId]:
    """Parse invite ids to ObjectIds; dedupe; reject invalid and self-invites."""
    invite_oids: list[ObjectId] = []
    seen: set[ObjectId] = {inviter_oid}
    for raw in invite_user_ids_raw:
        try:
            oid = ObjectId(raw)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid user id in invites: {raw}",
            )
        if oid == inviter_oid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot invite yourself.",
            )
        if oid in seen:
            continue
        seen.add(oid)
        invite_oids.append(oid)
    return invite_oids


def _require_connected(inviter_oid: ObjectId, target_oids: list[ObjectId], db) -> None:
    """Raise 403 if any target is not an accepted-match connection of inviter."""
    if not target_oids:
        return
    connection_ids = get_connection_ids(inviter_oid, db)
    if any(oid not in connection_ids for oid in target_oids):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only invite users you're connected with.",
        )


def _require_users_exist(target_oids: list[ObjectId], db) -> None:
    """Raise 404 if any target user document is missing."""
    if not target_oids:
        return
    found = db["users"].find({"_id": {"$in": target_oids}}, {"_id": 1})
    found_ids = {u["_id"] for u in found}
    if any(oid not in found_ids for oid in target_oids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more invited users not found.",
        )


# Helpers:
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


def _parse_group_id(group_id: str):
    try:
        return ObjectId(group_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid group id format.",
        )


def _get_group_doc_or_404(db, oid: ObjectId) -> dict:
    group_doc = db["groups"].find_one({"_id": oid})
    if not group_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found.",
        )
    return group_doc


def _fetch_members_as_user_reads(db, member_ids: list) -> list[UserRead]:
    if not member_ids:
        return []
    user_filter = {"_id": {"$in": member_ids}}
    members = []
    for user_doc in db["users"].find(user_filter):
        user_doc["_id"] = str(user_doc["_id"])
        members.append(UserRead(**user_doc))
    return members


def _require_group_owner(
    group_id: str,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
) -> dict:

    oid = _parse_group_id(group_id)
    group_doc = _get_group_doc_or_404(db, oid)
    owner_oid = group_doc["created_by"]
    current_user_oid = ObjectId(current_user["_id"])
    if owner_oid != current_user_oid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Current user does not match group creator.",
        )
    return group_doc


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
    invite_user_ids_raw = group_dict.pop("invite_user_ids", [])

    creator_oid = ObjectId(current_user["_id"])

    invite_oids = _resolve_invite_oids(invite_user_ids_raw, creator_oid)

    if invite_oids:
        max_members = group_dict.get("max_members", 5)
        if 1 + len(invite_oids) > max_members:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many invites for group size.",
            )
        _require_connected(creator_oid, invite_oids, db)
        _require_users_exist(invite_oids, db)

    group_dict["created_by"] = creator_oid  # current users id
    group_dict["created_at"] = datetime.now(timezone.utc)
    group_dict["member_ids"] = [creator_oid, *invite_oids]

    # inserting to MongoDb
    try:
        result = db["groups"].insert_one(group_dict)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A group with this name already exists.",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create group.",
        )

    group_dict["_id"] = result.inserted_id  # id for the group
    group_dict["_id"] = str(group_dict["_id"])

    members = _fetch_members_as_user_reads(db, group_dict["member_ids"])
    group_read = _group_doc_to_group_read(group_doc=group_dict, members=members)
    return group_read


# List all groups
@router.get("/", response_model=list[GroupRead])
def list_groups(db=Depends(get_db), current_user=Depends(get_current_user)):
    list_of_groups = []
    groups_cursor = db["groups"].find({})

    for group_doc in groups_cursor:
        members = _fetch_members_as_user_reads(db, group_doc.get("member_ids", []))
        group_read = _group_doc_to_group_read(group_doc=group_doc, members=members)
        list_of_groups.append(group_read)

    return list_of_groups


# single group by id
@router.get("/{group_id}", response_model=GroupRead)
def get_group_by_id(
    group_id: str, db=Depends(get_db), current_user=Depends(get_current_user)
):
    oid = _parse_group_id(group_id)
    group_doc = _get_group_doc_or_404(db, oid)
    members = _fetch_members_as_user_reads(db, group_doc.get("member_ids", []))
    return _group_doc_to_group_read(group_doc=group_doc, members=members)


# update group details
@router.patch("/{group_id}", response_model=GroupRead)
def update_group(
    group_update: GroupUpdate,
    db=Depends(get_db),
    group_doc=Depends(_require_group_owner),
):
    oid = group_doc["_id"]
    update_data = group_update.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No fields provided."
        )

    if "max_members" in update_data:
        current_member_count = len(group_doc.get("member_ids", []))
        if update_data["max_members"] < current_member_count:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="max_members cannot be less than current member count.",
            )

    db["groups"].update_one({"_id": oid}, {"$set": update_data})
    updated_group_doc = db["groups"].find_one({"_id": oid})
    if not updated_group_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Group not found."
        )

    members = _fetch_members_as_user_reads(db, updated_group_doc.get("member_ids", []))
    return _group_doc_to_group_read(group_doc=updated_group_doc, members=members)


# delete group
@router.delete("/{group_id}", status_code=status.HTTP_200_OK)
def delete_group(
    db=Depends(get_db),
    group_doc=Depends(_require_group_owner),
):
    db["groups"].delete_one({"_id": group_doc["_id"]})
    return {"detail": "Group deleted"}


# add member to group
@router.post("/{group_id}/join", response_model=GroupRead)
def add_member(
    group_id: str, db=Depends(get_db), current_user=Depends(get_current_user)
):
    oid = _parse_group_id(group_id)
    group_doc = _get_group_doc_or_404(db, oid)
    current_user_oid = ObjectId(current_user["_id"])
    member_ids = group_doc.get("member_ids", [])

    if current_user_oid in member_ids:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already in group.",
        )

    # checking length of group
    group_max_members = group_doc["max_members"]
    if len(member_ids) >= group_max_members:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group is full.",
        )

    db["groups"].update_one(
        {"_id": oid},
        {"$addToSet": {"member_ids": current_user_oid}},
    )
    updated_group_doc = db["groups"].find_one({"_id": oid})
    if not updated_group_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found.",
        )
    members = _fetch_members_as_user_reads(db, updated_group_doc.get("member_ids", []))
    return _group_doc_to_group_read(group_doc=updated_group_doc, members=members)


@router.post("/{group_id}/leave", response_model=GroupRead)
def leave_group(
    group_id: str, db=Depends(get_db), current_user=Depends(get_current_user)
):
    oid = _parse_group_id(group_id)
    group_doc = _get_group_doc_or_404(db, oid)
    current_user_oid = ObjectId(current_user["_id"])
    member_ids = group_doc.get("member_ids", [])

    if group_doc["created_by"] == current_user_oid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner cannot leave the group. Delete the group or transfer ownership first.",
        )

    if current_user_oid not in member_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a member of this group.",
        )

    db["groups"].update_one(
        {"_id": oid},
        {"$pull": {"member_ids": current_user_oid}},
    )

    updated_group_doc = db["groups"].find_one({"_id": oid})

    if not updated_group_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found.",
        )
    members = _fetch_members_as_user_reads(db, updated_group_doc.get("member_ids", []))
    return _group_doc_to_group_read(group_doc=updated_group_doc, members=members)


# owner adds a connection directly to the group
@router.post("/{group_id}/members/{user_id}", response_model=GroupRead)
def add_member_as_owner(
    user_id: str,
    db=Depends(get_db),
    group_doc=Depends(_require_group_owner),
):
    oid = group_doc["_id"]
    owner_oid = group_doc["created_by"]

    try:
        user_oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user id format.",
        )

    if user_oid == owner_oid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot invite yourself.",
        )

    member_ids = group_doc.get("member_ids", [])
    if user_oid in member_ids:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already in group.",
        )

    if len(member_ids) >= group_doc["max_members"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group is full.",
        )

    _require_connected(owner_oid, [user_oid], db)
    _require_users_exist([user_oid], db)

    db["groups"].update_one(
        {"_id": oid},
        {"$addToSet": {"member_ids": user_oid}},
    )
    updated_group_doc = db["groups"].find_one({"_id": oid})
    if not updated_group_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found.",
        )
    members = _fetch_members_as_user_reads(db, updated_group_doc.get("member_ids", []))
    return _group_doc_to_group_read(group_doc=updated_group_doc, members=members)
