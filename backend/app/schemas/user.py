"""
User schemas for profile management with Auth0 integration.
"""

from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserBase(BaseModel):
    """Base user schema with common fields."""

    email: EmailStr
    nickname: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Public nickname used in community",
    )
    username: Optional[str] = Field(
        None, min_length=3, max_length=50, pattern="^[a-z0-9_]+$"
    )
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: str = Field(
        default="prefer_not_to_say", pattern="^(male|female|other|prefer_not_to_say)$"
    )
    country: str = Field(default="jp", min_length=2, max_length=2)
    language: str = Field(default="ja", min_length=2, max_length=5)
    preferred_language: str = Field(
        default="ja",
        min_length=2,
        max_length=5,
        description="User's preferred language",
    )
    timezone: str = Field(default="Asia/Tokyo", max_length=50)


class UserCreate(BaseModel):
    """Schema for creating a user from Auth0 data."""

    auth0_id: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    email_verified: bool = False
    nickname: str = Field(
        ..., min_length=1, max_length=50, description="Public nickname"
    )
    first_name: Optional[str] = Field(
        None, max_length=100, description="First name (private)"
    )
    last_name: Optional[str] = Field(
        None, max_length=100, description="Last name (private)"
    )
    phone: Optional[str] = Field(None, max_length=20)
    avatar_url: Optional[str] = None
    profile_visibility: Optional[str] = Field(
        None, pattern="^(public|limited|private)$"
    )


class UserUpdate(BaseModel):
    """Schema for updating user profile."""

    nickname: Optional[str] = Field(None, min_length=1, max_length=50)
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    username: Optional[str] = Field(
        None, min_length=3, max_length=50, pattern="^[a-z0-9_]+$"
    )
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(
        None, pattern="^(male|female|other|prefer_not_to_say)$"
    )
    country: Optional[str] = Field(None, min_length=2, max_length=2)
    language: Optional[str] = Field(None, min_length=2, max_length=5)
    preferred_language: Optional[str] = Field(None, min_length=2, max_length=5)
    timezone: Optional[str] = Field(None, max_length=50)
    profile_visibility: Optional[str] = Field(
        None, pattern="^(public|limited|private)$"
    )
    show_email: Optional[bool] = None
    show_online_status: Optional[bool] = None


class UserDiseaseResponse(BaseModel):
    """Schema for user's disease information."""

    id: int
    name: str
    description: Optional[str] = None
    category: Optional[str] = None

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    """Schema for user profile responses (full profile for owner)."""

    id: UUID
    member_id: Optional[str] = None  # 12-digit member ID (nullable for incomplete profiles)
    auth0_id: Optional[str]  # Nullable for migration compatibility
    idp_id: Optional[str]  # Generic IDP ID
    idp_provider: str = "auth0"
    email: EmailStr
    email_verified: bool

    # Private information (only visible to owner and support)
    first_name: Optional[str]
    last_name: Optional[str]
    phone: Optional[str]

    # Public information
    nickname: Optional[str] = None  # Nullable for incomplete profiles
    username: Optional[str]
    bio: Optional[str]
    avatar_url: Optional[str]
    date_of_birth: Optional[date]
    gender: Optional[str] = "prefer_not_to_say"
    country: Optional[str] = "jp"
    language: Optional[str] = "ja"
    preferred_language: str = "ja"
    timezone: Optional[str] = "Asia/Tokyo"

    # Privacy settings
    profile_visibility: Optional[str] = "limited"
    show_email: bool = False
    show_online_status: bool = False

    # Metadata
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime]
    is_active: bool
    diseases: List[UserDiseaseResponse] = []

    model_config = {"from_attributes": True}


class UserPublicResponse(BaseModel):
    """Schema for public user profile (limited information)."""

    id: UUID
    member_id: Optional[str] = None  # 12-digit member ID (public, nullable for incomplete profiles)
    nickname: Optional[str] = None  # Public nickname (nullable for incomplete profiles)
    username: Optional[str]
    bio: Optional[str]
    avatar_url: Optional[str]
    country: Optional[str] = "jp"
    created_at: datetime
    diseases: List[UserDiseaseResponse] = []  # Only public diseases

    model_config = {"from_attributes": True}
