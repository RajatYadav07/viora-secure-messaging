from typing import Optional
from pydantic import BaseModel, Field, field_validator


class RegisterRequest(BaseModel):
    """Registration request payload."""

    username: str = Field(..., min_length=3, max_length=64, description="Unique handle")
    phone: Optional[str] = Field(None, description="Optional E.164 phone number")
    display_name: str = Field(..., min_length=1, max_length=128, description="User's display name")

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip().lower()
        if not v.isalnum() and "_" not in v:
            raise ValueError("Username can only contain alphanumeric characters and underscores")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if not v:
            return None
        # Basic validation for international format phone numbers
        cleaned = v.lstrip("+")
        if not cleaned.isdigit() or len(cleaned) < 7 or len(cleaned) > 15:
            raise ValueError("Phone number must be a valid E.164 format (e.g. +911234567890)")
        return v

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Display name cannot be empty")
        return v


class LoginRequest(BaseModel):
    """Login request payload."""

    username: str = Field(..., min_length=3, max_length=64)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, v: str) -> str:
        return v.strip().lower()


class VerifyOtpRequest(BaseModel):
    """OTP verification payload for registration or login."""

    username: str = Field(..., min_length=3, max_length=64)
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")

    @field_validator("username")
    @classmethod
    def normalize_username(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be exactly 6 digits")
        return v


class AuthMessageResponse(BaseModel):
    """Standard message response for auth steps needing verification."""

    message: str
    verification_required: bool = True

class UpdateProfileRequest(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=100)
    avatar: Optional[str] = None
