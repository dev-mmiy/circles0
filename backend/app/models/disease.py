"""
Disease-related SQLAlchemy models.
"""

from datetime import datetime
from typing import Optional

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
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
# from app.models.auth import User  # Temporarily disabled to avoid conflicts


class Disease(Base):
    """Disease master table."""

    __tablename__ = "diseases"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic information
    name = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text)
    category = Column(String(50))  # e.g., "cardiovascular", "neurological", "autoimmune"
    
    # Internationalization
    name_ja = Column(String(100))  # Japanese name
    description_ja = Column(Text)  # Japanese description
    
    # Status and metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(
        DateTime, 
        default=func.current_timestamp(), 
        onupdate=func.current_timestamp()
    )

    # Relationships
    user_diseases = relationship("UserDisease", back_populates="disease")
    posts = relationship("Post", back_populates="disease")


class UserDisease(Base):
    """User-disease relationship table."""

    __tablename__ = "user_diseases"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    disease_id = Column(Integer, ForeignKey("diseases.id"), nullable=False)
    
    # Disease-specific information
    diagnosis_date = Column(DateTime)
    severity = Column(String(20))  # e.g., "mild", "moderate", "severe"
    notes = Column(Text)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(
        DateTime, 
        default=func.current_timestamp(), 
        onupdate=func.current_timestamp()
    )

    # Constraints
    __table_args__ = (UniqueConstraint("user_id", "disease_id"),)

    # Relationships
    user = relationship("User", back_populates="user_diseases")
    disease = relationship("Disease", back_populates="user_diseases")


class Post(Base):
    """Community posts table."""

    __tablename__ = "posts"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Content
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    
    # Foreign keys
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    disease_id = Column(Integer, ForeignKey("diseases.id"), nullable=True)
    
    # Status and visibility
    is_published = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    
    # Engagement metrics
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    views_count = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(
        DateTime, 
        default=func.current_timestamp(), 
        onupdate=func.current_timestamp()
    )

    # Relationships
    author = relationship("User", back_populates="posts")
    disease = relationship("Disease", back_populates="posts")


class PostLike(Base):
    """Post likes table."""

    __tablename__ = "post_likes"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    
    # Metadata
    created_at = Column(DateTime, default=func.current_timestamp())

    # Constraints
    __table_args__ = (UniqueConstraint("user_id", "post_id"),)

    # Relationships
    user = relationship("User")
    post = relationship("Post")


class PostComment(Base):
    """Post comments table."""

    __tablename__ = "post_comments"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Content
    content = Column(Text, nullable=False)
    
    # Foreign keys
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    parent_comment_id = Column(Integer, ForeignKey("post_comments.id"), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(
        DateTime, 
        default=func.current_timestamp(), 
        onupdate=func.current_timestamp()
    )

    # Relationships
    user = relationship("User")
    post = relationship("Post")
    parent_comment = relationship("PostComment", remote_side=[id])
    replies = relationship("PostComment", back_populates="parent_comment")

