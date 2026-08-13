from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Contact(Base):
    """
    Represents a one-directional contact relationship.

    A row (user_id=1, contact_user_id=2) means User 1 has added User 2 as
    a contact.  The reverse direction is a separate row.

    The UniqueConstraint prevents a user from adding the same person twice.

    Columns
    -------
    id               : Auto-increment primary key.
    user_id          : The user who owns this contact list entry.
    contact_user_id  : The user who was added as a contact.
    created_at       : When the contact was added (UTC).
    """

    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    contact_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )

    # Unique: a user cannot add the same person more than once
    __table_args__ = (
        UniqueConstraint("user_id", "contact_user_id", name="uq_user_contact"),
    )

    # --- Relationships ---
    user = relationship(
        "User",
        foreign_keys=[user_id],
        back_populates="contacts",
    )
    contact_user = relationship(
        "User",
        foreign_keys=[contact_user_id],
    )

    def __repr__(self) -> str:
        return (
            f"<Contact id={self.id} "
            f"user_id={self.user_id} "
            f"contact_user_id={self.contact_user_id}>"
        )
