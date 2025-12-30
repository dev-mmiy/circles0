"""
API endpoints for heart rate records.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.schemas.heart_rate_record import (
    HeartRateRecordCreate,
    HeartRateRecordResponse,
    HeartRateRecordUpdate,
)
from app.services.heart_rate_record_service import HeartRateRecordService

router = APIRouter(prefix="/heart-rate-records", tags=["heart-rate-records"])


@router.post(
    "",
    response_model=HeartRateRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new heart rate record",
)
async def create_heart_rate_record(
    record_data: HeartRateRecordCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new heart rate record for the current user."""
    user_id = UUID(current_user["sub"])
    record = HeartRateRecordService.create_record(db, user_id, record_data)
    return record


@router.get(
    "",
    response_model=List[HeartRateRecordResponse],
    summary="Get heart rate records for the current user",
)
async def get_my_heart_rate_records(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get heart rate records for the current user."""
    user_id = UUID(current_user["sub"])
    records = HeartRateRecordService.get_user_records(db, user_id, skip, limit)
    return records


@router.get(
    "/{record_id}",
    response_model=HeartRateRecordResponse,
    summary="Get a specific heart rate record",
)
async def get_heart_rate_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a specific heart rate record by ID."""
    user_id = UUID(current_user["sub"])
    record = HeartRateRecordService.get_record_by_id(db, record_id, user_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Heart rate record not found",
        )
    return record


@router.put(
    "/{record_id}",
    response_model=HeartRateRecordResponse,
    summary="Update a heart rate record",
)
async def update_heart_rate_record(
    record_id: UUID,
    record_data: HeartRateRecordUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update a heart rate record."""
    user_id = UUID(current_user["sub"])
    record = HeartRateRecordService.update_record(db, record_id, user_id, record_data)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Heart rate record not found",
        )
    return record


@router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a heart rate record",
)
async def delete_heart_rate_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a heart rate record."""
    user_id = UUID(current_user["sub"])
    success = HeartRateRecordService.delete_record(db, record_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Heart rate record not found",
        )
    return None

