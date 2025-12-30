"""
Pydantic schemas for weight records.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer


class WeightRecordBase(BaseModel):
    """Base schema for weight records."""

    recorded_at: datetime = Field(..., description="When the measurement was taken")
    value: float = Field(..., ge=0.0, le=500.0, description="Weight value")
    unit: str = Field(
        default="kg",
        pattern="^(kg|lb)$",
        description="Unit: 'kg' or 'lb'",
    )
    visibility: str = Field(
        default="public",
        pattern="^(public|followers_only|private)$",
        description="Visibility setting",
    )
    notes: Optional[str] = Field(None, max_length=5000, description="Optional notes")


class WeightRecordCreate(WeightRecordBase):
    """Schema for creating a weight record."""

    pass


class WeightRecordUpdate(BaseModel):
    """Schema for updating a weight record."""

    recorded_at: Optional[datetime] = None
    value: Optional[float] = Field(None, ge=0.0, le=500.0)
    unit: Optional[str] = Field(None, pattern="^(kg|lb)$")
    visibility: Optional[str] = Field(None, pattern="^(public|followers_only|private)$")
    notes: Optional[str] = Field(None, max_length=5000)


class WeightRecordResponse(WeightRecordBase):
    """Schema for weight record responses."""

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

