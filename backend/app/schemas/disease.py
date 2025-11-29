"""
Disease schemas with internationalization support.
"""

from datetime import date, datetime, timezone
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer


# Disease Translation Schemas
class DiseaseTranslationBase(BaseModel):
    """Base schema for disease translations."""

    language_code: str = Field(..., min_length=2, max_length=5)
    translated_name: str = Field(..., min_length=1, max_length=200)
    details: Optional[str] = None


class DiseaseTranslationResponse(DiseaseTranslationBase):
    """Schema for disease translation responses."""

    id: int
    disease_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("created_at", "updated_at", when_used="json")
    def serialize_datetime(self, value: datetime, _info) -> str:
        """Serialize datetime to ISO format with 'Z' suffix."""
        if value.tzinfo is None:
            return value.isoformat() + "Z"
        else:
            utc_value = value.astimezone(timezone.utc)
            return utc_value.replace(tzinfo=None).isoformat() + "Z"


# Disease Schemas
class DiseaseBase(BaseModel):
    """Base disease schema."""

    name: str = Field(..., min_length=1, max_length=200)
    disease_code: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    category: Optional[str] = None
    severity_level: Optional[int] = Field(None, ge=1, le=5)


class DiseaseCreate(DiseaseBase):
    """Schema for creating a disease."""

    pass


class DiseaseUpdate(BaseModel):
    """Schema for updating a disease."""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    disease_code: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    category: Optional[str] = None
    severity_level: Optional[int] = Field(None, ge=1, le=5)
    is_active: Optional[bool] = None


class DiseaseResponse(DiseaseBase):
    """Schema for disease responses."""

    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    translations: List[DiseaseTranslationResponse] = []

    model_config = {"from_attributes": True}

    @field_serializer("created_at", "updated_at", when_used="json")
    def serialize_datetime(self, value: datetime, _info) -> str:
        """Serialize datetime to ISO format with 'Z' suffix."""
        if value.tzinfo is None:
            return value.isoformat() + "Z"
        else:
            utc_value = value.astimezone(timezone.utc)
            return utc_value.replace(tzinfo=None).isoformat() + "Z"


# Disease Category Schemas
class DiseaseCategoryTranslationBase(BaseModel):
    """Base schema for category translations."""

    language_code: str = Field(..., min_length=2, max_length=5)
    translated_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class DiseaseCategoryTranslationResponse(DiseaseCategoryTranslationBase):
    """Schema for category translation responses."""

    id: int
    category_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DiseaseCategoryBase(BaseModel):
    """Base disease category schema."""

    category_code: str = Field(..., min_length=1, max_length=50)
    parent_category_id: Optional[int] = None
    display_order: int = 0
    is_active: bool = True


class DiseaseCategoryCreate(DiseaseCategoryBase):
    """Schema for creating a disease category."""

    pass


class DiseaseCategoryUpdate(BaseModel):
    """Schema for updating a disease category."""

    category_code: Optional[str] = Field(None, min_length=1, max_length=50)
    parent_category_id: Optional[int] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class DiseaseCategoryResponse(DiseaseCategoryBase):
    """Schema for disease category responses."""

    id: int
    created_at: datetime
    updated_at: datetime
    translations: List[DiseaseCategoryTranslationResponse] = []

    model_config = {"from_attributes": True}


# Disease Status Schemas
class DiseaseStatusTranslationBase(BaseModel):
    """Base schema for status translations."""

    language_code: str = Field(..., min_length=2, max_length=5)
    translated_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class DiseaseStatusTranslationResponse(DiseaseStatusTranslationBase):
    """Schema for status translation responses."""

    id: int
    status_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DiseaseStatusBase(BaseModel):
    """Base disease status schema."""

    status_code: str = Field(..., min_length=1, max_length=50)
    display_order: int = 0
    is_active: bool = True


class DiseaseStatusCreate(DiseaseStatusBase):
    """Schema for creating a disease status."""

    pass


class DiseaseStatusUpdate(BaseModel):
    """Schema for updating a disease status."""

    status_code: Optional[str] = Field(None, min_length=1, max_length=50)
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class DiseaseStatusResponse(DiseaseStatusBase):
    """Schema for disease status responses."""

    id: int
    created_at: datetime
    updated_at: datetime
    translations: List[DiseaseStatusTranslationResponse] = []

    model_config = {"from_attributes": True}


# User Disease Schemas
class UserDiseaseBase(BaseModel):
    """Base user disease schema."""

    disease_id: int
    status_id: Optional[int] = None
    diagnosis_date: Optional[date] = None
    diagnosis_doctor: Optional[str] = Field(None, max_length=200)
    diagnosis_hospital: Optional[str] = Field(None, max_length=200)
    severity_level: Optional[int] = Field(None, ge=1, le=5)
    symptoms: Optional[str] = None
    limitations: Optional[str] = None
    medications: Optional[str] = None
    course: Optional[str] = None  # Disease course/progress
    notes: Optional[str] = None
    is_public: bool = False
    is_searchable: bool = True


class UserDiseaseCreate(UserDiseaseBase):
    """Schema for creating a user disease."""

    pass


class UserDiseaseUpdate(BaseModel):
    """Schema for updating a user disease."""

    status_id: Optional[int] = None
    diagnosis_date: Optional[date] = None
    diagnosis_doctor: Optional[str] = Field(None, max_length=200)
    diagnosis_hospital: Optional[str] = Field(None, max_length=200)
    severity_level: Optional[int] = Field(None, ge=1, le=5)
    symptoms: Optional[str] = None
    limitations: Optional[str] = None
    medications: Optional[str] = None
    course: Optional[str] = None  # Disease course/progress
    notes: Optional[str] = None
    is_public: Optional[bool] = None
    is_searchable: Optional[bool] = None
    is_active: Optional[bool] = None


class UserDiseaseResponse(UserDiseaseBase):
    """Schema for user disease responses."""

    id: int
    user_id: UUID  # Accept UUID, will be serialized as string
    disease: Optional[DiseaseResponse] = None
    status: Optional[DiseaseStatusResponse] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    @field_serializer("user_id")
    def serialize_user_id(self, value: UUID) -> str:
        """Convert UUID to string."""
        return str(value)

    model_config = {"from_attributes": True}


class UserDiseasePublicResponse(BaseModel):
    """Schema for public user disease information (limited)."""

    id: int
    disease: Optional[DiseaseResponse] = None
    diagnosis_date: Optional[date] = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("created_at", when_used="json")
    def serialize_datetime(self, value: datetime, _info) -> str:
        """Serialize datetime to ISO format with 'Z' suffix."""
        if value.tzinfo is None:
            return value.isoformat() + "Z"
        else:
            utc_value = value.astimezone(timezone.utc)
            return utc_value.replace(tzinfo=None).isoformat() + "Z"
