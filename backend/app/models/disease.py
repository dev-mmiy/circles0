"""
Simple Disease model for disease management.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.user import User


class Disease(Base):
    """Simple Disease model."""
    
    __tablename__ = "diseases"
    
    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # Basic information
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    def __repr__(self) -> str:
        return f"<Disease(id={self.id}, name={self.name})>"


class UserDisease(Base):
    """Simple User-Disease relationship model."""
    
    __tablename__ = "user_diseases"
    
    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    disease_id: Mapped[int] = mapped_column(Integer, ForeignKey("diseases.id"), nullable=False)
    
    # Relationship information
    diagnosis_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    severity: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relationships
    user = relationship("User", back_populates="user_diseases")
    disease = relationship("Disease", back_populates="user_diseases")
    
    def __repr__(self) -> str:
        return f"<UserDisease(id={self.id}, user_id={self.user_id}, disease_id={self.disease_id})>"


# Add relationships to existing models
User.user_diseases = relationship("UserDisease", back_populates="user")
Disease.user_diseases = relationship("UserDisease", back_populates="disease")
