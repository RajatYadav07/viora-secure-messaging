from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.conversation import (
    ConversationDetailResponse,
    ConversationResponse,
    CreateGroupRequest,
    AddGroupMemberRequest,
)
from app.services import auth_service, group_service, conversation_service

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.post(
    "",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new group",
)
def create_group(
    req: CreateGroupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    """
    Create a group with the authenticated user as the admin and creator.
    """
    return group_service.create_group(
        db, current_user, req.name, req.member_ids
    )


@router.post(
    "/{group_id}/members",
    status_code=status.HTTP_200_OK,
    summary="Add a member to the group",
)
def add_group_member(
    group_id: int,
    req: AddGroupMemberRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    """
    Add a new user to the group (Admin only).
    """
    return group_service.add_group_member(
        db, current_user, group_id, req.user_id
    )


@router.delete(
    "/{group_id}/members/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Remove a member from the group",
)
def remove_group_member(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    """
    Remove a user from the group (Admin only). Cannot remove the last admin.
    """
    return group_service.remove_group_member(
        db, current_user, group_id, user_id
    )


@router.post(
    "/{group_id}/leave",
    status_code=status.HTTP_200_OK,
    summary="Leave the group",
)
def leave_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    """
    Leave a group. Cannot leave if you are the last admin.
    """
    return group_service.leave_group(
        db, current_user, group_id
    )


@router.get(
    "/{group_id}",
    response_model=ConversationDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get group details by ID",
)
def get_group_detail(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    """
    Returns detailed group information and member profiles.
    Reuses the conversation detail service since they share the same model.
    """
    return conversation_service.get_conversation_detail(
        db, current_user, group_id
    )
