from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FoodNutritionBase(BaseModel):
    unit: str
    base_amount: float
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    fiber: Optional[float] = None
    sodium: Optional[float] = None
    potassium: Optional[float] = None
    phosphorus: Optional[float] = None


class FoodNutritionCreate(FoodNutritionBase):
    pass


class FoodNutritionUpdate(FoodNutritionBase):
    pass


class FoodNutrition(FoodNutritionBase):
    id: UUID
    food_id: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class FoodBase(BaseModel):
    name: str
    name_kana: Optional[str] = None
    search_keywords: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None


class FoodCreate(FoodBase):
    nutrition_list: List[FoodNutritionCreate]


class FoodUpdate(FoodBase):
    nutrition_list: Optional[List[FoodNutritionCreate]] = None


class Food(FoodBase):
    id: UUID
    user_id: Optional[UUID] = None
    is_deleted: bool = False
    created_at: datetime
    updated_at: datetime
    nutrition: List[FoodNutrition] = []

    model_config = ConfigDict(from_attributes=True)
