"""
Service for blood glucose record operations.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.blood_glucose_record import BloodGlucoseRecord
from app.schemas.blood_glucose_record import BloodGlucoseRecordCreate, BloodGlucoseRecordUpdate


class BloodGlucoseRecordService:
    """Service for blood glucose record-related operations."""

    @staticmethod
    def create_record(
        db: Session, user_id: UUID, record_data: BloodGlucoseRecordCreate
    ) -> BloodGlucoseRecord:
        """Create a new blood glucose record."""
        record = BloodGlucoseRecord(
            user_id=user_id,
            recorded_at=record_data.recorded_at,
            value=record_data.value,
            timing=record_data.timing,
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
    ) -> Optional[BloodGlucoseRecord]:
        """Get a blood glucose record by ID."""
        query = db.query(BloodGlucoseRecord).filter(BloodGlucoseRecord.id == record_id)
        if user_id:
            query = query.filter(BloodGlucoseRecord.user_id == user_id)
        return query.first()

    @staticmethod
    def get_user_records(
        db: Session,
        user_id: UUID,
        skip: int = 0,
        limit: int = 20,
    ) -> List[BloodGlucoseRecord]:
        """Get blood glucose records for a specific user."""
        return (
            db.query(BloodGlucoseRecord)
            .filter(BloodGlucoseRecord.user_id == user_id)
            .order_by(desc(BloodGlucoseRecord.recorded_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def update_record(
        db: Session,
        record_id: UUID,
        user_id: UUID,
        record_data: BloodGlucoseRecordUpdate,
    ) -> Optional[BloodGlucoseRecord]:
        """Update a blood glucose record."""
        record = db.query(BloodGlucoseRecord).filter(
            BloodGlucoseRecord.id == record_id, BloodGlucoseRecord.user_id == user_id
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
        """Delete a blood glucose record."""
        record = db.query(BloodGlucoseRecord).filter(
            BloodGlucoseRecord.id == record_id, BloodGlucoseRecord.user_id == user_id
        ).first()
        
        if not record:
            return False

        db.delete(record)
        db.commit()
        return True

