from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.user import UserResponse


class CreateDirectConversationRequest(BaseModel):
    """Payload to initiate or retrieve a 1-on-1 direct conversation."""

    user_id: int = Field(..., description="Target user ID to chat with")


class CreateGroupRequest(BaseModel):
    name: str = Field(..., min_length=1)
    member_ids: List[int] = Field(..., min_items=1)


class AddGroupMemberRequest(BaseModel):
    user_id: int


class MessagePreview(BaseModel):
    """Minimal message preview for conversation list items."""

    id: int
    sender_id: int
    content: str
    created_at: datetime


class ConversationResponse(BaseModel):
    """Conversation summary item for sidebar list."""

    id: int
    type: str  # "direct" | "group"
    name: Optional[str] = None
    other_user: Optional[UserResponse] = None
    member_count: int
    latest_message: Optional[MessagePreview] = None
    latest_message_timestamp: Optional[datetime] = None
    unread_count: int = 0
    updated_at: datetime
    created_at: datetime


class ConversationMemberResponse(BaseModel):
    """Member detail entry for conversation inspection."""

    user_id: int
    username: str
    display_name: str
    avatar: Optional[str] = None
    is_online: bool
    last_seen: Optional[datetime] = None
    role: str
    joined_at: datetime


class ConversationDetailResponse(BaseModel):
    """Full detail of a conversation for chat window header/info."""

    id: int
    type: str
    name: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    other_user: Optional[UserResponse] = None
    members: List[ConversationMemberResponse]


class SearchResponse(BaseModel):
    """Combined search results matching query string."""

    contacts: List[UserResponse]
    conversations: List[ConversationResponse]
