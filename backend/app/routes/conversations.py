from typing import List

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.conversation import (
    ConversationDetailResponse,
    ConversationResponse,
    CreateDirectConversationRequest,
    SearchResponse,
)
from app.services import auth_service, conversation_service

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get(
    "",
    response_model=List[ConversationResponse],
    status_code=status.HTTP_200_OK,
    summary="Get authenticated user's conversations",
)
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    """
    Returns conversations belonging to the authenticated user,
    sorted by most recent activity (updated_at DESC).
    """
    return conversation_service.get_user_conversations(db, current_user)


@router.post(
    "/direct",
    response_model=ConversationResponse,
    status_code=status.HTTP_200_OK,
    summary="Initiate or retrieve direct 1-to-1 conversation",
)
def create_direct_conversation(
    req: CreateDirectConversationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    """
    Finds or creates a direct conversation between authenticated user and target user_id.
    Prevents self-conversations and duplicate direct conversations.
    """
    return conversation_service.create_or_get_direct_conversation(
        db, current_user, req.user_id
    )


@router.get(
    "/search",
    response_model=SearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Search contacts and conversations",
)
def search_conversations(
    q: str = Query("", description="Search query string"),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    """
    Searches authenticated user's conversations and contacts by username, display_name, or conversation name.
    """
    return conversation_service.search_contacts_and_conversations(
        db, current_user, q
    )


@router.get(
    "/{conversation_id}",
    response_model=ConversationDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get conversation details by ID",
)
def get_conversation_detail(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    """
    Returns detailed conversation information and member profiles.
    Only accessible by members of the conversation.
    """
    return conversation_service.get_conversation_detail(
        db, current_user, conversation_id
    )
