from datetime import datetime
from pydantic import BaseModel, ConfigDict

class MessageSender(BaseModel):
    id: int
    username: str
    display_name: str
    avatar: str | None = None
    model_config = ConfigDict(from_attributes=True)

class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    sender: MessageSender
    content: str
    reply_to_id: int | None = None
    created_at: datetime
    status: str = "sent"  # Aggregate: "sent" | "delivered" | "read"
    model_config = ConfigDict(from_attributes=True)
