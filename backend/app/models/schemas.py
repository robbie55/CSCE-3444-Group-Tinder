from datetime import datetime
from typing import Annotated, Dict, List, Optional

from pydantic import BaseModel, BeforeValidator, EmailStr, Field, HttpUrl

from app.models.enums import Major

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
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        populate_by_name = True  # allows us to us .id rather than ._id
        arbitrary_types_allowed = True  # needed for ObjectId Handling


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
    created_by: PyObjectId  # stores the user's ObjectId string


class GroupRead(GroupBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    created_by: PyObjectId  # user id of the owner
    members: List[UserRead] = []  # includes nested objects
    created_at: datetime

    class Config:
        populate_by_name = True  # see UserCreate for why include the Config
        arbitrary_types_allowed = True
