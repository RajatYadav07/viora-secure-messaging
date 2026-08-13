from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.message_service import (
    get_conversation_messages,
    mark_conversation_read,
)
from app.schemas.message import MessageResponse
from app.websocket.manager import manager

router = APIRouter(prefix="/conversations", tags=["Messages"])


@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
def get_messages(
    conversation_id: int,
    limit: int = Query(50, ge=1, le=100),
    before_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    messages = get_conversation_messages(
        db=db,
        current_user=current_user,
        conversation_id=conversation_id,
        limit=limit,
        before_id=before_id
    )
    # Convert ORM objects to response dicts with computed status
    result = []
    for msg in messages:
        resp = MessageResponse.model_validate(msg)
        # Override the status with the computed aggregate
        if hasattr(msg, '_computed_status'):
            resp.status = msg._computed_status
        result.append(resp)
    return result


@router.post("/{conversation_id}/read")
async def mark_read(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all unread messages in a conversation as read for the authenticated user.

    Sends WebSocket status_update events to the original senders.
    """
    affected = mark_conversation_read(db, current_user, conversation_id)

    # Notify senders via WebSocket
    for message_id, sender_id in affected:
        event = {
            "type": "status_update",
            "message_id": message_id,
            "status": "read",
        }
        await manager.send_to_user(sender_id, event)

    return {"message": "ok"}
