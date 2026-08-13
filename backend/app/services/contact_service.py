from typing import List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.contact import Contact
from app.models.user import User


def get_user_contacts(db: Session, current_user: User) -> List[User]:
    """Retrieve list of contact user profiles for the current user."""
    contacts = (
        db.query(User)
        .join(Contact, Contact.contact_user_id == User.id)
        .filter(Contact.user_id == current_user.id)
        .order_by(User.display_name.asc())
        .all()
    )
    return contacts


def add_contact(db: Session, current_user: User, username: str) -> User:
    """Add another user as a contact by username."""
    target_username = username.strip().lower()

    if target_username == current_user.username.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot add yourself as a contact.",
        )

    target_user = db.query(User).filter(User.username == target_username).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '@{target_username}' not found.",
        )

    existing_contact = (
        db.query(Contact)
        .filter(
            Contact.user_id == current_user.id,
            Contact.contact_user_id == target_user.id,
        )
        .first()
    )
    if existing_contact:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User '@{target_username}' is already in your contacts.",
        )

    new_contact = Contact(user_id=current_user.id, contact_user_id=target_user.id)
    db.add(new_contact)
    db.commit()

    return target_user


def delete_contact(db: Session, current_user: User, contact_user_id: int) -> None:
    """Remove a contact relationship for the authenticated user."""
    contact = (
        db.query(Contact)
        .filter(
            Contact.user_id == current_user.id,
            Contact.contact_user_id == contact_user_id,
        )
        .first()
    )
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found in your contact list.",
        )

    db.delete(contact)
    db.commit()
