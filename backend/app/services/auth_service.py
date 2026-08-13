from datetime import datetime, timedelta, timezone
import secrets
import os
from typing import Dict, Optional

from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.session import AuthSession
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, VerifyOtpRequest

FIXED_OTP = "123456"
SESSION_EXPIRE_DAYS = 7
COOKIE_NAME = "session_token"

# In-memory storage for pending registrations (mocked OTP flow)
# Structure: {username: {"username": str, "phone": str|None, "display_name": str, "created_at": datetime}}
_pending_registrations: Dict[str, dict] = {}


def utc_now() -> datetime:
    """Return timezone-aware current UTC time."""
    return datetime.now(timezone.utc)


def register_user(db: Session, req: RegisterRequest) -> dict:
    """
    Validate registration data and queue in pending registrations.
    Does not create the user in the database until OTP is verified.
    """
    # Check if username already exists in database
    existing_user = db.query(User).filter(User.username == req.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username '{req.username}' is already registered.",
        )

    # Check if phone already exists in database (if phone provided)
    if req.phone:
        existing_phone = db.query(User).filter(User.phone == req.phone).first()
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Phone number '{req.phone}' is already registered.",
            )

    # Store in pending registrations structure
    _pending_registrations[req.username] = {
        "username": req.username,
        "phone": req.phone,
        "display_name": req.display_name,
        "created_at": utc_now(),
    }

    return {"message": "OTP sent", "verification_required": True}


def login_user(db: Session, req: LoginRequest) -> dict:
    """
    Check user existence and require OTP verification for login.
    """
    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{req.username}' not found. Please register first.",
        )

    return {"message": "OTP sent", "verification_required": True}


def _create_session_and_set_cookie(db: Session, user: User, response: Response) -> User:
    """Helper to update user state, create AuthSession, and set HttpOnly cookie."""
    # Update online status & last_seen
    user.is_online = True
    user.last_seen = utc_now()

    # Generate secure random opaque session token
    token = secrets.token_urlsafe(32)
    expires_at = utc_now() + timedelta(days=SESSION_EXPIRE_DAYS)

    auth_session = AuthSession(
        user_id=user.id,
        session_token=token,
        expires_at=expires_at,
    )
    db.add(auth_session)
    db.commit()
    db.refresh(user)

    is_prod = os.getenv("ENVIRONMENT") == "production"

    # Set HttpOnly Cookie for session persistence
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="none" if is_prod else "lax",
        secure=is_prod,
        max_age=SESSION_EXPIRE_DAYS * 24 * 3600,
        path="/",
    )

    return user


def verify_otp(db: Session, req: VerifyOtpRequest, response: Response) -> User:
    """
    Unified OTP verification handler:
    Handles both registration OTP verification and login OTP verification.
    """
    if req.otp != FIXED_OTP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. For testing use '123456'.",
        )

    # Case 1: Pending registration exists for this username
    if req.username in _pending_registrations:
        data = _pending_registrations.pop(req.username)

        # Final check for uniqueness before creating
        if db.query(User).filter(User.username == data["username"]).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Username '{data['username']}' is already registered.",
            )

        if data["phone"] and db.query(User).filter(User.phone == data["phone"]).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Phone number '{data['phone']}' is already registered.",
            )

        new_user = User(
            username=data["username"],
            phone=data["phone"],
            display_name=data["display_name"],
            is_online=True,
            last_seen=utc_now(),
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return _create_session_and_set_cookie(db, new_user, response)

    # Case 2: Existing user attempting login
    existing_user = db.query(User).filter(User.username == req.username).first()
    if existing_user:
        return _create_session_and_set_cookie(db, existing_user, response)

    # Case 3: Neither pending registration nor existing user found
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"No pending registration or user found for '{req.username}'. Please register first.",
    )


def logout_user(db: Session, request: Request, response: Response) -> dict:
    """
    Invalidate session token in DB, set user offline, and clear cookie.
    """
    token = request.cookies.get(COOKIE_NAME)

    if token:
        auth_session = db.query(AuthSession).filter(AuthSession.session_token == token).first()
        if auth_session:
            user = db.query(User).filter(User.id == auth_session.user_id).first()
            if user:
                user.is_online = False
                user.last_seen = utc_now()
            db.delete(auth_session)
            db.commit()

    is_prod = os.getenv("ENVIRONMENT") == "production"

    # Clear HttpOnly cookie
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="none" if is_prod else "lax",
        secure=is_prod,
    )

    return {"message": "Logged out successfully"}


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """
    FastAPI Dependency to retrieve authenticated User from session cookie.
    Raises HTTP 401 if unauthenticated, invalid, or expired.
    """
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Session cookie missing.",
        )

    auth_session = db.query(AuthSession).filter(AuthSession.session_token == token).first()
    if not auth_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session token.",
        )

    # Ensure timezone aware comparison
    expires_at = auth_session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < utc_now():
        db.delete(auth_session)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please login again.",
        )

    user = db.query(User).filter(User.id == auth_session.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with session not found.",
        )

    return user
