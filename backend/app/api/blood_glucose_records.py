"""
API endpoints for blood glucose records.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.schemas.blood_glucose_record import (
    BloodGlucoseRecordCreate,
    BloodGlucoseRecordResponse,
    BloodGlucoseRecordUpdate,
)
from app.services.blood_glucose_record_service import BloodGlucoseRecordService

router = APIRouter(prefix="/blood-glucose-records", tags=["blood-glucose-records"])


@router.post(
    "",
    response_model=BloodGlucoseRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new blood glucose record",
)
async def create_blood_glucose_record(
    record_data: BloodGlucoseRecordCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new blood glucose record for the current user."""
    user_id = UUID(current_user["sub"])
    record = BloodGlucoseRecordService.create_record(db, user_id, record_data)
    return record


@router.get(
    "",
    response_model=List[BloodGlucoseRecordResponse],
    summary="Get blood glucose records for the current user",
)
async def get_my_blood_glucose_records(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get blood glucose records for the current user."""
    user_id = UUID(current_user["sub"])
    records = BloodGlucoseRecordService.get_user_records(db, user_id, skip, limit)
    return records


@router.get(
    "/{record_id}",
    response_model=BloodGlucoseRecordResponse,
    summary="Get a specific blood glucose record",
)
async def get_blood_glucose_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a specific blood glucose record by ID."""
    user_id = UUID(current_user["sub"])
    record = BloodGlucoseRecordService.get_record_by_id(db, record_id, user_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blood glucose record not found",
        )
    return record


@router.put(
    "/{record_id}",
    response_model=BloodGlucoseRecordResponse,
    summary="Update a blood glucose record",
)
async def update_blood_glucose_record(
    record_id: UUID,
    record_data: BloodGlucoseRecordUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update a blood glucose record."""
    user_id = UUID(current_user["sub"])
    record = BloodGlucoseRecordService.update_record(db, record_id, user_id, record_data)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blood glucose record not found",
        )
    return record


@router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a blood glucose record",
)
async def delete_blood_glucose_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a blood glucose record."""
    user_id = UUID(current_user["sub"])
    success = BloodGlucoseRecordService.delete_record(db, record_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blood glucose record not found",
        )
    return None

