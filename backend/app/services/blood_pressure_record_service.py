"""
Service for blood pressure record operations.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.blood_pressure_record import BloodPressureRecord
from app.schemas.blood_pressure_record import BloodPressureRecordCreate, BloodPressureRecordUpdate


class BloodPressureRecordService:
    """Service for blood pressure record-related operations."""

    @staticmethod
    def create_record(
        db: Session, user_id: UUID, record_data: BloodPressureRecordCreate
    ) -> BloodPressureRecord:
        """Create a new blood pressure record."""
        record = BloodPressureRecord(
            user_id=user_id,
            recorded_at=record_data.recorded_at,
            systolic=record_data.systolic,
            diastolic=record_data.diastolic,
            visibility=record_data.visibility,
            notes=record_data.notes,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def get_record_by_id(
        db: Session, record_id: UUID, user_id: Optional[UUID] = None
    ) -> Optional[BloodPressureRecord]:
        """Get a blood pressure record by ID."""
        query = db.query(BloodPressureRecord).filter(BloodPressureRecord.id == record_id)
        if user_id:
            query = query.filter(BloodPressureRecord.user_id == user_id)
        return query.first()

    @staticmethod
    def get_user_records(
        db: Session,
        user_id: UUID,
        skip: int = 0,
        limit: int = 20,
    ) -> List[BloodPressureRecord]:
        """Get blood pressure records for a specific user."""
        return (
            db.query(BloodPressureRecord)
            .filter(BloodPressureRecord.user_id == user_id)
            .order_by(desc(BloodPressureRecord.recorded_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def update_record(
        db: Session,
        record_id: UUID,
        user_id: UUID,
        record_data: BloodPressureRecordUpdate,
    ) -> Optional[BloodPressureRecord]:
        """Update a blood pressure record."""
        record = db.query(BloodPressureRecord).filter(
            BloodPressureRecord.id == record_id, BloodPressureRecord.user_id == user_id
        ).first()
        
        if not record:
            return None

        update_data = record_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(record, field, value)

        record.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def delete_record(
        db: Session, record_id: UUID, user_id: UUID
    ) -> bool:
        """Delete a blood pressure record."""
        record = db.query(BloodPressureRecord).filter(
            BloodPressureRecord.id == record_id, BloodPressureRecord.user_id == user_id
        ).first()
        
        if not record:
            return False

        db.delete(record)
        db.commit()
        return True

