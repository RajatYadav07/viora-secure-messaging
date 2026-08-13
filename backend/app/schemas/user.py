from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    """Safe public/authenticated user profile response schema."""

    id: int
    username: str
    phone: Optional[str] = None
    display_name: str
    avatar: Optional[str] = None
    is_online: bool
    last_seen: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
