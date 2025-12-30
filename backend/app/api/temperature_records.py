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
from app.services.user_service import UserService
from app.utils.auth_utils import extract_auth0_id

router = APIRouter(prefix="/temperature-records", tags=["temperature-records"])


def get_user_id_from_token(db: Session, current_user: dict) -> UUID:
    """
    Get database user ID from Auth0 token.

    Args:
        db: Database session
        current_user: Decoded Auth0 token

    Returns:
        User UUID from database

    Raises:
        HTTPException: If user not found
    """
    auth0_id = extract_auth0_id(current_user)
    user = UserService.get_user_by_auth0_id(db, auth0_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user.id


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
    user_id = get_user_id_from_token(db, current_user)
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
    user_id = get_user_id_from_token(db, current_user)
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
    user_id = get_user_id_from_token(db, current_user)
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
    user_id = get_user_id_from_token(db, current_user)
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
    user_id = get_user_id_from_token(db, current_user)
    success = TemperatureRecordService.delete_record(db, record_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Temperature record not found",
        )
    return None

