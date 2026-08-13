from datetime import datetime, timezone
from typing import Set

from sqlalchemy.orm import Session
from app.models.user import User
from app.models.conversation import ConversationMember
from app.websocket.manager import manager

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

async def broadcast_presence(db: Session, user: User, is_online: bool):
    """
    Broadcasts a presence update to all users who share a conversation with the target user.
    Also updates the target user's is_online and last_seen in the database.
    """
    # Update DB
    user.is_online = is_online
    if not is_online:
        user.last_seen = utc_now()
    db.commit()

    # Find relevant users (anyone in a conversation with this user)
    # 1. Find all conversation IDs the user is a member of
    user_convs = db.query(ConversationMember.conversation_id).filter(
        ConversationMember.user_id == user.id
    ).all()
    conv_ids = [c[0] for c in user_convs]

    # 2. Find all unique user IDs in those conversations (excluding self)
    if not conv_ids:
        return

    peers = db.query(ConversationMember.user_id).filter(
        ConversationMember.conversation_id.in_(conv_ids),
        ConversationMember.user_id != user.id
    ).distinct().all()
    
    peer_ids: Set[int] = {p[0] for p in peers}

    # 3. Broadcast presence event to connected peers
    last_seen_str = user.last_seen.isoformat() if user.last_seen else None
    
    event = {
        "type": "presence",
        "user_id": user.id,
        "is_online": is_online,
        "last_seen": last_seen_str
    }
    
    for peer_id in peer_ids:
        await manager.send_to_user(peer_id, event)
