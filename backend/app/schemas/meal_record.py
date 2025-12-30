"""
Pydantic schemas for meal records.
"""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer


class FoodItem(BaseModel):
    """Schema for a food item in a meal."""

    name: str = Field(..., min_length=1, max_length=200)
    amount: Optional[float] = Field(None, ge=0.0)
    unit: Optional[str] = Field(None, max_length=20)


class NutritionInfo(BaseModel):
    """Schema for nutrition information."""

    calories: Optional[int] = Field(None, ge=0)
    protein: Optional[float] = Field(None, ge=0.0)
    carbs: Optional[float] = Field(None, ge=0.0)
    fat: Optional[float] = Field(None, ge=0.0)


class MealRecordBase(BaseModel):
    """Base schema for meal records."""

    recorded_at: datetime = Field(..., description="When the meal was consumed")
    meal_type: str = Field(..., pattern="^(breakfast|lunch|dinner|snack)$", description="Type of meal")
    foods: Optional[List[FoodItem]] = Field(None, description="List of foods consumed")
    nutrition: Optional[NutritionInfo] = Field(None, description="Nutrition information")
    notes: Optional[str] = Field(None, max_length=5000, description="Optional notes")


class MealRecordCreate(MealRecordBase):
    """Schema for creating a meal record."""

    pass


class MealRecordUpdate(BaseModel):
    """Schema for updating a meal record."""

    recorded_at: Optional[datetime] = None
    meal_type: Optional[str] = Field(None, pattern="^(breakfast|lunch|dinner|snack)$")
    foods: Optional[List[FoodItem]] = None
    nutrition: Optional[NutritionInfo] = None
    notes: Optional[str] = Field(None, max_length=5000)


class MealRecordResponse(MealRecordBase):
    """Schema for meal record responses."""

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

