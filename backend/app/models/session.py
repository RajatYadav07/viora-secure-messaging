from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AuthSession(Base):
    """
    Persists a login session for a user (token-based).

    This table exists so that the authentication system (Task N+1) can
    issue a session_token on login and validate it on subsequent requests
    without hitting an external auth service.

    NOTE: No login APIs are implemented yet. This model only defines the
    table structure in preparation for the authentication task.

    Columns
    -------
    id             : Auto-increment primary key.
    user_id        : The user this session belongs to.
    session_token  : Opaque random string (UUID / JWT id / etc.).  Unique
                     and indexed for fast lookup on each API request.
    created_at     : When the session was created (UTC).
    expires_at     : When the session becomes invalid (UTC).
    """

    __tablename__ = "auth_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_token = Column(String(512), unique=True, nullable=False, index=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    expires_at = Column(DateTime(timezone=True), nullable=False)

    # --- Relationships ---
    user = relationship("User", back_populates="auth_sessions")

    def __repr__(self) -> str:
        return (
            f"<AuthSession id={self.id} "
            f"user_id={self.user_id} "
            f"expires_at={self.expires_at}>"
        )
