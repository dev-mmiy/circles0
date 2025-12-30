"""
Pydantic schemas for blood glucose records.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer


class BloodGlucoseRecordBase(BaseModel):
    """Base schema for blood glucose records."""

    recorded_at: datetime = Field(..., description="When the measurement was taken")
    value: int = Field(..., ge=0, le=1000, description="Blood glucose level (mg/dL)")
    timing: Optional[str] = Field(
        None,
        pattern="^(fasting|postprandial)$",
        description="Timing: 'fasting' or 'postprandial'",
    )
    visibility: str = Field(
        default="public",
        pattern="^(public|followers_only|private)$",
        description="Visibility setting",
    )
    notes: Optional[str] = Field(None, max_length=5000, description="Optional notes")


class BloodGlucoseRecordCreate(BloodGlucoseRecordBase):
    """Schema for creating a blood glucose record."""

    pass


class BloodGlucoseRecordUpdate(BaseModel):
    """Schema for updating a blood glucose record."""

    recorded_at: Optional[datetime] = None
    value: Optional[int] = Field(None, ge=0, le=1000)
    timing: Optional[str] = Field(None, pattern="^(fasting|postprandial)$")
    visibility: Optional[str] = Field(None, pattern="^(public|followers_only|private)$")
    notes: Optional[str] = Field(None, max_length=5000)


class BloodGlucoseRecordResponse(BloodGlucoseRecordBase):
    """Schema for blood glucose record responses."""

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

