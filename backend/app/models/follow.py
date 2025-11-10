"""
Follow/Follower relationship models.
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import relationship

from app.database import Base


class Follow(Base):
    """
    Follow relationship between users.

    A follow relationship represents one user following another.
    - follower_id: The user who is following
    - following_id: The user being followed
    """

    __tablename__ = "follows"

    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    follower_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="User who is following",
    )
    following_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="User being followed",
    )
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    follower = relationship(
        "User",
        foreign_keys=[follower_id],
        back_populates="following_relationships",
    )
    following = relationship(
        "User",
        foreign_keys=[following_id],
        back_populates="follower_relationships",
    )

    # Unique constraint: One user can only follow another user once
    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_follower_following"),
    )

    def __repr__(self):
        return f"<Follow {self.follower_id} -> {self.following_id}>"
