"""
Message schemas for API request/response validation.
"""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer


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
    reactions: Optional[List["MessageReactionResponse"]] = None

    model_config = {"from_attributes": True}

    @field_serializer("created_at", "updated_at", "read_at", when_used="json")
    def serialize_datetime(self, value: datetime, _info) -> str:
        """Serialize datetime to ISO format with 'Z' suffix."""
        if value is None:
            return None
        if value.tzinfo is None:
            return value.isoformat() + "Z"
        else:
            utc_value = value.astimezone(timezone.utc)
            return utc_value.replace(tzinfo=None).isoformat() + "Z"


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

    @field_serializer("last_message_at", "created_at", "updated_at", when_used="json")
    def serialize_datetime(self, value: datetime, _info) -> str:
        """Serialize datetime to ISO format with 'Z' suffix."""
        if value is None:
            return None
        if value.tzinfo is None:
            return value.isoformat() + "Z"
        else:
            utc_value = value.astimezone(timezone.utc)
            return utc_value.replace(tzinfo=None).isoformat() + "Z"


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


class ConversationCreate(BaseModel):
    """Schema for creating a new conversation."""

    recipient_id: UUID = Field(..., description="ID of the conversation recipient")


class MessageReactionCreate(BaseModel):
    """Schema for creating a message reaction."""

    reaction_type: str = Field(
        default="like",
        pattern="^(like|love|haha|wow|sad|angry|thumbs_up|thumbs_down|clap|fire|party|pray|heart_eyes|kiss|thinking|cool|ok_hand|victory|muscle|point_up|point_down|wave|handshake|fist_bump|rocket|star|trophy|medal|crown|gem|balloon|cake|gift|confetti|sparkles|rainbow)$",
        description="Type of reaction (36 types available)"
    )


class MessageReactionResponse(BaseModel):
    """Schema for message reaction responses."""

    id: UUID
    message_id: UUID
    user_id: UUID
    reaction_type: str
    created_at: datetime
    user: Optional[MessageSender] = None

    model_config = {"from_attributes": True}

    @field_serializer("created_at", when_used="json")
    def serialize_datetime(self, value: datetime, _info) -> str:
        """Serialize datetime to ISO format with 'Z' suffix."""
        if value is None:
            return None
        if value.tzinfo is None:
            return value.isoformat() + "Z"
        else:
            utc_value = value.astimezone(timezone.utc)
            return utc_value.replace(tzinfo=None).isoformat() + "Z"

