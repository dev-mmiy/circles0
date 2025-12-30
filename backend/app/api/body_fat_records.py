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
from app.services.user_service import UserService
from app.utils.auth_utils import extract_auth0_id

router = APIRouter(prefix="/body-fat-records", tags=["body-fat-records"])


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
    user_id = get_user_id_from_token(db, current_user)
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
    user_id = get_user_id_from_token(db, current_user)
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
    user_id = get_user_id_from_token(db, current_user)
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
    user_id = get_user_id_from_token(db, current_user)
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
    user_id = get_user_id_from_token(db, current_user)
    success = BodyFatRecordService.delete_record(db, record_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Body fat percentage record not found",
        )
    return None

