"""
Meal record models for daily meal tracking.
"""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class MealRecord(Base):
    """
    Meal record model for daily meal tracking.
    
    Stores meal information including foods, nutrition, and meal type.
    Separate from posts to allow dedicated forms and better data structure.
    """

    __tablename__ = "meal_records"

    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recorded_at = Column(DateTime, nullable=False, index=True, comment="When the meal was consumed")
    
    # Meal Type
    meal_type = Column(
        String(20),
        nullable=False,
        comment="Type of meal: 'breakfast', 'lunch', 'dinner', 'snack'"
    )
    
    # Foods (stored as JSON array) - DEPRECATED: Use items instead
    foods = Column(
        JSONB,
        nullable=True,
        comment="Array of foods consumed: [{'name': str, 'amount': float, 'unit': str}, ...] - DEPRECATED: Use items instead"
    )
    
    # Items (stored as JSON array) - Can contain both menus and foods
    items = Column(
        JSONB,
        nullable=True,
        comment="Array of items consumed: [{'type': 'menu'|'food', 'id': UUID, 'name': str, 'amount': float, 'unit': str, 'nutrition': {...}}, ...]"
    )
    
    # Nutrition (stored as JSON)
    nutrition = Column(
        JSONB,
        nullable=True,
        comment="Nutrition information: {'calories': int, 'protein': float, 'carbs': float, 'fat': float}"
    )
    
    # Notes
    notes = Column(Text, nullable=True, comment="Optional notes about the meal")
    
    # Visibility
    visibility = Column(
        String(20),
        nullable=False,
        default="public",
        comment="public, followers_only, private",
    )
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    user = relationship("User", back_populates="meal_records")

