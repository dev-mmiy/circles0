"""
API endpoints for temperature records.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.schemas.temperature_record import (
    TemperatureRecordCreate,
    TemperatureRecordResponse,
    TemperatureRecordUpdate,
)
from app.services.temperature_record_service import TemperatureRecordService

router = APIRouter(prefix="/temperature-records", tags=["temperature-records"])


@router.post(
    "",
    response_model=TemperatureRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new temperature record",
)
async def create_temperature_record(
    record_data: TemperatureRecordCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new temperature record for the current user."""
    user_id = UUID(current_user["sub"])
    record = TemperatureRecordService.create_record(db, user_id, record_data)
    return record


@router.get(
    "",
    response_model=List[TemperatureRecordResponse],
    summary="Get temperature records for the current user",
)
async def get_my_temperature_records(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get temperature records for the current user."""
    user_id = UUID(current_user["sub"])
    records = TemperatureRecordService.get_user_records(db, user_id, skip, limit)
    return records


@router.get(
    "/{record_id}",
    response_model=TemperatureRecordResponse,
    summary="Get a specific temperature record",
)
async def get_temperature_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a specific temperature record by ID."""
    user_id = UUID(current_user["sub"])
    record = TemperatureRecordService.get_record_by_id(db, record_id, user_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Temperature record not found",
        )
    return record


@router.put(
    "/{record_id}",
    response_model=TemperatureRecordResponse,
    summary="Update a temperature record",
)
async def update_temperature_record(
    record_id: UUID,
    record_data: TemperatureRecordUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update a temperature record."""
    user_id = UUID(current_user["sub"])
    record = TemperatureRecordService.update_record(db, record_id, user_id, record_data)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Temperature record not found",
        )
    return record


@router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a temperature record",
)
async def delete_temperature_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a temperature record."""
    user_id = UUID(current_user["sub"])
    success = TemperatureRecordService.delete_record(db, record_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Temperature record not found",
        )
    return None

