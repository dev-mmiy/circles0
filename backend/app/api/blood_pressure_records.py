"""
API endpoints for blood pressure records.
"""

from typing import List, Optional
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
from app.services.user_service import UserService
from app.utils.auth_utils import extract_auth0_id

router = APIRouter(prefix="/blood-pressure-records", tags=["blood-pressure-records"])


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
    user_id = get_user_id_from_token(db, current_user)
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
    user_id = get_user_id_from_token(db, current_user)
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
    user_id = get_user_id_from_token(db, current_user)
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
    user_id = get_user_id_from_token(db, current_user)
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
    user_id = get_user_id_from_token(db, current_user)
    success = BloodPressureRecordService.delete_record(db, record_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blood pressure record not found",
        )
    return None

