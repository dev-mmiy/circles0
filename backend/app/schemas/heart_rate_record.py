"""
Pydantic schemas for heart rate records.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer


class HeartRateRecordBase(BaseModel):
    """Base schema for heart rate records."""

    recorded_at: datetime = Field(..., description="When the measurement was taken")
    bpm: int = Field(..., ge=0, le=300, description="Heart rate (beats per minute)")
    visibility: str = Field(
        default="public",
        pattern="^(public|followers_only|private)$",
        description="Visibility setting",
    )
    notes: Optional[str] = Field(None, max_length=5000, description="Optional notes")


class HeartRateRecordCreate(HeartRateRecordBase):
    """Schema for creating a heart rate record."""

    pass


class HeartRateRecordUpdate(BaseModel):
    """Schema for updating a heart rate record."""

    recorded_at: Optional[datetime] = None
    bpm: Optional[int] = Field(None, ge=0, le=300)
    visibility: Optional[str] = Field(None, pattern="^(public|followers_only|private)$")
    notes: Optional[str] = Field(None, max_length=5000)


class HeartRateRecordResponse(HeartRateRecordBase):
    """Schema for heart rate record responses."""

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

