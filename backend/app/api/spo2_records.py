"""
API endpoints for SpO2 records.
"""

from datetime import datetime
from typing import List, Optional
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
from app.services.user_service import UserService
from app.utils.auth_utils import extract_auth0_id

router = APIRouter(prefix="/spo2-records", tags=["spo2-records"])


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
    user_id = get_user_id_from_token(db, current_user)
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
    start_date: Optional[datetime] = Query(None, description="Start date (ISO 8601)"),
    end_date: Optional[datetime] = Query(None, description="End date (ISO 8601)"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get SpO2 records for the current user."""
    user_id = get_user_id_from_token(db, current_user)
    records = SpO2RecordService.get_user_records(db, user_id, skip, limit, start_date, end_date)
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
    user_id = get_user_id_from_token(db, current_user)
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
    user_id = get_user_id_from_token(db, current_user)
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
    user_id = get_user_id_from_token(db, current_user)
    success = SpO2RecordService.delete_record(db, record_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SpO2 record not found",
        )
    return None

