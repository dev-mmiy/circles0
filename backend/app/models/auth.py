"""
Authentication Models

This module defines the authentication-related database models
using fastapi-users for session-based authentication.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from fastapi_users.db import SQLAlchemyBaseUserTableUUID

from app.database import Base


class User(SQLAlchemyBaseUserTableUUID, Base):
    """
    User model for authentication and user management.
    
    Extends SQLAlchemyBaseUserTableUUID to provide:
    - UUID primary key
    - Email field with unique constraint
    - Hashed password field
    - Is active/superuser flags
    - Created/updated timestamps
    """
    
    __tablename__ = "users"
    
    # Additional fields beyond the base user table
    first_name: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    date_of_birth: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user_diseases = relationship("UserDisease", back_populates="user")
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"
