"""
API endpoints for blood pressure records.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.schemas.blood_pressure_record import (
    BloodPressureRecordCreate,
    BloodPressureRecordResponse,
    BloodPressureRecordUpdate,
)
from app.services.blood_pressure_record_service import BloodPressureRecordService

router = APIRouter(prefix="/blood-pressure-records", tags=["blood-pressure-records"])


@router.post(
    "",
    response_model=BloodPressureRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new blood pressure record",
)
async def create_blood_pressure_record(
    record_data: BloodPressureRecordCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new blood pressure record for the current user."""
    user_id = UUID(current_user["sub"])
    record = BloodPressureRecordService.create_record(db, user_id, record_data)
    return record


@router.get(
    "",
    response_model=List[BloodPressureRecordResponse],
    summary="Get blood pressure records for the current user",
)
async def get_my_blood_pressure_records(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get blood pressure records for the current user."""
    user_id = UUID(current_user["sub"])
    records = BloodPressureRecordService.get_user_records(db, user_id, skip, limit)
    return records


@router.get(
    "/{record_id}",
    response_model=BloodPressureRecordResponse,
    summary="Get a specific blood pressure record",
)
async def get_blood_pressure_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a specific blood pressure record by ID."""
    user_id = UUID(current_user["sub"])
    record = BloodPressureRecordService.get_record_by_id(db, record_id, user_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blood pressure record not found",
        )
    return record


@router.put(
    "/{record_id}",
    response_model=BloodPressureRecordResponse,
    summary="Update a blood pressure record",
)
async def update_blood_pressure_record(
    record_id: UUID,
    record_data: BloodPressureRecordUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update a blood pressure record."""
    user_id = UUID(current_user["sub"])
    record = BloodPressureRecordService.update_record(db, record_id, user_id, record_data)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blood pressure record not found",
        )
    return record


@router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a blood pressure record",
)
async def delete_blood_pressure_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a blood pressure record."""
    user_id = UUID(current_user["sub"])
    success = BloodPressureRecordService.delete_record(db, record_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blood pressure record not found",
        )
    return None

