"""
Pydantic schemas for blood pressure records.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer


class BloodPressureRecordBase(BaseModel):
    """Base schema for blood pressure records."""

    recorded_at: datetime = Field(..., description="When the measurement was taken")
    systolic: int = Field(..., ge=0, le=300, description="Systolic blood pressure (mmHg)")
    diastolic: int = Field(..., ge=0, le=300, description="Diastolic blood pressure (mmHg)")
    visibility: str = Field(
        default="public",
        pattern="^(public|followers_only|private)$",
        description="Visibility setting",
    )
    notes: Optional[str] = Field(None, max_length=5000, description="Optional notes")


class BloodPressureRecordCreate(BloodPressureRecordBase):
    """Schema for creating a blood pressure record."""

    pass


class BloodPressureRecordUpdate(BaseModel):
    """Schema for updating a blood pressure record."""

    recorded_at: Optional[datetime] = None
    systolic: Optional[int] = Field(None, ge=0, le=300)
    diastolic: Optional[int] = Field(None, ge=0, le=300)
    visibility: Optional[str] = Field(None, pattern="^(public|followers_only|private)$")
    notes: Optional[str] = Field(None, max_length=5000)


class BloodPressureRecordResponse(BloodPressureRecordBase):
    """Schema for blood pressure record responses."""

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

