from datetime import datetime
from typing import Annotated, Dict, List, Optional

from pydantic import BaseModel, BeforeValidator, ConfigDict, EmailStr, Field, HttpUrl

from app.models.enums import Major, MatchRequestStatus

# Helper: MongoDB Atlas uses stringfied object id's, use this for id fields
PyObjectId = Annotated[str, BeforeValidator(str)]

# =======================
# USER MODELS
# =======================


# Base: Shared properties visible to everyone
class UserBase(BaseModel):
    username: str
    full_name: str
    major: Major
    bio: Optional[str] = None
    skills: List[str] = []  # ["Python", "C++"]
    external_links: Dict[str, HttpUrl] = {}  # {"github" : "https://... }


# Create: What the frontend will send to register a user
class UserCreate(UserBase):
    email: EmailStr
    password: str  # str here will be hashed


# Read: What the API returns to the frontend
class UserRead(UserBase):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    avatar_url: Optional[str] = None
    created_at: datetime


# Suggestion: UserRead + match score for matchmaking results
class SuggestionRead(UserRead):
    match_score: float


# schema for patch aka to edit current user
class UserUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    major: Optional[Major] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    external_links: Optional[Dict[str, HttpUrl]] = None


# =======================
# MATCH REQUEST MODELS
# =======================


class MatchRequestUpdate(BaseModel):
    status: MatchRequestStatus


class MatchRequestRead(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    sender_id: str
    receiver_id: str
    status: MatchRequestStatus
    created_at: datetime
    updated_at: Optional[datetime] = None


class MatchRequestWithUser(MatchRequestRead):
    sender: Optional[UserRead] = None
    receiver: Optional[UserRead] = None


# =======================
# GROUP MODELS
# =======================


class GroupBase(BaseModel):
    name: str
    description: str
    course_code: Optional[str] = None  # e.g. "CSCE 3444"
    max_members: int = 5
    tags: List[str] = []  # e.g. ["Capstone", "Project", "Study Group"]


class GroupCreate(GroupBase):
    invite_user_ids: List[str] = []


class GroupRead(GroupBase):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    created_by: PyObjectId  # user id of the owner
    members: List[UserRead] = []  # includes nested objects
    created_at: datetime


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    course_code: Optional[str] = None
    max_members: Optional[int] = None
    tags: Optional[List[str]] = None


# =======================
# DIRECT MESSAGING (v1)
# =======================


class DmOpenRequest(BaseModel):
    """Start or resume a 1:1 conversation with another user."""

    other_user_id: str


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=8000)


class MessageRead(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    conversation_id: str
    sender_id: str
    content: str
    created_at: datetime


class ConversationRead(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    participants: List[UserRead]
    last_message_at: Optional[datetime] = None
    last_message_preview: Optional[str] = None
    created_at: datetime
