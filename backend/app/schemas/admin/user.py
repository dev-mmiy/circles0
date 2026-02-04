"""
Admin user schemas for list, detail, update, status, delete.
"""

from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class AdminUserStats(BaseModel):
    posts_count: int = 0
    followers_count: int = 0
    following_count: int = 0
    comments_count: Optional[int] = None
    vital_records_count: Optional[int] = None
    meal_records_count: Optional[int] = None


class AdminUserListItem(BaseModel):
    id: UUID
    member_id: str
    email: str
    nickname: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool
    email_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    stats: AdminUserStats = Field(default_factory=AdminUserStats)


class AdminUserListResponse(BaseModel):
    items: list[AdminUserListItem]
    total: int
    page: int
    per_page: int
    total_pages: int


class AdminUserDetail(BaseModel):
    id: UUID
    member_id: str
    email: str
    nickname: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    is_active: bool
    email_verified: bool
    profile_visibility: Optional[str] = None
    preferred_language: str
    timezone: str
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    stats: AdminUserStats = Field(default_factory=AdminUserStats)


class AdminUserUpdate(BaseModel):
    """Update schema for user profile. is_active is excluded; use PATCH /status for audited changes."""

    email: Optional[EmailStr] = None
    nickname: Optional[str] = Field(None, min_length=1, max_length=50)
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    bio: Optional[str] = None
    email_verified: Optional[bool] = None


class AdminUserStatusUpdate(BaseModel):
    is_active: bool
    reason: Optional[str] = None


class AdminUserDeleteBody(BaseModel):
    reason: Optional[str] = None
