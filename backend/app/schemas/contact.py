from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class AddContactRequest(BaseModel):
    """Payload to add a new contact by username."""

    username: str = Field(..., min_length=3, max_length=64, description="Target contact's username")

    @field_validator("username")
    @classmethod
    def normalize_username(cls, v: str) -> str:
        return v.strip().lower()


class ContactResponse(BaseModel):
    """Safe contact user profile representation."""

    id: int
    username: str
    phone: Optional[str] = None
    display_name: str
    avatar: Optional[str] = None
    is_online: bool
    last_seen: Optional[datetime] = None
    created_at: datetime
