from typing import List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case
from fastapi import HTTPException, status

from app.models.message import Message, MessageStatus
from app.models.conversation import Conversation, ConversationMember
from app.models.user import User
from app.services.auth_service import utc_now


# Status priority for aggregation: sent < delivered < read
_STATUS_PRIORITY = {"sent": 0, "delivered": 1, "read": 2}


def _aggregate_status(statuses: List[str]) -> str:
    """Return the minimum status across all recipients.

    If *any* recipient is still 'sent', the aggregate is 'sent'.
    If all are at least 'delivered', aggregate is 'delivered'.
    If all are 'read', aggregate is 'read'.
    """
    if not statuses:
        return "sent"
    min_priority = min(_STATUS_PRIORITY.get(s, 0) for s in statuses)
    for name, prio in _STATUS_PRIORITY.items():
        if prio == min_priority:
            return name
    return "sent"


def get_conversation_messages(
    db: Session,
    current_user: User,
    conversation_id: int,
    limit: int = 50,
    before_id: Optional[int] = None
) -> List[dict]:
    """Fetch messages with aggregate delivery status for the current user."""
    # Verify user is a member of the conversation
    is_member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this conversation"
        )

    query = db.query(Message).filter(Message.conversation_id == conversation_id)
    if before_id:
        query = query.filter(Message.id < before_id)

    # Order descending to get newest up to limit, then reverse for chronological order
    messages = query.order_by(Message.id.desc()).limit(limit).options(
        joinedload(Message.sender),
        joinedload(Message.statuses),
    ).all()

    messages = list(reversed(messages))

    # Build response dicts with computed aggregate status
    result = []
    for msg in messages:
        # Compute aggregate status for messages sent by current user
        if msg.sender_id == current_user.id:
            recipient_statuses = [s.status for s in msg.statuses]
            agg = _aggregate_status(recipient_statuses)
        else:
            # For messages from others, show their status for current user
            my_status = next(
                (s.status for s in msg.statuses if s.user_id == current_user.id),
                "sent"
            )
            agg = my_status

        # Attach the computed status as a transient attribute
        msg._computed_status = agg
        result.append(msg)

    return result


def create_message(
    db: Session,
    sender: User,
    conversation_id: int,
    content: str,
    reply_to_id: Optional[int] = None
) -> Tuple[Message, str]:
    """Create a message and generate MessageStatus rows for all recipients.

    Returns (message, aggregate_status) tuple.
    """
    if not content or not content.strip():
        raise ValueError("Message content cannot be empty")

    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise ValueError("Conversation not found")

    is_member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == sender.id
    ).first()
    if not is_member:
        raise ValueError("Not a member of this conversation")

    message = Message(
        conversation_id=conversation_id,
        sender_id=sender.id,
        content=content,
        reply_to_id=reply_to_id
    )

    conversation.updated_at = utc_now()

    db.add(message)
    db.flush()  # Get the message.id before creating statuses

    # Create MessageStatus for every member except sender
    members = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id != sender.id
    ).all()

    for member in members:
        ms = MessageStatus(
            message_id=message.id,
            user_id=member.user_id,
            status="sent",
        )
        db.add(ms)

    db.commit()
    db.refresh(message)

    # Load sender for the response
    message = db.query(Message).options(
        joinedload(Message.sender),
        joinedload(Message.statuses),
    ).filter(Message.id == message.id).first()

    # Compute aggregate status
    recipient_statuses = [s.status for s in message.statuses]
    agg = _aggregate_status(recipient_statuses)

    return message, agg


def mark_conversation_read(
    db: Session,
    current_user: User,
    conversation_id: int,
) -> List[Tuple[int, int]]:
    """Mark all unread messages in a conversation as read for current_user.

    Returns list of (message_id, sender_id) for messages whose status changed,
    so the caller can notify senders via WebSocket.
    """
    # Verify membership
    is_member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id,
    ).first()
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this conversation",
        )

    # Find all unread MessageStatus rows for current user in this conversation
    unread_statuses = (
        db.query(MessageStatus)
        .join(Message, Message.id == MessageStatus.message_id)
        .filter(
            Message.conversation_id == conversation_id,
            MessageStatus.user_id == current_user.id,
            MessageStatus.status != "read",
        )
        .all()
    )

    if not unread_statuses:
        return []

    now = utc_now()
    affected: List[Tuple[int, int]] = []

    # Collect message IDs to look up senders in bulk
    message_ids = [ms.message_id for ms in unread_statuses]
    messages_map = {}
    if message_ids:
        msgs = db.query(Message).filter(Message.id.in_(message_ids)).all()
        messages_map = {m.id: m for m in msgs}

    for ms in unread_statuses:
        ms.status = "read"
        ms.updated_at = now
        msg = messages_map.get(ms.message_id)
        if msg and msg.sender_id != current_user.id:
            affected.append((ms.message_id, msg.sender_id))

    db.commit()
    return affected


def deliver_message_to_user(
    db: Session,
    message_id: int,
    user_id: int,
) -> bool:
    """Update a single MessageStatus from 'sent' to 'delivered'.

    Returns True if the status was actually updated.
    """
    ms = db.query(MessageStatus).filter(
        MessageStatus.message_id == message_id,
        MessageStatus.user_id == user_id,
        MessageStatus.status == "sent",
    ).first()

    if ms:
        ms.status = "delivered"
        ms.updated_at = utc_now()
        db.commit()
        return True
    return False
