from datetime import datetime
from typing import Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.db.connect import get_db
from app.models.enums import MatchRequestStatus
from app.models.schemas import (
    MatchRequestRead,
    MatchRequestUpdate,
    MatchRequestWithUser,
    UserRead,
)
from app.routers.auth import get_current_user

router = APIRouter()


def _serialize_match_request_doc(req: dict) -> dict:
    req["_id"] = str(req["_id"])
    req["sender_id"] = str(req["sender_id"])
    req["receiver_id"] = str(req["receiver_id"])
    return req


def _get_pending_request_for_receiver(
    request_id: str,
    current_user: dict,
    db,
    action: str,
):
    try:
        request_oid = ObjectId(request_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request id format.",
        )

    match_request = db["match_requests"].find_one({"_id": request_oid})
    if not match_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match request not found.",
        )

    receiver_oid = ObjectId(current_user["_id"])
    if match_request["receiver_id"] != receiver_oid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You can only {action} requests sent to you.",
        )

    if match_request["status"] != MatchRequestStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This request has already been processed.",
        )

    return request_oid, receiver_oid


def _get_requests_for_user(
    current_user: dict,
    db,
    direction: Literal["incoming", "outgoing"],
) -> list[MatchRequestWithUser]:
    current_user_oid = ObjectId(current_user["_id"])
    is_incoming = direction == "incoming"

    filter_field = "receiver_id" if is_incoming else "sender_id"
    counterpart_field = "sender_id" if is_incoming else "receiver_id"
    counterpart_payload_key = "sender" if is_incoming else "receiver"

    request_cursor = db["match_requests"].find(
        {
            filter_field: current_user_oid,
            "status": MatchRequestStatus.PENDING.value,
        }
    )

    requests_list = []
    for req in request_cursor:
        req = _serialize_match_request_doc(req)
        counterpart_id = req[counterpart_field]

        counterpart_user = db["users"].find_one({"_id": ObjectId(counterpart_id)})
        counterpart_user_obj = None
        if counterpart_user:
            counterpart_user["_id"] = str(counterpart_user["_id"])
            counterpart_user_obj = UserRead(**counterpart_user)

        payload = {
            **req,
            counterpart_payload_key: counterpart_user_obj,
        }
        requests_list.append(MatchRequestWithUser(**payload))

    return requests_list


# Send a match request to another user
@router.post("/match/request/{receiver_id}", response_model=MatchRequestRead)
def send_match_request(
    receiver_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    # Validate receiver_id format
    try:
        receiver_oid = ObjectId(receiver_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid receiver id format.",
        )

    # Check if receiver exists
    receiver = db["users"].find_one({"_id": receiver_oid})
    if not receiver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receiver user not found.",
        )

    # Check if user is trying to connect with themselves
    if ObjectId(current_user["_id"]) == receiver_oid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send match request to yourself.",
        )

    # Check if a request already exists
    existing_request = db["match_requests"].find_one(
        {
            "$or": [
                {
                    "sender_id": ObjectId(current_user["_id"]),
                    "receiver_id": receiver_oid,
                    "status": MatchRequestStatus.PENDING.value,
                },
                {
                    "sender_id": receiver_oid,
                    "receiver_id": ObjectId(current_user["_id"]),
                    "status": MatchRequestStatus.PENDING.value,
                },
            ]
        }
    )

    if existing_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Match request already exists.",
        )

    # Create the match request
    match_request = {
        "sender_id": ObjectId(current_user["_id"]),
        "receiver_id": receiver_oid,
        "status": MatchRequestStatus.PENDING.value,
        "created_at": datetime.utcnow(),
        "updated_at": None,
    }

    result = db["match_requests"].insert_one(match_request)
    match_request["_id"] = result.inserted_id
    match_request = _serialize_match_request_doc(match_request)

    return MatchRequestRead(**match_request)


# Get incoming match requests for current user
@router.get("/match/requests/incoming", response_model=list[MatchRequestWithUser])
def get_incoming_requests(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    return _get_requests_for_user(
        current_user=current_user, db=db, direction="incoming"
    )


# Get outgoing match requests from current user
@router.get("/match/requests/outgoing", response_model=list[MatchRequestWithUser])
def get_outgoing_requests(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    return _get_requests_for_user(
        current_user=current_user, db=db, direction="outgoing"
    )


# Update a match request (accept/reject)
@router.patch("/match/requests/{request_id}", response_model=MatchRequestRead)
def update_match_request(
    request_id: str,
    request_update: MatchRequestUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if request_update.status not in {
        MatchRequestStatus.ACCEPTED,
        MatchRequestStatus.REJECTED,
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be accepted or rejected.",
        )

    action = (
        "accept" if request_update.status == MatchRequestStatus.ACCEPTED else "reject"
    )

    request_oid, receiver_oid = _get_pending_request_for_receiver(
        request_id=request_id,
        current_user=current_user,
        db=db,
        action=action,
    )

    update_result = db["match_requests"].update_one(
        {
            "_id": request_oid,
            "receiver_id": receiver_oid,
            "status": MatchRequestStatus.PENDING.value,
        },
        {
            "$set": {
                "status": request_update.status.value,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    if update_result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This request has already been processed.",
        )

    updated_request = db["match_requests"].find_one({"_id": request_oid})
    updated_request = _serialize_match_request_doc(updated_request)

    return MatchRequestRead(**updated_request)


# Get all accepted connections (mutual matches)
@router.get("/match/connections", response_model=list[UserRead])
def get_connections(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    # Find all accepted requests where current user is either sender or receiver
    accepted_requests = db["match_requests"].find(
        {
            "$or": [
                {
                    "sender_id": ObjectId(current_user["_id"]),
                    "status": MatchRequestStatus.ACCEPTED.value,
                },
                {
                    "receiver_id": ObjectId(current_user["_id"]),
                    "status": MatchRequestStatus.ACCEPTED.value,
                },
            ]
        }
    )

    connections = []
    for req in accepted_requests:
        # Get the other user (not current user)
        other_user_id = (
            req["receiver_id"]
            if req["sender_id"] == ObjectId(current_user["_id"])
            else req["sender_id"]
        )

        user = db["users"].find_one({"_id": other_user_id})
        if user:
            user["_id"] = str(user["_id"])
            connections.append(UserRead(**user))

    return connections
