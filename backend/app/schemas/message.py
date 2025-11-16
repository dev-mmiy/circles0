"""
Message schemas for API request/response validation.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    """Schema for creating a new message."""

    recipient_id: UUID = Field(..., description="ID of the message recipient")
    content: str = Field(
        ..., min_length=1, max_length=5000, description="Message text content"
    )
    image_url: Optional[str] = Field(
        None, max_length=500, description="URL of an image attached to the message"
    )


class MessageSender(BaseModel):
    """Minimal user information for message sender."""

    id: UUID
    nickname: str
    username: Optional[str]
    avatar_url: Optional[str]

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    """Schema for message responses."""

    id: UUID
    conversation_id: UUID
    sender_id: UUID
    content: str
    image_url: Optional[str]
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    sender: Optional[MessageSender] = None
    is_read: bool = False
    read_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ConversationParticipant(BaseModel):
    """Minimal user information for conversation participant."""

    id: UUID
    nickname: str
    username: Optional[str]
    avatar_url: Optional[str]

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    """Schema for conversation responses."""

    id: UUID
    user1_id: UUID
    user2_id: UUID
    last_message_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    other_user: Optional[ConversationParticipant] = None
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0

    model_config = {"from_attributes": True}


class ConversationListResponse(BaseModel):
    """Schema for conversation list responses."""

    conversations: List[ConversationResponse]
    total: int
    skip: int
    limit: int


class MessageListResponse(BaseModel):
    """Schema for message list responses."""

    messages: List[MessageResponse]
    total: int
    skip: int
    limit: int
    conversation_id: UUID


class MarkReadRequest(BaseModel):
    """Schema for marking messages as read."""

    message_ids: Optional[List[UUID]] = Field(
        None,
        description="Specific message IDs to mark as read. If None, marks all unread messages in the conversation.",
    )


class MarkReadResponse(BaseModel):
    """Schema for mark read response."""

    marked_count: int
    message_ids: List[UUID]
