from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.contact import AddContactRequest
from app.schemas.user import UserResponse
from app.services import auth_service, contact_service

router = APIRouter(prefix="/contacts", tags=["Contacts"])


@router.get(
    "",
    response_model=List[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="Get authenticated user's contact list",
)
def get_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    """Returns contacts of the authenticated user."""
    return contact_service.get_user_contacts(db, current_user)


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new contact by username",
)
def add_contact(
    req: AddContactRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    """
    Finds user by username, validates not adding self or duplicate,
    and adds to authenticated user's contact list.
    """
    return contact_service.add_contact(db, current_user, req.username)


@router.delete(
    "/{contact_user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a contact relationship",
)
def delete_contact(
    contact_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    """
    Removes contact relationship for the authenticated user.
    """
    contact_service.delete_contact(db, current_user, contact_user_id)
    return None
