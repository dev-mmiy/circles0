"""
API endpoints for vital records.

DEPRECATED: This API is deprecated. Use separate vital record APIs instead:
- /api/v1/blood-pressure-records
- /api/v1/heart-rate-records
- /api/v1/temperature-records
- /api/v1/weight-records
- /api/v1/body-fat-records
- /api/v1/blood-glucose-records
- /api/v1/spo2-records

This file is kept for reference but should not be used.
"""

# DEPRECATED: All endpoints have been moved to separate API files.
# This file is kept for reference only.

from fastapi import APIRouter

router = APIRouter(prefix="/vital-records", tags=["vital-records-deprecated"])

# All endpoints have been moved to separate API files.


@router.post(
    "",
    response_model=VitalRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new vital record",
)
async def create_vital_record(
    record_data: VitalRecordCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new vital record for the current user."""
    user_id = UUID(current_user["sub"])
    record = VitalRecordService.create_vital_record(db, user_id, record_data)
    return record


@router.get(
    "",
    response_model=List[VitalRecordResponse],
    summary="Get vital records for the current user",
)
async def get_my_vital_records(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get vital records for the current user."""
    user_id = UUID(current_user["sub"])
    records = VitalRecordService.get_user_vital_records(db, user_id, skip, limit)
    return records


@router.get(
    "/{record_id}",
    response_model=VitalRecordResponse,
    summary="Get a specific vital record",
)
async def get_vital_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a specific vital record by ID."""
    user_id = UUID(current_user["sub"])
    record = VitalRecordService.get_vital_record_by_id(db, record_id, user_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vital record not found",
        )
    return record


@router.put(
    "/{record_id}",
    response_model=VitalRecordResponse,
    summary="Update a vital record",
)
async def update_vital_record(
    record_id: UUID,
    record_data: VitalRecordUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update a vital record."""
    user_id = UUID(current_user["sub"])
    record = VitalRecordService.update_vital_record(db, record_id, user_id, record_data)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vital record not found",
        )
    return record


@router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a vital record",
)
async def delete_vital_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a vital record."""
    user_id = UUID(current_user["sub"])
    success = VitalRecordService.delete_vital_record(db, record_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vital record not found",
        )
    return None

