from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps
from app.models.menu import Menu, MenuIngredient, MenuNutrition
from app.schemas.menu import Menu as MenuSchema, MenuCreate, MenuUpdate

router = APIRouter()


@router.get("/", response_model=List[MenuSchema])
def read_menus(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = None,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve menus.
    """
    query = db.query(Menu)
    
    # Filter by user (shared menus + own menus)
    query = query.filter(or_(Menu.user_id == None, Menu.user_id == current_user.id))

    if q:
        query = query.filter(Menu.name.ilike(f"%{q}%"))

    menus = query.offset(skip).limit(limit).all()
    return menus


@router.post("/", response_model=MenuSchema)
def create_menu(
    *,
    db: Session = Depends(deps.get_db),
    menu_in: MenuCreate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new menu (User defined).
    """
    # Create Menu
    db_menu = Menu(
        name=menu_in.name,
        description=menu_in.description,
        image_url=menu_in.image_url,
        user_id=current_user.id,
    )
    db.add(db_menu)
    db.commit()
    db.refresh(db_menu)

    # Create Ingredients
    for ingredient_in in menu_in.ingredients:
        db_ingredient = MenuIngredient(
            menu_id=db_menu.id,
            **ingredient_in.model_dump(),
        )
        db.add(db_ingredient)

    # Create Nutrition
    for nutrition_in in menu_in.nutrition_list:
        db_nutrition = MenuNutrition(
            menu_id=db_menu.id,
            **nutrition_in.model_dump(),
        )
        db.add(db_nutrition)
    
    db.commit()
    db.refresh(db_menu)
    return db_menu


@router.get("/{id}", response_model=MenuSchema)
def read_menu(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get menu by ID.
    """
    menu = db.query(Menu).filter(Menu.id == id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    
    # Check permissions (shared or owned)
    if menu.user_id and menu.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    return menu

# Update and Delete endpoints omitted for brevity as they follow similar pattern to Foods
# Extend as needed based on requirements
