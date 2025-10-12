"""
User-related Pydantic schemas.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, validator


class UserBase(BaseModel):
    """Base user schema."""

    first_name: Optional[str] = Field(None, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    birth_date: Optional[datetime] = None
    country_code: Optional[str] = Field(None, max_length=2)
    timezone: Optional[str] = Field("Asia/Tokyo", max_length=50)
    nickname: str = Field(..., max_length=50, min_length=1)
    display_name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = None
    avatar_url: Optional[str] = Field(None, max_length=500)
    preferred_language: Optional[str] = Field("ja", max_length=5)
    preferred_locale: Optional[str] = Field("ja-jp", max_length=10)
    name_display_order: Optional[str] = Field("western", max_length=20)
    custom_name_format: Optional[str] = Field(None, max_length=50)


class UserCreate(UserBase):
    """Schema for creating a user."""

    idp_id: str = Field(..., max_length=255)
    idp_provider: str = Field("auth0", max_length=50)

    @validator("nickname")
    def validate_nickname(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError("Nickname cannot be empty")
        return v.strip()


class UserUpdate(BaseModel):
    """Schema for updating a user."""

    first_name: Optional[str] = Field(None, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    birth_date: Optional[datetime] = None
    country_code: Optional[str] = Field(None, max_length=2)
    timezone: Optional[str] = Field(None, max_length=50)
    nickname: Optional[str] = Field(None, max_length=50, min_length=1)
    display_name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = None
    avatar_url: Optional[str] = Field(None, max_length=500)
    preferred_language: Optional[str] = Field(None, max_length=5)
    preferred_locale: Optional[str] = Field(None, max_length=10)
    name_display_order: Optional[str] = Field(None, max_length=20)
    custom_name_format: Optional[str] = Field(None, max_length=50)

    # Privacy settings
    is_profile_public: Optional[bool] = None
    show_age_range: Optional[bool] = None
    allow_direct_messages: Optional[bool] = None
    allow_friend_requests: Optional[bool] = None
    show_online_status: Optional[bool] = None

    # Notification settings
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    marketing_emails: Optional[bool] = None


class UserResponse(UserBase):
    """Schema for user response."""

    id: UUID
    member_id: str
    is_active: bool
    is_verified: bool
    is_email_verified: bool
    is_phone_verified: bool
    account_type: str
    is_profile_public: bool
    show_age_range: bool
    allow_direct_messages: bool
    allow_friend_requests: bool
    show_online_status: bool
    email_notifications: bool
    push_notifications: bool
    marketing_emails: bool
    last_active_at: Optional[datetime] = None
    login_count: int
    posts_count: int
    comments_count: int
    likes_received: int
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None
    email_verified_at: Optional[datetime] = None
    phone_verified_at: Optional[datetime] = None

    # Computed fields
    full_name: Optional[str] = None
    formatted_member_id: Optional[str] = None

    class Config:
        from_attributes = True


class UserPublic(BaseModel):
    """Schema for public user information."""

    id: UUID
    member_id: str
    nickname: str
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    is_profile_public: bool
    show_age_range: bool
    created_at: datetime
    last_active_at: Optional[datetime] = None

    # Computed fields
    full_name: Optional[str] = None
    formatted_member_id: Optional[str] = None

    class Config:
        from_attributes = True


class UserPreferenceCreate(BaseModel):
    """Schema for creating user preferences."""

    preference_key: str = Field(..., max_length=100)
    preference_value: Optional[str] = None


class UserPreferenceUpdate(BaseModel):
    """Schema for updating user preferences."""

    preference_value: Optional[str] = None


class UserPreferenceResponse(BaseModel):
    """Schema for user preference response."""

    id: int
    preference_key: str
    preference_value: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NameDisplayOrderResponse(BaseModel):
    """Schema for name display order response."""

    id: int
    order_code: str
    display_name: str
    format_template: str
    description: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class LocaleNameFormatResponse(BaseModel):
    """Schema for locale name format response."""

    id: int
    locale: str
    default_order_code: str
    is_active: bool

    class Config:
        from_attributes = True
