from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps
from app.models.food import Food, FoodNutrition
from app.schemas.food import Food as FoodSchema, FoodCreate, FoodUpdate

router = APIRouter()


@router.get("/", response_model=List[FoodSchema])
def read_foods(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = None,
    category: Optional[str] = None,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve foods.
    Search by name, kana, or keywords.
    """
    query = db.query(Food)
    
    # Filter by user (shared foods + own foods)
    query = query.filter(
        or_(Food.user_id == None, Food.user_id == current_user.id),
        Food.is_deleted == False
    )

    if q:
        search_filter = or_(
            Food.name.ilike(f"%{q}%"),
            Food.name_kana.ilike(f"%{q}%"),
            Food.search_keywords.ilike(f"%{q}%"),
        )
        query = query.filter(search_filter)
    
    if category:
        query = query.filter(Food.category == category)

    foods = query.offset(skip).limit(limit).all()
    return foods


@router.post("/", response_model=FoodSchema)
def create_food(
    *,
    db: Session = Depends(deps.get_db),
    food_in: FoodCreate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new food (User defined).
    """
    # Create Food
    db_food = Food(
        name=food_in.name,
        name_kana=food_in.name_kana,
        search_keywords=food_in.search_keywords,
        category=food_in.category,
        description=food_in.description,
        user_id=current_user.id,
    )
    db.add(db_food)
    db.commit()
    db.refresh(db_food)

    # Create Nutrition entries
    for nutrition_in in food_in.nutrition_list:
        db_nutrition = FoodNutrition(
            food_id=db_food.id,
            **nutrition_in.model_dump(),
        )
        db.add(db_nutrition)
    
    db.commit()
    db.refresh(db_food)
    return db_food


@router.get("/{id}", response_model=FoodSchema)
def read_food(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get food by ID.
    """
    food = db.query(Food).filter(Food.id == id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    # Check permissions (shared or owned)
    if food.user_id and food.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    return food


@router.put("/{id}", response_model=FoodSchema)
def update_food(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    food_in: FoodUpdate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update food.
    """
    food = db.query(Food).filter(Food.id == id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    if not food.user_id or food.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to update system or other user's food")

    # Update Food fields
    update_data = food_in.model_dump(exclude_unset=True, exclude={"nutrition_list"})
    for field, value in update_data.items():
        setattr(food, field, value)
    
    # Update Nutrition (Replace all logic for simplicity for now)
    if food_in.nutrition_list is not None:
        # Delete existing
        db.query(FoodNutrition).filter(FoodNutrition.food_id == id).delete()
        # Add new
        for nutrition_in in food_in.nutrition_list:
            db_nutrition = FoodNutrition(
                food_id=id,
                **nutrition_in.model_dump(),
            )
            db.add(db_nutrition)

    db.commit()
    db.refresh(food)
    return food


@router.delete("/{id}", response_model=FoodSchema)
def delete_food(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete food.
    """
    food = db.query(Food).filter(Food.id == id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    if not food.user_id or food.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to delete system or other user's food")

    # Logical delete
    food.is_deleted = True
    db.add(food)
    db.commit()
    return food
