"""
Service for meal record operations.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.meal_record import MealRecord
from app.schemas.meal_record import MealRecordCreate, MealRecordUpdate


class MealRecordService:
    """Service for meal record-related operations."""

    @staticmethod
    def create_meal_record(
        db: Session, user_id: UUID, record_data: MealRecordCreate
    ) -> MealRecord:
        """Create a new meal record."""
        # Convert foods and nutrition to JSON-compatible format
        foods_json = None
        if record_data.foods:
            foods_json = [food.model_dump() for food in record_data.foods]
        
        nutrition_json = None
        if record_data.nutrition:
            nutrition_json = record_data.nutrition.model_dump()

        meal_record = MealRecord(
            user_id=user_id,
            recorded_at=record_data.recorded_at,
            meal_type=record_data.meal_type,
            foods=foods_json,
            nutrition=nutrition_json,
            notes=record_data.notes,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(meal_record)
        db.commit()
        db.refresh(meal_record)
        return meal_record

    @staticmethod
    def get_meal_record_by_id(
        db: Session, record_id: UUID, user_id: Optional[UUID] = None
    ) -> Optional[MealRecord]:
        """Get a meal record by ID."""
        query = db.query(MealRecord).filter(MealRecord.id == record_id)
        if user_id:
            query = query.filter(MealRecord.user_id == user_id)
        return query.first()

    @staticmethod
    def get_user_meal_records(
        db: Session,
        user_id: UUID,
        skip: int = 0,
        limit: int = 20,
    ) -> List[MealRecord]:
        """Get meal records for a specific user."""
        return (
            db.query(MealRecord)
            .filter(MealRecord.user_id == user_id)
            .order_by(desc(MealRecord.recorded_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def update_meal_record(
        db: Session,
        record_id: UUID,
        user_id: UUID,
        record_data: MealRecordUpdate,
    ) -> Optional[MealRecord]:
        """Update a meal record."""
        record = db.query(MealRecord).filter(
            MealRecord.id == record_id, MealRecord.user_id == user_id
        ).first()
        
        if not record:
            return None

        update_data = record_data.model_dump(exclude_unset=True)
        
        # Convert foods and nutrition to JSON-compatible format
        if "foods" in update_data and update_data["foods"] is not None:
            update_data["foods"] = [food.model_dump() if hasattr(food, 'model_dump') else food for food in update_data["foods"]]
        
        if "nutrition" in update_data and update_data["nutrition"] is not None:
            if hasattr(update_data["nutrition"], 'model_dump'):
                update_data["nutrition"] = update_data["nutrition"].model_dump()
        
        for field, value in update_data.items():
            setattr(record, field, value)

        record.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def delete_meal_record(
        db: Session, record_id: UUID, user_id: UUID
    ) -> bool:
        """Delete a meal record."""
        record = db.query(MealRecord).filter(
            MealRecord.id == record_id, MealRecord.user_id == user_id
        ).first()
        
        if not record:
            return False

        db.delete(record)
        db.commit()
        return True

