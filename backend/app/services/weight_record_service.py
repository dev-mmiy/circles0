"""
Service for weight record operations.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.weight_record import WeightRecord
from app.schemas.weight_record import WeightRecordCreate, WeightRecordUpdate


class WeightRecordService:
    """Service for weight record-related operations."""

    @staticmethod
    def create_record(
        db: Session, user_id: UUID, record_data: WeightRecordCreate
    ) -> WeightRecord:
        """Create a new weight record."""
        record = WeightRecord(
            user_id=user_id,
            recorded_at=record_data.recorded_at,
            value=record_data.value,
            unit=record_data.unit,
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
    ) -> Optional[WeightRecord]:
        """Get a weight record by ID."""
        query = db.query(WeightRecord).filter(WeightRecord.id == record_id)
        if user_id:
            query = query.filter(WeightRecord.user_id == user_id)
        return query.first()

    @staticmethod
    def get_user_records(
        db: Session,
        user_id: UUID,
        skip: int = 0,
        limit: int = 20,
    ) -> List[WeightRecord]:
        """Get weight records for a specific user."""
        return (
            db.query(WeightRecord)
            .filter(WeightRecord.user_id == user_id)
            .order_by(desc(WeightRecord.recorded_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def update_record(
        db: Session,
        record_id: UUID,
        user_id: UUID,
        record_data: WeightRecordUpdate,
    ) -> Optional[WeightRecord]:
        """Update a weight record."""
        record = db.query(WeightRecord).filter(
            WeightRecord.id == record_id, WeightRecord.user_id == user_id
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
        """Delete a weight record."""
        record = db.query(WeightRecord).filter(
            WeightRecord.id == record_id, WeightRecord.user_id == user_id
        ).first()

        if not record:
            return False

        db.delete(record)
        db.commit()
        return True
