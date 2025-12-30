"""
API endpoints for meal records.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.schemas.meal_record import (
    MealRecordCreate,
    MealRecordResponse,
    MealRecordUpdate,
)
from app.services.meal_record_service import MealRecordService

router = APIRouter(prefix="/meal-records", tags=["meal-records"])


@router.post(
    "",
    response_model=MealRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new meal record",
)
async def create_meal_record(
    record_data: MealRecordCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new meal record for the current user."""
    user_id = UUID(current_user["sub"])
    record = MealRecordService.create_meal_record(db, user_id, record_data)
    return record


@router.get(
    "",
    response_model=List[MealRecordResponse],
    summary="Get meal records for the current user",
)
async def get_my_meal_records(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get meal records for the current user."""
    user_id = UUID(current_user["sub"])
    records = MealRecordService.get_user_meal_records(db, user_id, skip, limit)
    return records


@router.get(
    "/{record_id}",
    response_model=MealRecordResponse,
    summary="Get a specific meal record",
)
async def get_meal_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a specific meal record by ID."""
    user_id = UUID(current_user["sub"])
    record = MealRecordService.get_meal_record_by_id(db, record_id, user_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal record not found",
        )
    return record


@router.put(
    "/{record_id}",
    response_model=MealRecordResponse,
    summary="Update a meal record",
)
async def update_meal_record(
    record_id: UUID,
    record_data: MealRecordUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update a meal record."""
    user_id = UUID(current_user["sub"])
    record = MealRecordService.update_meal_record(db, record_id, user_id, record_data)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal record not found",
        )
    return record


@router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a meal record",
)
async def delete_meal_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a meal record."""
    user_id = UUID(current_user["sub"])
    success = MealRecordService.delete_meal_record(db, record_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal record not found",
        )
    return None

