from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Message(Base):
    """
    A single chat message inside a conversation.

    reply_to_id is a self-referencing FK that supports the quoted-reply
    feature (like Signal's swipe-to-reply).  It is nullable so that most
    messages work without it.

    Indexes
    -------
    idx_messages_conversation_created  : speeds up pagination queries that
        fetch messages for a conversation ordered by time.

    Columns
    -------
    id              : Auto-increment primary key.
    conversation_id : Which conversation this message belongs to.
    sender_id       : Who sent the message.
    content         : Message text body.
    reply_to_id     : Optional FK to another Message (self-referential).
    created_at      : When the message was sent (UTC).
    """

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content = Column(Text, nullable=False)
    reply_to_id = Column(
        Integer,
        ForeignKey("messages.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=utc_now, index=True
    )

    # Composite index: efficiently fetch all messages for a conversation
    # in chronological order — the most common query pattern.
    __table_args__ = (
        Index("idx_messages_conversation_created", "conversation_id", "created_at"),
    )

    # --- Relationships ---
    conversation = relationship("Conversation", back_populates="messages")

    sender = relationship(
        "User",
        foreign_keys=[sender_id],
        back_populates="sent_messages",
    )

    # Self-referential: the message being replied to
    replied_to = relationship(
        "Message",
        remote_side="Message.id",
        foreign_keys=[reply_to_id],
    )

    # Delivery/read receipts for this message
    statuses = relationship(
        "MessageStatus",
        back_populates="message",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<Message id={self.id} "
            f"conversation_id={self.conversation_id} "
            f"sender_id={self.sender_id}>"
        )


class MessageStatus(Base):
    """
    Per-user delivery and read receipt for a single message.

    This design supports both 1-to-1 and group conversations:
    - In a direct chat there will be one row per message (the recipient).
    - In a group chat there will be N-1 rows per message (all members
      except the sender).

    Status lifecycle:  sent -> delivered -> read

    Columns
    -------
    id          : Auto-increment primary key.
    message_id  : The message this receipt belongs to.
    user_id     : The recipient user.
    status      : "sent" | "delivered" | "read"
    updated_at  : When the status was last changed (UTC).
    """

    __tablename__ = "message_statuses"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(
        Integer,
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = Column(String(16), nullable=False, default="sent")  # sent|delivered|read
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    # One status row per (message, user) pair
    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="uq_message_user_status"),
    )

    # --- Relationships ---
    message = relationship("Message", back_populates="statuses")
    user = relationship("User", back_populates="message_statuses")

    def __repr__(self) -> str:
        return (
            f"<MessageStatus message_id={self.message_id} "
            f"user_id={self.user_id} status={self.status!r}>"
        )
