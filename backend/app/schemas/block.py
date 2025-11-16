"""
Block schema definitions for API requests and responses.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class BlockResponse(BaseModel):
    """Response schema for block relationship."""

    id: UUID
    blocker_id: UUID
    blocked_id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class BlockedUserSummary(BaseModel):
    """Summary of a blocked user."""

    id: UUID
    member_id: str
    nickname: str
    avatar_url: str | None = None
    blocked_at: datetime

    class Config:
        from_attributes = True


class BlockStats(BaseModel):
    """Statistics about blocking relationships."""

    blocked_count: int = Field(..., description="Number of users blocked by this user")
