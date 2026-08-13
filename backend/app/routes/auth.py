from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session
from app.models.user import User
from app.database import get_db
from app.schemas.auth import (
    AuthMessageResponse,
    LoginRequest,
    RegisterRequest,
    VerifyOtpRequest,
    UpdateProfileRequest,
)
from app.schemas.user import UserResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=AuthMessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Register new user profile (Step 1)",
)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """
    Validates username, phone (if provided), and display_name.
    Queues data for mocked OTP verification.
    """
    return auth_service.register_user(db, req)


@router.post(
    "/login",
    response_model=AuthMessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Login existing user (Step 1)",
)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """
    Checks that the user exists and prompts for mocked OTP.
    """
    return auth_service.login_user(db, req)


@router.post(
    "/verify-otp",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify OTP for registration or login (Step 2)",
)
def verify_otp(
    req: VerifyOtpRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Verifies fixed OTP ('123456'), completes account creation or login,
    issues a secure session token via HttpOnly cookie, and returns user profile.
    """
    return auth_service.verify_otp(db, req, response)


@router.post(
    "/verify-login-otp",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify login OTP (Alias for verify-otp)",
)
def verify_login_otp(
    req: VerifyOtpRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Alias for verify-otp to explicitly support verify-login-otp route requests.
    """
    return auth_service.verify_otp(db, req, response)


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout user and clear session",
)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Invalidates session in DB, updates is_online to False, and deletes session cookie.
    """
    return auth_service.logout_user(db, request, response)


@router.put(
    "/profile",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update authenticated user's profile",
)
def update_profile(
    req: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    """
    Updates the authenticated user's display name and avatar.
    """
    if not req.display_name or not req.display_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Display name cannot be empty"
        )
    
    current_user.display_name = req.display_name.strip()
    if req.avatar is not None:
        current_user.avatar = req.avatar.strip()
        
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user profile",
)
def get_me(
    current_user: User = Depends(auth_service.get_current_user),
):
    """
    Retrieves current user profile from HttpOnly session cookie.
    Returns 401 if cookie is missing, invalid, or expired.
    """
    return current_user
