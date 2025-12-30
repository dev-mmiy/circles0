"""
Pydantic schemas for SpO2 records.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer


class SpO2RecordBase(BaseModel):
    """Base schema for SpO2 records."""

    recorded_at: datetime = Field(..., description="When the measurement was taken")
    percentage: float = Field(..., ge=0.0, le=100.0, description="Blood oxygen saturation (%)")
    visibility: str = Field(
        default="public",
        pattern="^(public|followers_only|private)$",
        description="Visibility setting",
    )
    notes: Optional[str] = Field(None, max_length=5000, description="Optional notes")


class SpO2RecordCreate(SpO2RecordBase):
    """Schema for creating a SpO2 record."""

    pass


class SpO2RecordUpdate(BaseModel):
    """Schema for updating a SpO2 record."""

    recorded_at: Optional[datetime] = None
    percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    visibility: Optional[str] = Field(None, pattern="^(public|followers_only|private)$")
    notes: Optional[str] = Field(None, max_length=5000)


class SpO2RecordResponse(SpO2RecordBase):
    """Schema for SpO2 record responses."""

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

