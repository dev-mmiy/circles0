"""
Pydantic schemas for Web Push subscriptions.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer


class PushSubscriptionKeys(BaseModel):
    """Keys from PushSubscription.getKey() in the browser."""

    p256dh: str = Field(..., description="ECDH public key")
    auth: str = Field(..., description="Authentication secret")


class PushSubscriptionCreate(BaseModel):
    """Schema for creating a new push subscription."""

    endpoint: str = Field(..., description="Push service endpoint URL")
    keys: PushSubscriptionKeys = Field(..., description="Encryption keys")
    user_agent: Optional[str] = Field(None, description="Browser user agent")

    class Config:
        json_schema_extra = {
            "example": {
                "endpoint": "https://fcm.googleapis.com/fcm/send/...",
                "keys": {
                    "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz...",
                    "auth": "tBHItJI5svbpez7KI4CCXg==",
                },
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...",
            }
        }


class PushSubscriptionResponse(BaseModel):
    """Schema for push subscription response."""

    id: UUID
    user_id: UUID
    endpoint: str
    created_at: datetime
    last_used_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @field_serializer("created_at", "last_used_at", when_used="json")
    def serialize_datetime(self, value: datetime, _info) -> str:
        """Serialize datetime to ISO format with 'Z' suffix."""
        if value is None:
            return None
        if value.tzinfo is None:
            return value.isoformat() + "Z"
        else:
            utc_value = value.astimezone(timezone.utc)
            return utc_value.replace(tzinfo=None).isoformat() + "Z"


class PushSubscriptionStatus(BaseModel):
    """Schema for push subscription status check."""

    is_subscribed: bool
    subscription_id: Optional[UUID] = None
    endpoint: Optional[str] = None


class VAPIDPublicKeyResponse(BaseModel):
    """Schema for VAPID public key response."""

    public_key: str = Field(..., description="VAPID public key for push subscription")


class PushNotificationPayload(BaseModel):
    """Schema for push notification payload."""

    title: str = Field(..., description="Notification title")
    body: str = Field(..., description="Notification body")
    icon: Optional[str] = Field(None, description="URL to notification icon")
    badge: Optional[str] = Field(None, description="URL to badge icon")
    url: Optional[str] = Field(None, description="URL to open when notification is clicked")
    tag: Optional[str] = Field(None, description="Notification tag for grouping")
    data: Optional[dict] = Field(None, description="Additional data to include")

    class Config:
        json_schema_extra = {
            "example": {
                "title": "New message",
                "body": "You have a new message from John",
                "icon": "/icons/notification.png",
                "url": "/messages/123",
                "tag": "message-123",
            }
        }
