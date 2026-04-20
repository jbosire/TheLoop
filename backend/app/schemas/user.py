from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class UserResponse(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    username: str
    email: str
    avatar_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserPublicResponse(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    username: str
    avatar_url: str | None

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    username: str | None = None
    avatar_url: str | None = None
