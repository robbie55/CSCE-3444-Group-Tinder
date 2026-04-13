from datetime import UTC, datetime
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


def _parse_object_id(value: str, label: str = "id") -> ObjectId:
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {label} format.",
        )


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
    request_oid = _parse_object_id(request_id, "request id")

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


@router.post("/match/request/{receiver_id}", response_model=MatchRequestRead)
def send_match_request(
    receiver_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    receiver_oid = _parse_object_id(receiver_id, "receiver id")
    sender_oid = ObjectId(current_user["_id"])

    receiver = db["users"].find_one({"_id": receiver_oid})
    if not receiver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receiver user not found.",
        )

    if sender_oid == receiver_oid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send match request to yourself.",
        )

    existing_request = db["match_requests"].find_one(
        {
            "$or": [
                {
                    "sender_id": sender_oid,
                    "receiver_id": receiver_oid,
                    "status": MatchRequestStatus.PENDING.value,
                },
                {
                    "sender_id": receiver_oid,
                    "receiver_id": sender_oid,
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

    match_request = {
        "sender_id": sender_oid,
        "receiver_id": receiver_oid,
        "status": MatchRequestStatus.PENDING.value,
        "created_at": datetime.now(UTC),
        "updated_at": None,
    }

    result = db["match_requests"].insert_one(match_request)
    match_request["_id"] = result.inserted_id
    match_request = _serialize_match_request_doc(match_request)

    return MatchRequestRead(**match_request)


@router.get("/match/requests/incoming", response_model=list[MatchRequestWithUser])
def get_incoming_requests(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    return _get_requests_for_user(
        current_user=current_user, db=db, direction="incoming"
    )


@router.get("/match/requests/outgoing", response_model=list[MatchRequestWithUser])
def get_outgoing_requests(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    return _get_requests_for_user(
        current_user=current_user, db=db, direction="outgoing"
    )


@router.patch("/match/requests/{request_id}", response_model=MatchRequestRead)
def update_match_request(
    request_id: str,
    request_update: MatchRequestUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
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
                "updated_at": datetime.now(UTC),
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


@router.get("/match/connections", response_model=list[UserRead])
def get_connections(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    current_user_oid = ObjectId(current_user["_id"])

    accepted_requests = db["match_requests"].find(
        {
            "$or": [
                {
                    "sender_id": current_user_oid,
                    "status": MatchRequestStatus.ACCEPTED.value,
                },
                {
                    "receiver_id": current_user_oid,
                    "status": MatchRequestStatus.ACCEPTED.value,
                },
            ]
        }
    )

    connections = []
    for req in accepted_requests:
        other_user_id = (
            req["receiver_id"]
            if req["sender_id"] == current_user_oid
            else req["sender_id"]
        )

        user = db["users"].find_one({"_id": other_user_id})
        if user:
            user["_id"] = str(user["_id"])
            connections.append(UserRead(**user))

    return connections
