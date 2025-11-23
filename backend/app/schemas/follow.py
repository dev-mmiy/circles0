"""
Pydantic schemas for Follow/Follower relationships.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_serializer

# ========== Follow Schemas ==========


class FollowBase(BaseModel):
    """Base schema for follow relationship."""

    pass


class FollowCreate(FollowBase):
    """Schema for creating a follow relationship."""

    following_id: UUID


class FollowResponse(FollowBase):
    """Schema for follow relationship response."""

    id: UUID
    follower_id: UUID
    following_id: UUID
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", when_used="json")
    def serialize_datetime(self, value: datetime, _info) -> str:
        """Serialize datetime to ISO format with 'Z' suffix."""
        if value.tzinfo is None:
            return value.isoformat() + "Z"
        else:
            utc_value = value.astimezone(timezone.utc)
            return utc_value.replace(tzinfo=None).isoformat() + "Z"


# ========== User Summary for Follow Lists ==========


class UserFollowSummary(BaseModel):
    """
    Minimal user information for follow lists.
    Used to display followers and following lists.
    """

    id: UUID
    member_id: str
    nickname: str
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FollowWithUser(FollowResponse):
    """Follow relationship with user information."""

    user: Optional[UserFollowSummary] = None


class FollowerResponse(BaseModel):
    """Response for a follower with their information."""

    id: UUID
    follower_id: UUID
    created_at: datetime
    follower: Optional[UserFollowSummary] = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", when_used="json")
    def serialize_datetime(self, value: datetime, _info) -> str:
        """Serialize datetime to ISO format with 'Z' suffix."""
        if value.tzinfo is None:
            return value.isoformat() + "Z"
        else:
            utc_value = value.astimezone(timezone.utc)
            return utc_value.replace(tzinfo=None).isoformat() + "Z"


class FollowingResponse(BaseModel):
    """Response for a following relationship with user information."""

    id: UUID
    following_id: UUID
    created_at: datetime
    following: Optional[UserFollowSummary] = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", when_used="json")
    def serialize_datetime(self, value: datetime, _info) -> str:
        """Serialize datetime to ISO format with 'Z' suffix."""
        if value.tzinfo is None:
            return value.isoformat() + "Z"
        else:
            utc_value = value.astimezone(timezone.utc)
            return utc_value.replace(tzinfo=None).isoformat() + "Z"


# ========== Follow Statistics ==========


class FollowStats(BaseModel):
    """Statistics about a user's followers and following."""

    follower_count: int
    following_count: int
    is_following: bool = False  # Whether the current user follows this user
    is_followed_by: bool = False  # Whether this user follows the current user
