"""
API endpoints for weight records.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.schemas.weight_record import (
    WeightRecordCreate,
    WeightRecordResponse,
    WeightRecordUpdate,
)
from app.services.weight_record_service import WeightRecordService

router = APIRouter(prefix="/weight-records", tags=["weight-records"])


@router.post(
    "",
    response_model=WeightRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new weight record",
)
async def create_weight_record(
    record_data: WeightRecordCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new weight record for the current user."""
    user_id = UUID(current_user["sub"])
    record = WeightRecordService.create_record(db, user_id, record_data)
    return record


@router.get(
    "",
    response_model=List[WeightRecordResponse],
    summary="Get weight records for the current user",
)
async def get_my_weight_records(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get weight records for the current user."""
    user_id = UUID(current_user["sub"])
    records = WeightRecordService.get_user_records(db, user_id, skip, limit)
    return records


@router.get(
    "/{record_id}",
    response_model=WeightRecordResponse,
    summary="Get a specific weight record",
)
async def get_weight_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a specific weight record by ID."""
    user_id = UUID(current_user["sub"])
    record = WeightRecordService.get_record_by_id(db, record_id, user_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Weight record not found",
        )
    return record


@router.put(
    "/{record_id}",
    response_model=WeightRecordResponse,
    summary="Update a weight record",
)
async def update_weight_record(
    record_id: UUID,
    record_data: WeightRecordUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update a weight record."""
    user_id = UUID(current_user["sub"])
    record = WeightRecordService.update_record(db, record_id, user_id, record_data)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Weight record not found",
        )
    return record


@router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a weight record",
)
async def delete_weight_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a weight record."""
    user_id = UUID(current_user["sub"])
    success = WeightRecordService.delete_record(db, record_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Weight record not found",
        )
    return None

