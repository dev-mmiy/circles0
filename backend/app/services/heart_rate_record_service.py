"""
Service for heart rate record operations.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.heart_rate_record import HeartRateRecord
from app.schemas.heart_rate_record import HeartRateRecordCreate, HeartRateRecordUpdate


class HeartRateRecordService:
    """Service for heart rate record-related operations."""

    @staticmethod
    def create_record(
        db: Session, user_id: UUID, record_data: HeartRateRecordCreate
    ) -> HeartRateRecord:
        """Create a new heart rate record."""
        record = HeartRateRecord(
            user_id=user_id,
            recorded_at=record_data.recorded_at,
            bpm=record_data.bpm,
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
    ) -> Optional[HeartRateRecord]:
        """Get a heart rate record by ID."""
        query = db.query(HeartRateRecord).filter(HeartRateRecord.id == record_id)
        if user_id:
            query = query.filter(HeartRateRecord.user_id == user_id)
        return query.first()

    @staticmethod
    def get_user_records(
        db: Session,
        user_id: UUID,
        skip: int = 0,
        limit: int = 20,
    ) -> List[HeartRateRecord]:
        """Get heart rate records for a specific user."""
        return (
            db.query(HeartRateRecord)
            .filter(HeartRateRecord.user_id == user_id)
            .order_by(desc(HeartRateRecord.recorded_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def update_record(
        db: Session,
        record_id: UUID,
        user_id: UUID,
        record_data: HeartRateRecordUpdate,
    ) -> Optional[HeartRateRecord]:
        """Update a heart rate record."""
        record = db.query(HeartRateRecord).filter(
            HeartRateRecord.id == record_id, HeartRateRecord.user_id == user_id
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
        """Delete a heart rate record."""
        record = db.query(HeartRateRecord).filter(
            HeartRateRecord.id == record_id, HeartRateRecord.user_id == user_id
        ).first()
        
        if not record:
            return False

        db.delete(record)
        db.commit()
        return True

