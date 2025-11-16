"""
Push subscription model for Web Push API.
"""

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import relationship

from app.database import Base


class PushSubscription(Base):
    """
    Push subscription model for storing Web Push API subscriptions.

    Each subscription represents a browser/device that has granted
    permission to receive push notifications.
    """

    __tablename__ = "push_subscriptions"

    id = Column(
        PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4, index=True
    )
    user_id = Column(
        PostgreSQLUUID(as_uuid=True),
        nullable=False,
        index=True,
    )  # Foreign key to users table (no FK constraint for flexibility)

    # Push subscription endpoint (unique per browser/device)
    endpoint = Column(String(500), nullable=False, unique=True, index=True)

    # VAPID keys (public key and auth secret)
    p256dh = Column(Text, nullable=False)  # Public key
    auth = Column(Text, nullable=False)  # Auth secret

    # Additional subscription metadata (optional)
    user_agent = Column(String(500), nullable=True)  # Browser user agent
    device_info = Column(JSON, nullable=True)  # Device information (optional)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    last_used_at = Column(
        DateTime(timezone=True), nullable=True
    )  # Last successful push

    def __repr__(self) -> str:
        return f"<PushSubscription(id={self.id}, user_id={self.user_id}, endpoint={self.endpoint[:50]}...)>"
