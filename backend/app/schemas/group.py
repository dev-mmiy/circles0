"""
Group schemas for API request/response validation.
"""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer


class GroupCreate(BaseModel):
    """Schema for creating a new group."""

    name: str = Field(..., min_length=1, max_length=255, description="Group name")
    description: Optional[str] = Field(
        None, max_length=5000, description="Group description"
    )
    member_ids: List[UUID] = Field(
        default_factory=list,
        description="Initial member IDs (excluding creator)",
    )


class GroupUpdate(BaseModel):
    """Schema for updating a group."""

    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Group name")
    description: Optional[str] = Field(
        None, max_length=5000, description="Group description"
    )
    avatar_url: Optional[str] = Field(
        None, max_length=500, description="URL of the group avatar image"
    )


class GroupMemberInfo(BaseModel):
    """Minimal user information for group member."""

    id: UUID
    nickname: str
    username: Optional[str]
    avatar_url: Optional[str]

    model_config = {"from_attributes": True}


class GroupMemberResponse(BaseModel):
    """Schema for group member responses."""

    id: UUID
    group_id: UUID
    user_id: UUID
    is_admin: bool
    joined_at: datetime
    left_at: Optional[datetime]
    user: Optional[GroupMemberInfo] = None

    model_config = {"from_attributes": True}

    @field_serializer("joined_at", "left_at", when_used="json")
    def serialize_datetime(self, value: datetime, _info) -> str:
        """Serialize datetime to ISO format with 'Z' suffix."""
        if value is None:
            return None
        if value.tzinfo is None:
            return value.isoformat() + "Z"
        else:
            utc_value = value.astimezone(timezone.utc)
            return utc_value.replace(tzinfo=None).isoformat() + "Z"


class GroupCreatorInfo(BaseModel):
    """Minimal user information for group creator."""

    id: UUID
    nickname: str
    username: Optional[str]
    avatar_url: Optional[str]

    model_config = {"from_attributes": True}


class GroupMessageSender(BaseModel):
    """Minimal user information for group message sender."""

    id: UUID
    nickname: str
    username: Optional[str]
    avatar_url: Optional[str]

    model_config = {"from_attributes": True}


class GroupMessageReactionCreate(BaseModel):
    """Schema for creating a group message reaction."""

    reaction_type: str = Field(
        default="like",
        pattern="^(like|love|haha|wow|sad|angry|thumbs_up|thumbs_down|clap|fire|party|pray|heart_eyes|kiss|thinking|cool|ok_hand|victory|muscle|point_up|point_down|wave|handshake|fist_bump|rocket|star|trophy|medal|crown|gem|balloon|cake|gift|confetti|sparkles|rainbow)$",
        description="Type of reaction (36 types available)"
    )


class GroupMessageReactionResponse(BaseModel):
    """Schema for group message reaction responses."""

    id: UUID
    message_id: UUID
    user_id: UUID
    reaction_type: str
    created_at: datetime
    user: Optional[GroupMessageSender] = None

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


class GroupMessageResponse(BaseModel):
    """Schema for group message responses."""

    id: UUID
    group_id: UUID
    sender_id: UUID
    content: str
    image_url: Optional[str]
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    sender: Optional[GroupMessageSender] = None
    is_read: bool = False
    read_at: Optional[datetime] = None
    reactions: Optional[List["GroupMessageReactionResponse"]] = None

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


class GroupResponse(BaseModel):
    """Schema for group responses."""

    id: UUID
    name: str
    description: Optional[str]
    avatar_url: Optional[str] = None
    creator_id: Optional[UUID]
    last_message_at: Optional[datetime]
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    creator: Optional[GroupCreatorInfo] = None
    members: List[GroupMemberResponse] = []
    member_count: int = 0
    last_message: Optional[GroupMessageResponse] = None
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


class GroupListResponse(BaseModel):
    """Schema for group list responses."""

    groups: List[GroupResponse]
    total: int
    skip: int
    limit: int


class GroupMessageCreate(BaseModel):
    """Schema for creating a new group message."""

    content: str = Field(
        ..., min_length=1, max_length=5000, description="Message text content"
    )
    image_url: Optional[str] = Field(
        None, max_length=500, description="URL of an image attached to the message"
    )


class GroupMessageListResponse(BaseModel):
    """Schema for group message list responses."""

    messages: List[GroupMessageResponse]
    total: int
    skip: int
    limit: int
    group_id: UUID


class AddMemberRequest(BaseModel):
    """Schema for adding members to a group."""

    user_ids: List[UUID] = Field(
        ..., min_items=1, description="User IDs to add to the group"
    )


class UpdateMemberRoleRequest(BaseModel):
    """Schema for updating a member's role."""

    is_admin: bool = Field(..., description="Whether user should be an admin")


class MarkGroupMessagesReadRequest(BaseModel):
    """Schema for marking group messages as read."""

    message_ids: Optional[List[UUID]] = Field(
        None,
        description="Specific message IDs to mark as read. If None, marks all unread messages in the group.",
    )


class MarkGroupMessagesReadResponse(BaseModel):
    """Schema for mark read response."""

    marked_count: int
    message_ids: List[UUID]



