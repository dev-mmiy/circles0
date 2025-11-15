"""
Notification model for user notifications.
"""

from datetime import datetime
from enum import Enum
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, Enum as SQLEnum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import relationship

from app.database import Base


class NotificationType(str, Enum):
    """Types of notifications."""

    FOLLOW = "follow"  # Someone followed you
    COMMENT = "comment"  # Someone commented on your post
    REPLY = "reply"  # Someone replied to your comment
    LIKE = "like"  # Someone liked your post
    COMMENT_LIKE = "comment_like"  # Someone liked your comment


class Notification(Base):
    """Notification model."""

    __tablename__ = "notifications"

    id = Column(
        PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4, index=True
    )
    recipient_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actor_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    type = Column(
        SQLEnum(NotificationType, create_type=False, native_enum=False),
        nullable=False,
        index=True,
    )

    # Target references (nullable, depends on notification type)
    post_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=True,
    )
    comment_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("post_comments.id", ondelete="CASCADE"),
        nullable=True,
    )

    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    recipient = relationship(
        "User", foreign_keys=[recipient_id], back_populates="notifications_received"
    )
    actor = relationship("User", foreign_keys=[actor_id])
    post = relationship("Post", foreign_keys=[post_id])
    comment = relationship("PostComment", foreign_keys=[comment_id])

    def __repr__(self):
        return f"<Notification {self.type} from {self.actor_id} to {self.recipient_id}>"
