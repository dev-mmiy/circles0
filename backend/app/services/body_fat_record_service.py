"""
Service for body fat percentage record operations.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.body_fat_record import BodyFatRecord
from app.schemas.body_fat_record import BodyFatRecordCreate, BodyFatRecordUpdate


class BodyFatRecordService:
    """Service for body fat percentage record-related operations."""

    @staticmethod
    def create_record(
        db: Session, user_id: UUID, record_data: BodyFatRecordCreate
    ) -> BodyFatRecord:
        """Create a new body fat percentage record."""
        record = BodyFatRecord(
            user_id=user_id,
            recorded_at=record_data.recorded_at,
            percentage=record_data.percentage,
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
    ) -> Optional[BodyFatRecord]:
        """Get a body fat percentage record by ID."""
        query = db.query(BodyFatRecord).filter(BodyFatRecord.id == record_id)
        if user_id:
            query = query.filter(BodyFatRecord.user_id == user_id)
        return query.first()

    @staticmethod
    def get_user_records(
        db: Session,
        user_id: UUID,
        skip: int = 0,
        limit: int = 20,
    ) -> List[BodyFatRecord]:
        """Get body fat percentage records for a specific user."""
        return (
            db.query(BodyFatRecord)
            .filter(BodyFatRecord.user_id == user_id)
            .order_by(desc(BodyFatRecord.recorded_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def update_record(
        db: Session,
        record_id: UUID,
        user_id: UUID,
        record_data: BodyFatRecordUpdate,
    ) -> Optional[BodyFatRecord]:
        """Update a body fat percentage record."""
        record = db.query(BodyFatRecord).filter(
            BodyFatRecord.id == record_id, BodyFatRecord.user_id == user_id
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
        """Delete a body fat percentage record."""
        record = db.query(BodyFatRecord).filter(
            BodyFatRecord.id == record_id, BodyFatRecord.user_id == user_id
        ).first()
        
        if not record:
            return False

        db.delete(record)
        db.commit()
        return True

