"""
Service for temperature record operations.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.temperature_record import TemperatureRecord
from app.schemas.temperature_record import TemperatureRecordCreate, TemperatureRecordUpdate


class TemperatureRecordService:
    """Service for temperature record-related operations."""

    @staticmethod
    def create_record(
        db: Session, user_id: UUID, record_data: TemperatureRecordCreate
    ) -> TemperatureRecord:
        """Create a new temperature record."""
        record = TemperatureRecord(
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
    ) -> Optional[TemperatureRecord]:
        """Get a temperature record by ID."""
        query = db.query(TemperatureRecord).filter(TemperatureRecord.id == record_id)
        if user_id:
            query = query.filter(TemperatureRecord.user_id == user_id)
        return query.first()

    @staticmethod
    def get_user_records(
        db: Session,
        user_id: UUID,
        skip: int = 0,
        limit: int = 20,
    ) -> List[TemperatureRecord]:
        """Get temperature records for a specific user."""
        return (
            db.query(TemperatureRecord)
            .filter(TemperatureRecord.user_id == user_id)
            .order_by(desc(TemperatureRecord.recorded_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def update_record(
        db: Session,
        record_id: UUID,
        user_id: UUID,
        record_data: TemperatureRecordUpdate,
    ) -> Optional[TemperatureRecord]:
        """Update a temperature record."""
        record = db.query(TemperatureRecord).filter(
            TemperatureRecord.id == record_id, TemperatureRecord.user_id == user_id
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
        """Delete a temperature record."""
        record = db.query(TemperatureRecord).filter(
            TemperatureRecord.id == record_id, TemperatureRecord.user_id == user_id
        ).first()
        
        if not record:
            return False

        db.delete(record)
        db.commit()
        return True

