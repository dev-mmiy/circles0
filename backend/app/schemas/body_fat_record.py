"""
Pydantic schemas for body fat percentage records.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer


class BodyFatRecordBase(BaseModel):
    """Base schema for body fat percentage records."""

    recorded_at: datetime = Field(..., description="When the measurement was taken")
    percentage: float = Field(..., ge=0.0, le=100.0, description="Body fat percentage (%)")
    visibility: str = Field(
        default="public",
        pattern="^(public|followers_only|private)$",
        description="Visibility setting",
    )
    notes: Optional[str] = Field(None, max_length=5000, description="Optional notes")


class BodyFatRecordCreate(BodyFatRecordBase):
    """Schema for creating a body fat percentage record."""

    pass


class BodyFatRecordUpdate(BaseModel):
    """Schema for updating a body fat percentage record."""

    recorded_at: Optional[datetime] = None
    percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    visibility: Optional[str] = Field(None, pattern="^(public|followers_only|private)$")
    notes: Optional[str] = Field(None, max_length=5000)


class BodyFatRecordResponse(BodyFatRecordBase):
    """Schema for body fat percentage record responses."""

    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("created_at", "updated_at", "recorded_at", when_used="json")
    def serialize_datetime(self, value: datetime, _info) -> str:
        """Serialize datetime to ISO format with 'Z' suffix."""
        if value.tzinfo is None:
            return value.isoformat() + "Z"
        else:
            utc_value = value.astimezone(timezone.utc)
            return utc_value.replace(tzinfo=None).isoformat() + "Z"

