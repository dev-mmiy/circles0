"""
Pydantic schemas for notifications.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_serializer

from app.models.notification import NotificationType


class NotificationBase(BaseModel):
    """Base notification schema."""

    pass


class NotificationCreate(NotificationBase):
    """Schema for creating a notification."""

    recipient_id: UUID
    actor_id: UUID
    type: NotificationType
    post_id: Optional[UUID] = None
    comment_id: Optional[UUID] = None


class UserSummary(BaseModel):
    """Summary of user information for notifications."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    member_id: str
    nickname: str
    username: Optional[str] = None
    avatar_url: Optional[str] = None


class PostSummary(BaseModel):
    """Summary of post information for notifications."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    content: str  # Truncated content for preview


class CommentSummary(BaseModel):
    """Summary of comment information for notifications."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    content: str  # Truncated content for preview
    post_id: UUID


class NotificationResponse(NotificationBase):
    """Schema for notification response."""

    id: UUID
    recipient_id: UUID
    actor_id: UUID
    type: NotificationType
    post_id: Optional[UUID] = None
    comment_id: Optional[UUID] = None
    is_read: bool
    created_at: datetime

    # Related data
    actor: Optional[UserSummary] = None
    post: Optional[PostSummary] = None
    comment: Optional[CommentSummary] = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", when_used="json")
    def serialize_datetime(self, value: datetime, _info) -> str:
        """Serialize datetime to ISO format with 'Z' suffix."""
        if value.tzinfo is None:
            return value.isoformat() + "Z"
        else:
            utc_value = value.astimezone(timezone.utc)
            return utc_value.replace(tzinfo=None).isoformat() + "Z"


class NotificationListResponse(BaseModel):
    """Schema for paginated notification list."""

    notifications: list[NotificationResponse]
    total: int
    unread_count: int


class UnreadCountResponse(BaseModel):
    """Schema for unread notification count."""

    unread_count: int
