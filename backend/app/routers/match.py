from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.db.connect import get_db
from app.models.enums import MatchRequestStatus
from app.models.schemas import (
    MatchRequestRead,
    MatchRequestWithUser,
    UserRead,
)
from app.routers.auth import get_current_user

router = APIRouter()


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
    if current_user["_id"] == receiver_oid:
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

    return MatchRequestRead(**match_request)


# Get incoming match requests for current user
@router.get("/match/requests/incoming", response_model=list[MatchRequestWithUser])
def get_incoming_requests(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    incoming = db["match_requests"].find(
        {
            "receiver_id": ObjectId(current_user["_id"]),
            "status": MatchRequestStatus.PENDING.value,
        }
    )

    requests_list = []
    for req in incoming:
        req["_id"] = str(req["_id"])
        sender_id = req["sender_id"]

        # Get sender user info
        sender = db["users"].find_one({"_id": sender_id})
        if sender:
            sender["_id"] = str(sender["_id"])
            sender_obj = UserRead(**sender)
        else:
            sender_obj = None

        match_req = MatchRequestWithUser(
            **req,
            sender=sender_obj,
        )
        requests_list.append(match_req)

    return requests_list


# Get outgoing match requests from current user
@router.get("/match/requests/outgoing", response_model=list[MatchRequestWithUser])
def get_outgoing_requests(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    outgoing = db["match_requests"].find(
        {
            "sender_id": ObjectId(current_user["_id"]),
            "status": MatchRequestStatus.PENDING.value,
        }
    )

    requests_list = []
    for req in outgoing:
        req["_id"] = str(req["_id"])
        receiver_id = req["receiver_id"]

        # Get receiver user info
        receiver = db["users"].find_one({"_id": receiver_id})
        if receiver:
            receiver["_id"] = str(receiver["_id"])
            receiver_obj = UserRead(**receiver)
        else:
            receiver_obj = None

        match_req = MatchRequestWithUser(
            **req,
            receiver=receiver_obj,
        )
        requests_list.append(match_req)

    return requests_list


# Accept a match request
@router.patch("/match/requests/{request_id}/accept", response_model=MatchRequestRead)
def accept_match_request(
    request_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    try:
        request_oid = ObjectId(request_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request id format.",
        )

    # Find the request
    match_request = db["match_requests"].find_one({"_id": request_oid})
    if not match_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match request not found.",
        )

    # Check if current user is the receiver
    if match_request["receiver_id"] != ObjectId(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only accept requests sent to you.",
        )

    # Check if request is still pending
    if match_request["status"] != MatchRequestStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This request has already been processed.",
        )

    # Update the request status
    db["match_requests"].update_one(
        {"_id": request_oid},
        {
            "$set": {
                "status": MatchRequestStatus.ACCEPTED.value,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    updated_request = db["match_requests"].find_one({"_id": request_oid})
    updated_request["_id"] = str(updated_request["_id"])

    return MatchRequestRead(**updated_request)


# Reject a match request
@router.patch("/match/requests/{request_id}/reject", response_model=MatchRequestRead)
def reject_match_request(
    request_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    try:
        request_oid = ObjectId(request_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request id format.",
        )

    # Find the request
    match_request = db["match_requests"].find_one({"_id": request_oid})
    if not match_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match request not found.",
        )

    # Check if current user is the receiver
    if match_request["receiver_id"] != ObjectId(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only reject requests sent to you.",
        )

    # Check if request is still pending
    if match_request["status"] != MatchRequestStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This request has already been processed.",
        )

    # Update the request status
    db["match_requests"].update_one(
        {"_id": request_oid},
        {
            "$set": {
                "status": MatchRequestStatus.REJECTED.value,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    updated_request = db["match_requests"].find_one({"_id": request_oid})
    updated_request["_id"] = str(updated_request["_id"])

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
