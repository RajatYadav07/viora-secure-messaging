from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


def utc_now() -> datetime:
    """Return the current UTC datetime (timezone-aware)."""
    return datetime.now(timezone.utc)


class User(Base):
    """
    Represents a registered user of the platform.

    Columns
    -------
    id            : Auto-increment primary key.
    username      : Unique handle chosen by the user (e.g. @alice).
    phone         : Optional E.164 phone number, unique when provided.
    display_name  : Human-readable name shown in the UI.
    avatar        : URL / path to the user's profile picture.
    is_online     : Transient flag updated via WebSocket events (Task N+1).
    last_seen     : Timestamp of the user's most recent activity.
    created_at    : Account creation timestamp (UTC).
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    phone = Column(String(32), unique=True, nullable=True, index=True)
    display_name = Column(String(128), nullable=False)
    avatar = Column(String(512), nullable=True)
    is_online = Column(Boolean, default=False, nullable=False)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )

    # --- Relationships ---
    # Contacts where this user is the owner
    contacts = relationship(
        "Contact",
        foreign_keys="Contact.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # Conversations this user is a member of
    conversation_memberships = relationship(
        "ConversationMember",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # Messages sent by this user
    sent_messages = relationship(
        "Message",
        foreign_keys="Message.sender_id",
        back_populates="sender",
    )

    # Read/delivery receipts for this user
    message_statuses = relationship(
        "MessageStatus",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # Active auth sessions
    auth_sessions = relationship(
        "AuthSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} username={self.username!r}>"
