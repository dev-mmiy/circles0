"""
Pydantic schemas for timeline integration.
"""

from datetime import datetime
from typing import Any, Dict, Literal, Optional, Union
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer


class TimelineItemBase(BaseModel):
    """Base schema for timeline items."""

    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    visibility: str = Field(..., pattern="^(public|followers_only|private)$")
    item_type: str  # 'post', 'blood_pressure_record', 'heart_rate_record', etc.


class PostTimelineItem(TimelineItemBase):
    """Timeline item for posts."""

    item_type: Literal["post"] = "post"
    content: str
    author: Optional[Dict[str, Any]] = None
    like_count: int = 0
    comment_count: int = 0
    is_liked_by_current_user: bool = False
    images: list = []


class BloodPressureTimelineItem(TimelineItemBase):
    """Timeline item for blood pressure records."""

    item_type: Literal["blood_pressure_record"] = "blood_pressure_record"
    recorded_at: datetime
    systolic: int
    diastolic: int
    notes: Optional[str] = None


class HeartRateTimelineItem(TimelineItemBase):
    """Timeline item for heart rate records."""

    item_type: Literal["heart_rate_record"] = "heart_rate_record"
    recorded_at: datetime
    bpm: int
    notes: Optional[str] = None


class TemperatureTimelineItem(TimelineItemBase):
    """Timeline item for temperature records."""

    item_type: Literal["temperature_record"] = "temperature_record"
    recorded_at: datetime
    value: float
    unit: str
    notes: Optional[str] = None


class WeightTimelineItem(TimelineItemBase):
    """Timeline item for weight records."""

    item_type: Literal["weight_record"] = "weight_record"
    recorded_at: datetime
    value: float
    unit: str
    notes: Optional[str] = None


class BodyFatTimelineItem(TimelineItemBase):
    """Timeline item for body fat percentage records."""

    item_type: Literal["body_fat_record"] = "body_fat_record"
    recorded_at: datetime
    percentage: float
    notes: Optional[str] = None


class BloodGlucoseTimelineItem(TimelineItemBase):
    """Timeline item for blood glucose records."""

    item_type: Literal["blood_glucose_record"] = "blood_glucose_record"
    recorded_at: datetime
    value: int
    timing: Optional[str] = None
    notes: Optional[str] = None


class SpO2TimelineItem(TimelineItemBase):
    """Timeline item for SpO2 records."""

    item_type: Literal["spo2_record"] = "spo2_record"
    recorded_at: datetime
    percentage: int
    notes: Optional[str] = None


class MealTimelineItem(TimelineItemBase):
    """Timeline item for meal records."""

    item_type: Literal["meal_record"] = "meal_record"
    recorded_at: datetime
    meal_type: str
    foods: Optional[list] = None
    nutrition: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


TimelineItem = Union[
    PostTimelineItem,
    BloodPressureTimelineItem,
    HeartRateTimelineItem,
    TemperatureTimelineItem,
    WeightTimelineItem,
    BodyFatTimelineItem,
    BloodGlucoseTimelineItem,
    SpO2TimelineItem,
    MealTimelineItem,
]


class TimelineResponse(BaseModel):
    """Response schema for timeline."""

    items: list[TimelineItem]
    total: int
    skip: int
    limit: int

