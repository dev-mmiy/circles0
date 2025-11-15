"""
Post schemas for API request/response validation.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PostBase(BaseModel):
    """Base post schema with common fields."""

    content: str = Field(..., min_length=1, max_length=5000)
    visibility: str = Field(
        default="public", pattern="^(public|followers_only|private)$"
    )


class PostImageResponse(BaseModel):
    """Schema for post image responses."""

    id: UUID
    image_url: str
    display_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PostCreate(PostBase):
    """Schema for creating a new post."""

    image_urls: Optional[List[str]] = Field(
        default=None,
        max_length=5,
        description="List of image URLs (max 5 images)",
        min_length=0,
    )


class PostUpdate(BaseModel):
    """Schema for updating a post."""

    content: Optional[str] = Field(None, min_length=1, max_length=5000)
    visibility: Optional[str] = Field(
        None, pattern="^(public|followers_only|private)$"
    )
    is_active: Optional[bool] = None


class PostAuthor(BaseModel):
    """Minimal user information for post author."""

    id: UUID
    nickname: str
    username: Optional[str]
    avatar_url: Optional[str]

    model_config = {"from_attributes": True}


class PostResponse(PostBase):
    """Schema for post responses."""

    id: UUID
    user_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    author: Optional[PostAuthor] = None
    like_count: int = 0
    comment_count: int = 0
    is_liked_by_current_user: bool = False

    model_config = {"from_attributes": True}


class PostLikeCreate(BaseModel):
    """Schema for creating a post like."""

    reaction_type: str = Field(
        default="like", pattern="^(like|support|empathy)$"
    )


class PostLikeResponse(BaseModel):
    """Schema for post like responses."""

    id: int
    post_id: UUID
    user_id: UUID
    reaction_type: str
    created_at: datetime
    user: Optional[PostAuthor] = None

    model_config = {"from_attributes": True}


class PostCommentBase(BaseModel):
    """Base comment schema with common fields."""

    content: str = Field(..., min_length=1, max_length=2000)


class PostCommentCreate(PostCommentBase):
    """Schema for creating a comment."""

    parent_comment_id: Optional[UUID] = None


class PostCommentUpdate(BaseModel):
    """Schema for updating a comment."""

    content: Optional[str] = Field(None, min_length=1, max_length=2000)
    is_active: Optional[bool] = None


class PostCommentResponse(PostCommentBase):
    """Schema for comment responses."""

    id: UUID
    post_id: UUID
    user_id: UUID
    parent_comment_id: Optional[UUID]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    author: Optional[PostAuthor] = None
    reply_count: int = 0

    model_config = {"from_attributes": True}


class HashtagResponse(BaseModel):
    """Schema for hashtag responses."""

    id: UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MentionResponse(BaseModel):
    """Schema for mention responses."""

    id: UUID
    nickname: str
    username: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class PostResponse(PostBase):
    """Schema for post responses."""

    id: UUID
    user_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    author: Optional[PostAuthor] = None
    like_count: int = 0
    comment_count: int = 0
    is_liked_by_current_user: bool = False
    hashtags: List[HashtagResponse] = []
    mentions: List[MentionResponse] = []
    images: List[PostImageResponse] = []

    model_config = {"from_attributes": True}


class PostDetailResponse(PostResponse):
    """Extended post response with comments."""

    comments: List[PostCommentResponse] = []
    likes: List[PostLikeResponse] = []

    model_config = {"from_attributes": True}
