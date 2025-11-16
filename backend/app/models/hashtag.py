"""
Hashtag models for post hashtags.
"""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import relationship

from app.database import Base


class Hashtag(Base):
    """
    Hashtag model.

    Stores unique hashtags used in posts.
    """

    __tablename__ = "hashtags"

    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(100), nullable=False, unique=True, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    post_hashtags = relationship(
        "PostHashtag", back_populates="hashtag", cascade="all, delete-orphan"
    )


class PostHashtag(Base):
    """
    Post-Hashtag association model.

    Many-to-many relationship between posts and hashtags.
    """

    __tablename__ = "post_hashtags"

    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    post_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    hashtag_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("hashtags.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    post = relationship("Post", back_populates="hashtags")
    hashtag = relationship("Hashtag", back_populates="post_hashtags")

    # Ensure one post can only have one instance of each hashtag
    __table_args__ = (
        UniqueConstraint("post_id", "hashtag_id", name="uq_post_hashtag"),
    )
