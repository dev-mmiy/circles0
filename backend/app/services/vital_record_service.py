"""
Service for vital record operations.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.vital_record import VitalRecord
from app.schemas.vital_record import VitalRecordCreate, VitalRecordUpdate


class VitalRecordService:
    """Service for vital record-related operations."""

    @staticmethod
    def create_vital_record(
        db: Session, user_id: UUID, record_data: VitalRecordCreate
    ) -> VitalRecord:
        """Create a new vital record."""
        vital_record = VitalRecord(
            user_id=user_id,
            recorded_at=record_data.recorded_at,
            blood_pressure_systolic=record_data.blood_pressure_systolic,
            blood_pressure_diastolic=record_data.blood_pressure_diastolic,
            heart_rate=record_data.heart_rate,
            temperature=record_data.temperature,
            weight=record_data.weight,
            body_fat_percentage=record_data.body_fat_percentage,
            blood_glucose=record_data.blood_glucose,
            blood_glucose_timing=record_data.blood_glucose_timing,
            spo2=record_data.spo2,
            notes=record_data.notes,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(vital_record)
        db.commit()
        db.refresh(vital_record)
        return vital_record

    @staticmethod
    def get_vital_record_by_id(
        db: Session, record_id: UUID, user_id: Optional[UUID] = None
    ) -> Optional[VitalRecord]:
        """Get a vital record by ID."""
        query = db.query(VitalRecord).filter(VitalRecord.id == record_id)
        if user_id:
            query = query.filter(VitalRecord.user_id == user_id)
        return query.first()

    @staticmethod
    def get_user_vital_records(
        db: Session,
        user_id: UUID,
        skip: int = 0,
        limit: int = 20,
    ) -> List[VitalRecord]:
        """Get vital records for a specific user."""
        return (
            db.query(VitalRecord)
            .filter(VitalRecord.user_id == user_id)
            .order_by(desc(VitalRecord.recorded_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def update_vital_record(
        db: Session,
        record_id: UUID,
        user_id: UUID,
        record_data: VitalRecordUpdate,
    ) -> Optional[VitalRecord]:
        """Update a vital record."""
        record = db.query(VitalRecord).filter(
            VitalRecord.id == record_id, VitalRecord.user_id == user_id
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
    def delete_vital_record(
        db: Session, record_id: UUID, user_id: UUID
    ) -> bool:
        """Delete a vital record."""
        record = db.query(VitalRecord).filter(
            VitalRecord.id == record_id, VitalRecord.user_id == user_id
        ).first()
        
        if not record:
            return False

        db.delete(record)
        db.commit()
        return True

