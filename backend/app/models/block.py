"""
User blocking models for privacy control.
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import relationship

from app.database import Base


class Block(Base):
    """
    Block relationship between users.

    A block relationship represents one user blocking another.
    - blocker_id: The user who is blocking
    - blocked_id: The user being blocked

    When a user blocks another user:
    - The blocked user cannot see the blocker's profile
    - The blocked user cannot follow the blocker
    - The blocked user cannot send messages to the blocker
    - The blocker will not see the blocked user's posts/comments
    """

    __tablename__ = "blocks"

    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    blocker_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="User who is blocking",
    )
    blocked_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="User being blocked",
    )
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    blocker = relationship(
        "User",
        foreign_keys=[blocker_id],
        back_populates="blocking_relationships",
    )
    blocked = relationship(
        "User",
        foreign_keys=[blocked_id],
        back_populates="blocked_relationships",
    )

    # Unique constraint: One user can only block another user once
    __table_args__ = (
        UniqueConstraint("blocker_id", "blocked_id", name="uq_blocker_blocked"),
    )

    def __repr__(self):
        return f"<Block {self.blocker_id} -> {self.blocked_id}>"
