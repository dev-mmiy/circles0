"""
Block schema definitions for API requests and responses.
"""

from datetime import datetime, timezone
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer


class BlockResponse(BaseModel):
    """Response schema for block relationship."""

    id: UUID
    blocker_id: UUID
    blocked_id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

    @field_serializer("created_at", when_used="json")
    def serialize_datetime(self, value: datetime, _info) -> str:
        """Serialize datetime to ISO format with 'Z' suffix."""
        if value.tzinfo is None:
            return value.isoformat() + "Z"
        else:
            utc_value = value.astimezone(timezone.utc)
            return utc_value.replace(tzinfo=None).isoformat() + "Z"


class BlockedUserSummary(BaseModel):
    """Summary of a blocked user."""

    id: UUID
    member_id: str
    nickname: str
    avatar_url: str | None = None
    blocked_at: datetime

    class Config:
        from_attributes = True

    @field_serializer("blocked_at", when_used="json")
    def serialize_datetime(self, value: datetime, _info) -> str:
        """Serialize datetime to ISO format with 'Z' suffix."""
        if value.tzinfo is None:
            return value.isoformat() + "Z"
        else:
            utc_value = value.astimezone(timezone.utc)
            return utc_value.replace(tzinfo=None).isoformat() + "Z"


class BlockStats(BaseModel):
    """Statistics about blocking relationships."""

    blocked_count: int = Field(..., description="Number of users blocked by this user")


