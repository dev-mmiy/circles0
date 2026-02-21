from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict
from app.schemas.food import Food


class MenuIngredientBase(BaseModel):
    food_id: UUID
    amount: float
    unit: str
    display_order: int = 0


class MenuIngredientCreate(MenuIngredientBase):
    pass


class MenuIngredient(MenuIngredientBase):
    id: UUID
    menu_id: UUID
    food: Optional[Food] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MenuNutritionBase(BaseModel):
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


class MenuNutritionCreate(MenuNutritionBase):
    pass


class MenuNutrition(MenuNutritionBase):
    id: UUID
    menu_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MenuBase(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None


class MenuCreate(MenuBase):
    ingredients: List[MenuIngredientCreate] = []
    nutrition_list: List[MenuNutritionCreate] = []


class MenuUpdate(MenuBase):
    ingredients: Optional[List[MenuIngredientCreate]] = None
    nutrition_list: Optional[List[MenuNutritionCreate]] = None


class Menu(MenuBase):
    id: UUID
    user_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    ingredients: List[MenuIngredient] = []
    nutrition: List[MenuNutrition] = []

    model_config = ConfigDict(from_attributes=True)
