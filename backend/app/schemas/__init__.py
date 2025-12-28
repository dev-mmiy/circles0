"""
Pydantic schemas package.
"""

from .disease import (
    DiseaseBase,
    DiseaseCategoryBase,
    DiseaseCategoryCreate,
    DiseaseCategoryResponse,
    DiseaseCategoryTranslationBase,
    DiseaseCategoryTranslationResponse,
    DiseaseCategoryUpdate,
    DiseaseCreate,
    DiseaseResponse,
    DiseaseStatusBase,
    DiseaseStatusCreate,
    DiseaseStatusResponse,
    DiseaseStatusTranslationBase,
    DiseaseStatusTranslationResponse,
    DiseaseStatusUpdate,
    DiseaseTranslationBase,
    DiseaseTranslationResponse,
    DiseaseUpdate,
    UserDiseaseBase,
    UserDiseaseCreate,
    UserDiseasePublicResponse,
    UserDiseaseResponse,
    UserDiseaseUpdate,
)
from .user import UserBase, UserCreate, UserPublicResponse, UserResponse, UserUpdate

__all__ = [
    # User schemas
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserPublicResponse",
    # Disease schemas
    "DiseaseBase",
    "DiseaseCreate",
    "DiseaseUpdate",
    "DiseaseResponse",
    "DiseaseTranslationBase",
    "DiseaseTranslationResponse",
    # Disease Category schemas
    "DiseaseCategoryBase",
    "DiseaseCategoryCreate",
    "DiseaseCategoryUpdate",
    "DiseaseCategoryResponse",
    "DiseaseCategoryTranslationBase",
    "DiseaseCategoryTranslationResponse",
    # Disease Status schemas
    "DiseaseStatusBase",
    "DiseaseStatusCreate",
    "DiseaseStatusUpdate",
    "DiseaseStatusResponse",
    "DiseaseStatusTranslationBase",
    "DiseaseStatusTranslationResponse",
    # User Disease schemas
    "UserDiseaseBase",
    "UserDiseaseCreate",
    "UserDiseaseUpdate",
    "UserDiseaseResponse",
    "UserDiseasePublicResponse",
]
