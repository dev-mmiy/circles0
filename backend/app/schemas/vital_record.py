"""
Pydantic schemas for vital records.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer


class VitalRecordBase(BaseModel):
    """Base schema for vital records."""

    recorded_at: datetime = Field(..., description="When the measurement was taken")
    blood_pressure_systolic: Optional[int] = Field(None, ge=0, le=300, description="Systolic blood pressure (mmHg)")
    blood_pressure_diastolic: Optional[int] = Field(None, ge=0, le=300, description="Diastolic blood pressure (mmHg)")
    heart_rate: Optional[int] = Field(None, ge=0, le=300, description="Heart rate (bpm)")
    temperature: Optional[float] = Field(None, ge=30.0, le=45.0, description="Body temperature (°C)")
    weight: Optional[float] = Field(None, ge=0.0, le=500.0, description="Body weight (kg)")
    body_fat_percentage: Optional[float] = Field(None, ge=0.0, le=100.0, description="Body fat percentage (%)")
    blood_glucose: Optional[int] = Field(None, ge=0, le=1000, description="Blood glucose level (mg/dL)")
    blood_glucose_timing: Optional[str] = Field(None, pattern="^(fasting|postprandial)$", description="Timing: 'fasting' or 'postprandial'")
    spo2: Optional[int] = Field(None, ge=0, le=100, description="Blood oxygen saturation (%)")
    notes: Optional[str] = Field(None, max_length=5000, description="Optional notes")


class VitalRecordCreate(VitalRecordBase):
    """Schema for creating a vital record."""

    pass


class VitalRecordUpdate(BaseModel):
    """Schema for updating a vital record."""

    recorded_at: Optional[datetime] = None
    blood_pressure_systolic: Optional[int] = Field(None, ge=0, le=300)
    blood_pressure_diastolic: Optional[int] = Field(None, ge=0, le=300)
    heart_rate: Optional[int] = Field(None, ge=0, le=300)
    temperature: Optional[float] = Field(None, ge=30.0, le=45.0)
    weight: Optional[float] = Field(None, ge=0.0, le=500.0)
    body_fat_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    blood_glucose: Optional[int] = Field(None, ge=0, le=1000)
    blood_glucose_timing: Optional[str] = Field(None, pattern="^(fasting|postprandial)$")
    spo2: Optional[int] = Field(None, ge=0, le=100)
    notes: Optional[str] = Field(None, max_length=5000)


class VitalRecordResponse(VitalRecordBase):
    """Schema for vital record responses."""

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

