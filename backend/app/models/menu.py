"""
Menu models for menu and recipe management.
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


class Menu(Base):
    """
    Menu master table.
    
    Stores menus/dishes that can be used in meals.
    Can be shared (user_id=None) or user-specific (user_id set).
    """

    __tablename__ = "menus"

    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="null = shared menu, set = user-specific menu",
    )
    name = Column(String(200), nullable=False, comment="Menu name (e.g., 'Curry', 'Miso Soup')")
    description = Column(Text, nullable=True, comment="Menu description")
    image_url = Column(String(500), nullable=True, comment="Menu image URL")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    user = relationship("User", back_populates="menus")
    ingredients = relationship(
        "MenuIngredient", back_populates="menu", cascade="all, delete-orphan"
    )
    nutrition = relationship("MenuNutrition", back_populates="menu", cascade="all, delete-orphan")


class MenuIngredient(Base):
    """
    Menu and food relationship (many-to-many).
    
    Stores which foods and how much are used in a menu.
    """

    __tablename__ = "menu_ingredients"

    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    menu_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("menus.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    food_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("foods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount = Column(
        Numeric(10, 2),
        nullable=False,
        comment="Amount (e.g., 100, 1, 150)",
    )
    unit = Column(String(20), nullable=False, comment="Unit (e.g., 'g', '個', '大さじ')")
    display_order = Column(Integer, nullable=False, default=0, comment="Display order")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    menu = relationship("Menu", back_populates="ingredients")
    food = relationship("Food")


class MenuNutrition(Base):
    """
    Menu nutrition information per unit.
    
    Stores nutrition values for different units (e.g., 1 serving, 1 portion, 100g).
    Can be pre-calculated from ingredients or manually entered.
    """

    __tablename__ = "menu_nutrition"

    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    menu_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("menus.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    unit = Column(
        String(20),
        nullable=False,
        comment="Unit (e.g., '1食', '1人前', '100g')",
    )
    base_amount = Column(
        Numeric(10, 2),
        nullable=False,
        comment="Base amount for this unit (e.g., 1, 1, 100)",
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
    menu = relationship("Menu", back_populates="nutrition")

