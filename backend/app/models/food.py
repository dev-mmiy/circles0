"""
Food models for food and menu management.
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
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import relationship

from app.database import Base


class Food(Base):
    """
    Food master table.
    
    Stores food items that can be used in meals.
    Can be shared (user_id=None) or user-specific (user_id set).
    """

    __tablename__ = "foods"

    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="null = shared food, set = user-specific food",
    )
    name = Column(String(200), nullable=False, comment="Food name (e.g., 'Rice', 'Apple')")
    category = Column(
        String(50),
        nullable=True,
        comment="Food category (e.g., 'Grains', 'Fruits', 'Vegetables')",
    )
    description = Column(Text, nullable=True, comment="Food description")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    user = relationship("User", back_populates="foods")
    nutrition = relationship("FoodNutrition", back_populates="food", cascade="all, delete-orphan")


class FoodNutrition(Base):
    """
    Food nutrition information per unit.
    
    Stores nutrition values for different units (e.g., 100g, 1 piece, 1 tablespoon).
    """

    __tablename__ = "food_nutrition"

    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    food_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("foods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    unit = Column(
        String(20),
        nullable=False,
        comment="Unit (e.g., '100g', '1個', '1本', '大さじ1')",
    )
    base_amount = Column(
        Numeric(10, 2),
        nullable=False,
        comment="Base amount for this unit (e.g., 100, 1, 1, 1)",
    )
    calories = Column(Numeric(10, 2), nullable=True, comment="Calories")
    protein = Column(Numeric(10, 2), nullable=True, comment="Protein (g)")
    carbs = Column(Numeric(10, 2), nullable=True, comment="Carbohydrates (g)")
    fat = Column(Numeric(10, 2), nullable=True, comment="Fat (g)")
    fiber = Column(Numeric(10, 2), nullable=True, comment="Fiber (g)")
    sodium = Column(Numeric(10, 2), nullable=True, comment="Sodium (mg)")
    potassium = Column(Numeric(10, 2), nullable=True, comment="Potassium (mg)")
    phosphorus = Column(Numeric(10, 2), nullable=True, comment="Phosphorus (mg)")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    food = relationship("Food", back_populates="nutrition")

