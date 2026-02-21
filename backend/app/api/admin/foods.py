from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.auth.admin_dependencies import require_admin_user
from app.models.food import Food, FoodNutrition
from app.schemas.food import Food as FoodSchema, FoodCreate, FoodUpdate

router = APIRouter(prefix="/foods", tags=["admin-foods"])

@router.get("", response_model=List[FoodSchema])
def list_foods(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = None,
    include_deleted: bool = False,
    admin: models.User = Depends(require_admin_user),
) -> Any:
    """
    Admin: List all foods.
    """
    query = db.query(Food)
    if not include_deleted:
        query = query.filter(Food.is_deleted == False)
    
    if q:
        query = query.filter(
            or_(
                Food.name.ilike(f"%{q}%"),
                Food.name_kana.ilike(f"%{q}%"),
                Food.search_keywords.ilike(f"%{q}%")
            )
        )
    return query.offset(skip).limit(limit).all()

@router.post("", response_model=FoodSchema)
def create_food(
    *,
    db: Session = Depends(deps.get_db),
    food_in: FoodCreate,
    admin: models.User = Depends(require_admin_user),
) -> Any:
    """
    Admin: Create new SYSTEM food (available to all users).
    """
    # Admin creates SYSTEM food (user_id=None)
    db_food = Food(
        name=food_in.name,
        name_kana=food_in.name_kana,
        search_keywords=food_in.search_keywords,
        category=food_in.category,
        description=food_in.description,
        user_id=None, # System food
    )
    db.add(db_food)
    db.commit()
    db.refresh(db_food)

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
    admin: models.User = Depends(require_admin_user),
) -> Any:
    """
    Admin: Get food details.
    """
    food = db.query(Food).filter(Food.id == id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    return food

@router.put("/{id}", response_model=FoodSchema)
def update_food(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    food_in: FoodUpdate,
    admin: models.User = Depends(require_admin_user),
) -> Any:
    """
    Admin: Update food.
    """
    food = db.query(Food).filter(Food.id == id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    # Update fields
    update_data = food_in.model_dump(exclude_unset=True, exclude={"nutrition_list"})
    for field, value in update_data.items():
        setattr(food, field, value)
    
    # Replace nutrition if provided
    if food_in.nutrition_list is not None:
        db.query(FoodNutrition).filter(FoodNutrition.food_id == id).delete()
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
    admin: models.User = Depends(require_admin_user),
) -> Any:
    """
    Admin: Logical delete food.
    """
    food = db.query(Food).filter(Food.id == id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    food.is_deleted = True
    db.add(food)
    db.commit()
    return food

@router.post("/{id}/restore", response_model=FoodSchema)
def restore_food(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    admin: models.User = Depends(require_admin_user),
) -> Any:
    """
    Admin: Restore deleted food.
    """
    food = db.query(Food).filter(Food.id == id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
        
    food.is_deleted = False
    db.add(food)
    db.commit()
    return food
