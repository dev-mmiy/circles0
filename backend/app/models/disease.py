"""
Disease models for disease management with internationalization support.
"""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.user import User


class Disease(Base):
    """
    Disease master data model.

    Contains core disease information with support for ICD-10 codes
    and severity levels.
    """

    __tablename__ = "diseases"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Disease code (e.g., ICD-10)
    disease_code: Mapped[Optional[str]] = mapped_column(
        String(20), unique=True, nullable=True, index=True
    )

    # Disease name (English, for internal use)
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)

    # Basic information (deprecated - use translations instead)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Severity level (1: mild, 5: severe)
    severity_level: Mapped[Optional[int]] = mapped_column(
        Integer,
        CheckConstraint("severity_level >= 1 AND severity_level <= 5"),
        nullable=True,
    )

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.current_timestamp(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Disease(id={self.id}, code={self.disease_code}, name={self.name})>"


class DiseaseTranslation(Base):
    """
    Disease translations for internationalization.

    Stores translated disease names and descriptions for different languages.
    """

    __tablename__ = "disease_translations"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Foreign key
    disease_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("diseases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Language code (e.g., 'ja', 'en', 'ko', 'zh')
    language_code: Mapped[str] = mapped_column(String(5), nullable=False, index=True)

    # Translated name
    translated_name: Mapped[str] = mapped_column(String(200), nullable=False)

    # Disease details/description
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.current_timestamp(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )

    # Relationships
    disease = relationship("Disease", back_populates="translations")

    def __repr__(self) -> str:
        return f"<DiseaseTranslation(disease_id={self.disease_id}, lang={self.language_code}, name={self.translated_name})>"


class DiseaseCategory(Base):
    """
    Disease categories with hierarchical structure support.

    Allows organizing diseases into categories and subcategories.
    """

    __tablename__ = "disease_categories"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Category code (internal system use)
    category_code: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )

    # Parent category ID (for hierarchical structure)
    parent_category_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("disease_categories.id"), nullable=True, index=True
    )

    # Display order
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.current_timestamp(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )

    # Relationships
    parent = relationship(
        "DiseaseCategory", remote_side=[id], back_populates="children"
    )
    children = relationship("DiseaseCategory", back_populates="parent")

    def __repr__(self) -> str:
        return f"<DiseaseCategory(id={self.id}, code={self.category_code})>"


class DiseaseCategoryTranslation(Base):
    """
    Disease category translations for internationalization.
    """

    __tablename__ = "disease_category_translations"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Foreign key
    category_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("disease_categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Language code
    language_code: Mapped[str] = mapped_column(String(5), nullable=False, index=True)

    # Translated category name
    translated_name: Mapped[str] = mapped_column(String(100), nullable=False)

    # Category description
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.current_timestamp(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )

    # Relationships
    category = relationship("DiseaseCategory", back_populates="translations")

    def __repr__(self) -> str:
        return f"<DiseaseCategoryTranslation(category_id={self.category_id}, lang={self.language_code}, name={self.translated_name})>"


class DiseaseCategoryMapping(Base):
    """
    Disease-Category relationship mapping.

    Associates diseases with categories (many-to-many).
    """

    __tablename__ = "disease_category_mappings"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Foreign keys
    disease_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("diseases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("disease_categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.current_timestamp(), nullable=False
    )

    # Relationships
    disease = relationship("Disease", back_populates="category_mappings")
    category = relationship("DiseaseCategory", back_populates="disease_mappings")

    def __repr__(self) -> str:
        return f"<DiseaseCategoryMapping(disease_id={self.disease_id}, category_id={self.category_id})>"


class DiseaseStatus(Base):
    """
    Disease status master data (e.g., active, remission, cured, chronic, under_treatment).
    """

    __tablename__ = "disease_statuses"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Status code (internal system use)
    status_code: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )

    # Display order
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.current_timestamp(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<DiseaseStatus(id={self.id}, code={self.status_code})>"


class DiseaseStatusTranslation(Base):
    """
    Disease status translations for internationalization.
    """

    __tablename__ = "disease_status_translations"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Foreign key
    status_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("disease_statuses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Language code
    language_code: Mapped[str] = mapped_column(String(5), nullable=False, index=True)

    # Translated status name
    translated_name: Mapped[str] = mapped_column(String(100), nullable=False)

    # Status description
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.current_timestamp(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )

    # Relationships
    status = relationship("DiseaseStatus", back_populates="translations")

    def __repr__(self) -> str:
        return f"<DiseaseStatusTranslation(status_id={self.status_id}, lang={self.language_code}, name={self.translated_name})>"


class UserDisease(Base):
    """
    User-Disease relationship model with detailed medical information.
    """

    __tablename__ = "user_diseases"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Foreign keys
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    disease_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("diseases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("disease_statuses.id"), nullable=True, index=True
    )

    # Diagnosis information
    diagnosis_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    diagnosis_doctor: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    diagnosis_hospital: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True
    )

    # Severity level (1: mild, 5: severe)
    severity_level: Mapped[Optional[int]] = mapped_column(
        Integer,
        CheckConstraint("severity_level >= 1 AND severity_level <= 5"),
        nullable=True,
    )

    # Symptom and limitation information
    symptoms: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    limitations: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    medications: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Legacy fields (for backward compatibility)
    severity: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # Deprecated
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Privacy settings
    is_public: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
    )  # Visible to other users
    is_searchable: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, index=True
    )  # Searchable by disease

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.current_timestamp(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )

    # Relationships
    user = relationship("User", back_populates="diseases", overlaps="user_diseases")
    disease = relationship("Disease", back_populates="user_diseases")
    status = relationship("DiseaseStatus", back_populates="user_diseases")

    def __repr__(self) -> str:
        return f"<UserDisease(id={self.id}, user_id={self.user_id}, disease_id={self.disease_id})>"


# Add relationships to existing models
User.diseases = relationship(
    "UserDisease", back_populates="user", cascade="all, delete-orphan"
)

Disease.translations = relationship(
    "DiseaseTranslation", back_populates="disease", cascade="all, delete-orphan"
)
Disease.user_diseases = relationship("UserDisease", back_populates="disease")
Disease.category_mappings = relationship(
    "DiseaseCategoryMapping", back_populates="disease", cascade="all, delete-orphan"
)

DiseaseCategory.translations = relationship(
    "DiseaseCategoryTranslation",
    back_populates="category",
    cascade="all, delete-orphan",
)
DiseaseCategory.disease_mappings = relationship(
    "DiseaseCategoryMapping", back_populates="category", cascade="all, delete-orphan"
)

DiseaseStatus.translations = relationship(
    "DiseaseStatusTranslation", back_populates="status", cascade="all, delete-orphan"
)
DiseaseStatus.user_diseases = relationship("UserDisease", back_populates="status")
