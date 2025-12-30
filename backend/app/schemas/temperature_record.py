"""
Pydantic schemas for temperature records.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer


class TemperatureRecordBase(BaseModel):
    """Base schema for temperature records."""

    recorded_at: datetime = Field(..., description="When the measurement was taken")
    value: float = Field(..., ge=30.0, le=45.0, description="Temperature value")
    unit: str = Field(
        default="celsius",
        pattern="^(celsius|fahrenheit)$",
        description="Unit: 'celsius' or 'fahrenheit'",
    )
    visibility: str = Field(
        default="public",
        pattern="^(public|followers_only|private)$",
        description="Visibility setting",
    )
    notes: Optional[str] = Field(None, max_length=5000, description="Optional notes")


class TemperatureRecordCreate(TemperatureRecordBase):
    """Schema for creating a temperature record."""

    pass


class TemperatureRecordUpdate(BaseModel):
    """Schema for updating a temperature record."""

    recorded_at: Optional[datetime] = None
    value: Optional[float] = Field(None, ge=30.0, le=45.0)
    unit: Optional[str] = Field(None, pattern="^(celsius|fahrenheit)$")
    visibility: Optional[str] = Field(None, pattern="^(public|followers_only|private)$")
    notes: Optional[str] = Field(None, max_length=5000)


class TemperatureRecordResponse(TemperatureRecordBase):
    """Schema for temperature record responses."""

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

