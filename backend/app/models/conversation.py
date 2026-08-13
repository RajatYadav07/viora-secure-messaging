from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Conversation(Base):
    """
    A conversation channel — either a direct (1-to-1) or a group chat.

    Columns
    -------
    id          : Auto-increment primary key.
    type        : "direct" or "group".
    name        : Display name; required for groups, NULL for direct chats.
    created_by  : FK to the user who created the group (NULL for direct chats).
    created_at  : When the conversation was created (UTC).
    updated_at  : Updated on every new message — used to sort conversations
                  by recent activity (Signal-style inbox ordering).
    """

    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(16), nullable=False)          # "direct" | "group"
    name = Column(String(256), nullable=True)           # group name
    created_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    # --- Relationships ---
    creator = relationship("User", foreign_keys=[created_by])

    members = relationship(
        "ConversationMember",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )

    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )

    def __repr__(self) -> str:
        return f"<Conversation id={self.id} type={self.type!r} name={self.name!r}>"


class ConversationMember(Base):
    """
    Join table between Conversation and User with an extra `role` column.

    Roles
    -----
    "member" : regular participant
    "admin"  : group admin with elevated controls

    The UniqueConstraint on (conversation_id, user_id) ensures a user
    cannot appear twice in the same conversation.
    """

    __tablename__ = "conversation_members"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role = Column(String(16), nullable=False, default="member")  # "member" | "admin"
    joined_at = Column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )

    __table_args__ = (
        UniqueConstraint(
            "conversation_id", "user_id", name="uq_conversation_member"
        ),
    )

    # --- Relationships ---
    conversation = relationship("Conversation", back_populates="members")
    user = relationship("User", back_populates="conversation_memberships")

    def __repr__(self) -> str:
        return (
            f"<ConversationMember conversation_id={self.conversation_id} "
            f"user_id={self.user_id} role={self.role!r}>"
        )
