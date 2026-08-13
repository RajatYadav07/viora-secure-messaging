from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.contact import Contact
from app.models.conversation import Conversation, ConversationMember
from app.models.message import Message, MessageStatus
from app.models.user import User
from app.schemas.conversation import (
    ConversationDetailResponse,
    ConversationMemberResponse,
    ConversationResponse,
    MessagePreview,
    SearchResponse,
)
from app.schemas.user import UserResponse


def _format_conversation_response(
    db: Session, conv: Conversation, current_user: User
) -> ConversationResponse:
    """Helper to convert a Conversation ORM object into ConversationResponse."""
    members = (
        db.query(ConversationMember)
        .filter(ConversationMember.conversation_id == conv.id)
        .all()
    )
    member_count = len(members)

    other_user_res: Optional[UserResponse] = None
    if conv.type == "direct":
        other_member = next(
            (m for m in members if m.user_id != current_user.id), None
        )
        if other_member:
            other_user_obj = (
                db.query(User).filter(User.id == other_member.user_id).first()
            )
            if other_user_obj:
                other_user_res = UserResponse.model_validate(other_user_obj)

    # Latest message preview
    latest_msg = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.desc())
        .first()
    )

    latest_msg_preview: Optional[MessagePreview] = None
    latest_msg_ts: Optional[datetime] = None

    if latest_msg:
        latest_msg_preview = MessagePreview(
            id=latest_msg.id,
            sender_id=latest_msg.sender_id,
            content=latest_msg.content,
            created_at=latest_msg.created_at,
        )
        latest_msg_ts = latest_msg.created_at

    # Unread count via MessageStatus where status != 'read'
    unread_count = (
        db.query(func.count(MessageStatus.id))
        .join(Message, Message.id == MessageStatus.message_id)
        .filter(
            Message.conversation_id == conv.id,
            MessageStatus.user_id == current_user.id,
            MessageStatus.status != "read",
        )
        .scalar()
        or 0
    )

    return ConversationResponse(
        id=conv.id,
        type=conv.type,
        name=conv.name,
        other_user=other_user_res,
        member_count=member_count,
        latest_message=latest_msg_preview,
        latest_message_timestamp=latest_msg_ts,
        unread_count=unread_count,
        updated_at=conv.updated_at,
        created_at=conv.created_at,
    )


def get_user_conversations(
    db: Session, current_user: User
) -> List[ConversationResponse]:
    """Retrieve all conversations for current user, sorted by updated_at DESC."""
    conv_ids = (
        db.query(ConversationMember.conversation_id)
        .filter(ConversationMember.user_id == current_user.id)
        .subquery()
    )

    conversations = (
        db.query(Conversation)
        .filter(Conversation.id.in_(select(conv_ids)))
        .order_by(Conversation.updated_at.desc())
        .all()
    )

    return [
        _format_conversation_response(db, conv, current_user)
        for conv in conversations
    ]


def create_or_get_direct_conversation(
    db: Session, current_user: User, target_user_id: int
) -> ConversationResponse:
    """Initiate or fetch an existing direct 1-to-1 conversation."""
    if target_user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot create a direct conversation with yourself.",
        )

    target_user = db.query(User).filter(User.id == target_user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found.",
        )

    # Subquery: find direct conversations where both users are members
    subq = (
        db.query(ConversationMember.conversation_id)
        .filter(
            ConversationMember.user_id.in_([current_user.id, target_user_id])
        )
        .group_by(ConversationMember.conversation_id)
        .having(func.count(ConversationMember.user_id.distinct()) == 2)
        .subquery()
    )

    existing_conv = (
        db.query(Conversation)
        .filter(Conversation.id.in_(select(subq)), Conversation.type == "direct")
        .first()
    )

    if existing_conv:
        return _format_conversation_response(db, existing_conv, current_user)

    # Create new direct conversation
    new_conv = Conversation(type="direct", created_by=current_user.id)
    db.add(new_conv)
    db.flush()

    m1 = ConversationMember(
        conversation_id=new_conv.id, user_id=current_user.id, role="admin"
    )
    m2 = ConversationMember(
        conversation_id=new_conv.id, user_id=target_user_id, role="member"
    )
    db.add_all([m1, m2])
    db.commit()
    db.refresh(new_conv)

    return _format_conversation_response(db, new_conv, current_user)


def get_conversation_detail(
    db: Session, current_user: User, conversation_id: int
) -> ConversationDetailResponse:
    """Get full conversation details. Requires current user to be a member."""
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id)
        .first()
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )

    # Authorization check
    is_member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == current_user.id,
        )
        .first()
    )
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this conversation.",
        )

    # Query members with user details
    member_records = (
        db.query(ConversationMember, User)
        .join(User, User.id == ConversationMember.user_id)
        .filter(ConversationMember.conversation_id == conversation_id)
        .all()
    )

    member_responses: List[ConversationMemberResponse] = []
    other_user_res: Optional[UserResponse] = None

    for mem, user in member_records:
        member_responses.append(
            ConversationMemberResponse(
                user_id=user.id,
                username=user.username,
                display_name=user.display_name,
                avatar=user.avatar,
                is_online=user.is_online,
                last_seen=user.last_seen,
                role=mem.role,
                joined_at=mem.joined_at,
            )
        )
        if conv.type == "direct" and user.id != current_user.id:
            other_user_res = UserResponse.model_validate(user)

    return ConversationDetailResponse(
        id=conv.id,
        type=conv.type,
        name=conv.name,
        created_by=conv.created_by,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        other_user=other_user_res,
        members=member_responses,
    )


def search_contacts_and_conversations(
    db: Session, current_user: User, query_str: str
) -> SearchResponse:
    """Search user's contacts and conversations by username, display_name, or conversation name."""
    q = query_str.strip().lower()
    if not q:
        all_contacts = (
            db.query(User)
            .join(Contact, Contact.contact_user_id == User.id)
            .filter(Contact.user_id == current_user.id)
            .all()
        )
        return SearchResponse(
            contacts=[UserResponse.model_validate(u) for u in all_contacts],
            conversations=get_user_conversations(db, current_user),
        )

    # Search Contacts
    matched_contacts = (
        db.query(User)
        .join(Contact, Contact.contact_user_id == User.id)
        .filter(
            Contact.user_id == current_user.id
        )
        .filter(
            (User.username.ilike(f"%{q}%")) | (User.display_name.ilike(f"%{q}%"))
        )
        .all()
    )

    # Filter matching conversations
    user_conversations = get_user_conversations(db, current_user)
    matched_conversations = []
    for conv in user_conversations:
        if conv.name and q in conv.name.lower():
            matched_conversations.append(conv)
        elif conv.other_user:
            if (
                q in conv.other_user.username.lower()
                or q in conv.other_user.display_name.lower()
            ):
                matched_conversations.append(conv)

    return SearchResponse(
        contacts=[UserResponse.model_validate(u) for u in matched_contacts],
        conversations=matched_conversations,
    )
