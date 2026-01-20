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
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[HeartRateRecord]:
        """Get heart rate records for a specific user."""
        query = db.query(HeartRateRecord).filter(
            HeartRateRecord.user_id == user_id
        )
        
        # 日付範囲フィルタを追加
        # start_dateはその日の00:00:00から、end_dateはその日の23:59:59.999999までを含める
        from datetime import timezone
        
        if start_date:
            if start_date.tzinfo is not None:
                start_date_utc = start_date.astimezone(timezone.utc)
                start_date_only = start_date_utc.replace(hour=0, minute=0, second=0, microsecond=0)
            else:
                start_date_only = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
            query = query.filter(HeartRateRecord.recorded_at >= start_date_only)
        if end_date:
            if end_date.tzinfo is not None:
                end_date_utc = end_date.astimezone(timezone.utc)
                end_date_inclusive = end_date_utc.replace(hour=23, minute=59, second=59, microsecond=999999)
            else:
                end_date_inclusive = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            query = query.filter(HeartRateRecord.recorded_at <= end_date_inclusive)
        
        return (
            query
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

