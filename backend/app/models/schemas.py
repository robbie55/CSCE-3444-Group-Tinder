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


class MatchRequestCreate(BaseModel):
    receiver_id: str


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
    pass


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
