"""
API endpoints for heart rate records.
"""

from datetime import datetime
from typing import List, Optional
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
from app.services.user_service import UserService
from app.utils.auth_utils import extract_auth0_id

router = APIRouter(prefix="/heart-rate-records", tags=["heart-rate-records"])


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
    user_id = get_user_id_from_token(db, current_user)
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
    start_date: Optional[datetime] = Query(None, description="Start date (ISO 8601)"),
    end_date: Optional[datetime] = Query(None, description="End date (ISO 8601)"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get heart rate records for the current user."""
    user_id = get_user_id_from_token(db, current_user)
    records = HeartRateRecordService.get_user_records(db, user_id, skip, limit, start_date, end_date)
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
    user_id = get_user_id_from_token(db, current_user)
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
    user_id = get_user_id_from_token(db, current_user)
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
    user_id = get_user_id_from_token(db, current_user)
    success = HeartRateRecordService.delete_record(db, record_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Heart rate record not found",
        )
    return None

