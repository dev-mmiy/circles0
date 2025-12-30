"""
API endpoints for SpO2 records.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.schemas.spo2_record import (
    SpO2RecordCreate,
    SpO2RecordResponse,
    SpO2RecordUpdate,
)
from app.services.spo2_record_service import SpO2RecordService

router = APIRouter(prefix="/spo2-records", tags=["spo2-records"])


@router.post(
    "",
    response_model=SpO2RecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new SpO2 record",
)
async def create_spo2_record(
    record_data: SpO2RecordCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new SpO2 record for the current user."""
    user_id = UUID(current_user["sub"])
    record = SpO2RecordService.create_record(db, user_id, record_data)
    return record


@router.get(
    "",
    response_model=List[SpO2RecordResponse],
    summary="Get SpO2 records for the current user",
)
async def get_my_spo2_records(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get SpO2 records for the current user."""
    user_id = UUID(current_user["sub"])
    records = SpO2RecordService.get_user_records(db, user_id, skip, limit)
    return records


@router.get(
    "/{record_id}",
    response_model=SpO2RecordResponse,
    summary="Get a specific SpO2 record",
)
async def get_spo2_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a specific SpO2 record by ID."""
    user_id = UUID(current_user["sub"])
    record = SpO2RecordService.get_record_by_id(db, record_id, user_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SpO2 record not found",
        )
    return record


@router.put(
    "/{record_id}",
    response_model=SpO2RecordResponse,
    summary="Update a SpO2 record",
)
async def update_spo2_record(
    record_id: UUID,
    record_data: SpO2RecordUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update a SpO2 record."""
    user_id = UUID(current_user["sub"])
    record = SpO2RecordService.update_record(db, record_id, user_id, record_data)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SpO2 record not found",
        )
    return record


@router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a SpO2 record",
)
async def delete_spo2_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a SpO2 record."""
    user_id = UUID(current_user["sub"])
    success = SpO2RecordService.delete_record(db, record_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SpO2 record not found",
        )
    return None

