"""
API endpoints for body fat percentage records.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.schemas.body_fat_record import (
    BodyFatRecordCreate,
    BodyFatRecordResponse,
    BodyFatRecordUpdate,
)
from app.services.body_fat_record_service import BodyFatRecordService

router = APIRouter(prefix="/body-fat-records", tags=["body-fat-records"])


@router.post(
    "",
    response_model=BodyFatRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new body fat percentage record",
)
async def create_body_fat_record(
    record_data: BodyFatRecordCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new body fat percentage record for the current user."""
    user_id = UUID(current_user["sub"])
    record = BodyFatRecordService.create_record(db, user_id, record_data)
    return record


@router.get(
    "",
    response_model=List[BodyFatRecordResponse],
    summary="Get body fat percentage records for the current user",
)
async def get_my_body_fat_records(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get body fat percentage records for the current user."""
    user_id = UUID(current_user["sub"])
    records = BodyFatRecordService.get_user_records(db, user_id, skip, limit)
    return records


@router.get(
    "/{record_id}",
    response_model=BodyFatRecordResponse,
    summary="Get a specific body fat percentage record",
)
async def get_body_fat_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a specific body fat percentage record by ID."""
    user_id = UUID(current_user["sub"])
    record = BodyFatRecordService.get_record_by_id(db, record_id, user_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Body fat percentage record not found",
        )
    return record


@router.put(
    "/{record_id}",
    response_model=BodyFatRecordResponse,
    summary="Update a body fat percentage record",
)
async def update_body_fat_record(
    record_id: UUID,
    record_data: BodyFatRecordUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update a body fat percentage record."""
    user_id = UUID(current_user["sub"])
    record = BodyFatRecordService.update_record(db, record_id, user_id, record_data)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Body fat percentage record not found",
        )
    return record


@router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a body fat percentage record",
)
async def delete_body_fat_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a body fat percentage record."""
    user_id = UUID(current_user["sub"])
    success = BodyFatRecordService.delete_record(db, record_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Body fat percentage record not found",
        )
    return None

