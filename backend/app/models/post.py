"""
Post models for community posts, likes, and comments.
"""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import relationship

from app.database import Base


class Post(Base):
    """
    Community post model.

    Posts can be created by users to share experiences, ask questions,
    or provide support to the community.
    """

    __tablename__ = "posts"

    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content = Column(Text, nullable=False)
    visibility = Column(
        String(20),
        nullable=False,
        default="public",
        comment="public, followers_only, private",
    )
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    user = relationship("User", back_populates="posts")
    likes = relationship(
        "PostLike", back_populates="post", cascade="all, delete-orphan"
    )
    comments = relationship(
        "PostComment", back_populates="post", cascade="all, delete-orphan"
    )
    hashtags = relationship(
        "PostHashtag", back_populates="post", cascade="all, delete-orphan"
    )
    mentions = relationship(
        "PostMention", back_populates="post", cascade="all, delete-orphan"
    )
    images = relationship(
        "PostImage",
        back_populates="post",
        cascade="all, delete-orphan",
        order_by="PostImage.display_order",
    )


class PostLike(Base):
    """
    Post like/reaction model.

    Tracks which users have liked which posts.
    Supports different reaction types.
    """

    __tablename__ = "post_likes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    post_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reaction_type = Column(
        String(20),
        nullable=False,
        default="like",
        comment="like, support, empathy",
    )
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    post = relationship("Post", back_populates="likes")
    user = relationship("User", back_populates="post_likes")

    # Ensure one user can only like a post once
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_post_user_like"),)


class PostComment(Base):
    """
    Post comment model.

    Comments on posts. Supports nested comments (replies).
    """

    __tablename__ = "post_comments"

    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    post_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parent_comment_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("post_comments.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="For nested replies",
    )
    content = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    post = relationship("Post", back_populates="comments")
    user = relationship("User", back_populates="post_comments")
    parent_comment = relationship(
        "PostComment", remote_side=[id], back_populates="replies"
    )
    replies = relationship(
        "PostComment",
        back_populates="parent_comment",
        cascade="all, delete-orphan",
    )


class PostImage(Base):
    """
    Post image model.

    Stores image URLs for posts. Supports multiple images per post.
    """

    __tablename__ = "post_images"

    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    post_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    image_url = Column(String(500), nullable=False, comment="URL to the image file")
    display_order = Column(
        Integer, nullable=False, default=0, comment="Order for displaying images"
    )
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    post = relationship("Post", back_populates="images")
