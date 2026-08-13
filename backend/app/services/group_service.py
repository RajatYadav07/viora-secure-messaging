from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.conversation import Conversation, ConversationMember
from app.models.user import User
from app.schemas.conversation import ConversationResponse
from app.services.conversation_service import _format_conversation_response


def create_group(
    db: Session, current_user: User, name: str, member_ids: List[int]
) -> ConversationResponse:
    if not name or not name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group name is required."
        )

    # Ensure uniqueness in member_ids and don't include current_user twice if they passed it
    unique_member_ids = set(member_ids)
    if current_user.id in unique_member_ids:
        unique_member_ids.remove(current_user.id)

    if not unique_member_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one other member is required to create a group."
        )

    # Validate all requested users exist
    users = db.query(User).filter(User.id.in_(unique_member_ids)).all()
    found_ids = {u.id for u in users}
    missing_ids = unique_member_ids - found_ids
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Users not found: {missing_ids}"
        )

    # Create new group conversation
    new_conv = Conversation(type="group", name=name.strip(), created_by=current_user.id)
    db.add(new_conv)
    db.flush()

    # Add creator as admin
    db.add(ConversationMember(conversation_id=new_conv.id, user_id=current_user.id, role="admin"))

    # Add other members
    for uid in unique_member_ids:
        db.add(ConversationMember(conversation_id=new_conv.id, user_id=uid, role="member"))

    db.commit()
    db.refresh(new_conv)

    return _format_conversation_response(db, new_conv, current_user)


def add_group_member(
    db: Session, current_user: User, group_id: int, target_user_id: int
):
    group = db.query(Conversation).filter(Conversation.id == group_id, Conversation.type == "group").first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")

    admin_member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == group_id,
        ConversationMember.user_id == current_user.id,
        ConversationMember.role == "admin"
    ).first()

    if not admin_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only group admins can add members.")

    target_user = db.query(User).filter(User.id == target_user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    existing_member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == group_id,
        ConversationMember.user_id == target_user_id
    ).first()

    if existing_member:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a member.")

    db.add(ConversationMember(conversation_id=group_id, user_id=target_user_id, role="member"))
    
    # Touch conversation updated_at so it bumps in list
    from app.models.conversation import utc_now
    group.updated_at = utc_now()
    
    db.commit()
    return {"message": "Member added successfully"}


def remove_group_member(
    db: Session, current_user: User, group_id: int, target_user_id: int
):
    group = db.query(Conversation).filter(Conversation.id == group_id, Conversation.type == "group").first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")

    admin_member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == group_id,
        ConversationMember.user_id == current_user.id,
        ConversationMember.role == "admin"
    ).first()

    if not admin_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only group admins can remove members.")

    target_member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == group_id,
        ConversationMember.user_id == target_user_id
    ).first()

    if not target_member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not a member of this group.")

    if target_member.role == "admin":
        admin_count = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == group_id,
            ConversationMember.role == "admin"
        ).count()
        if admin_count <= 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove the last admin.")

    db.delete(target_member)
    
    from app.models.conversation import utc_now
    group.updated_at = utc_now()
    
    db.commit()
    return {"message": "Member removed successfully"}


def leave_group(
    db: Session, current_user: User, group_id: int
):
    group = db.query(Conversation).filter(Conversation.id == group_id, Conversation.type == "group").first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")

    member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == group_id,
        ConversationMember.user_id == current_user.id
    ).first()

    if not member:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You are not a member of this group.")

    if member.role == "admin":
        admin_count = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == group_id,
            ConversationMember.role == "admin"
        ).count()
        if admin_count <= 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot leave group as you are the last admin.")

    db.delete(member)
    
    from app.models.conversation import utc_now
    group.updated_at = utc_now()
    
    db.commit()
    return {"message": "Left group successfully"}
