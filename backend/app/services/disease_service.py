"""
Disease service layer for handling disease-related business logic.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.disease import (
    Disease,
    DiseaseTranslation,
    DiseaseCategory,
    DiseaseCategoryMapping,
)
from app.schemas.disease import (
    DiseaseCreate,
    DiseaseUpdate,
    DiseaseTranslationResponse,
)


class DiseaseService:
    """Service class for disease-related operations."""

    @staticmethod
    def get_all_diseases(
        db: Session,
        language_code: str = "ja",
        active_only: bool = True,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Disease]:
        """
        Get all diseases with optional filtering.

        Args:
            db: Database session
            language_code: Language code for translations (default: ja)
            active_only: Only return active diseases
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of Disease objects
        """
        query = db.query(Disease)

        if active_only:
            query = query.filter(Disease.is_active == True)

        query = query.order_by(Disease.name).offset(skip).limit(limit)

        return query.all()

    @staticmethod
    def get_disease_by_id(
        db: Session, disease_id: int, active_only: bool = True
    ) -> Optional[Disease]:
        """
        Get disease by ID.

        Args:
            db: Database session
            disease_id: Disease ID
            active_only: Only return if active

        Returns:
            Disease object or None
        """
        query = db.query(Disease).filter(Disease.id == disease_id)

        if active_only:
            query = query.filter(Disease.is_active == True)

        return query.first()

    @staticmethod
    def get_disease_translations(
        db: Session, disease_id: int
    ) -> List[DiseaseTranslation]:
        """
        Get all translations for a disease.

        Args:
            db: Database session
            disease_id: Disease ID

        Returns:
            List of DiseaseTranslation objects
        """
        return (
            db.query(DiseaseTranslation)
            .filter(DiseaseTranslation.disease_id == disease_id)
            .order_by(DiseaseTranslation.language_code)
            .all()
        )

    @staticmethod
    def get_disease_translation(
        db: Session, disease_id: int, language_code: str
    ) -> Optional[DiseaseTranslation]:
        """
        Get specific translation for a disease.

        Args:
            db: Database session
            disease_id: Disease ID
            language_code: Language code (e.g., 'ja', 'en')

        Returns:
            DiseaseTranslation object or None
        """
        return (
            db.query(DiseaseTranslation)
            .filter(
                DiseaseTranslation.disease_id == disease_id,
                DiseaseTranslation.language_code == language_code,
            )
            .first()
        )

    @staticmethod
    def get_diseases_by_category(
        db: Session,
        category_id: int,
        active_only: bool = True,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Disease]:
        """
        Get diseases by category.

        Args:
            db: Database session
            category_id: Disease category ID
            active_only: Only return active diseases
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of Disease objects
        """
        query = (
            db.query(Disease)
            .join(
                DiseaseCategoryMapping,
                DiseaseCategoryMapping.disease_id == Disease.id,
            )
            .filter(DiseaseCategoryMapping.category_id == category_id)
        )

        if active_only:
            query = query.filter(Disease.is_active == True)

        query = query.order_by(Disease.name).offset(skip).limit(limit)

        return query.all()

    @staticmethod
    def search_diseases(
        db: Session,
        search_term: str,
        language_code: str = "ja",
        active_only: bool = True,
        limit: int = 50,
    ) -> List[Disease]:
        """
        Search diseases by name or translation.

        Args:
            db: Database session
            search_term: Search term
            language_code: Language code for searching translations
            active_only: Only return active diseases
            limit: Maximum number of results

        Returns:
            List of Disease objects
        """
        # Search in disease name
        query = db.query(Disease).filter(
            Disease.name.ilike(f"%{search_term}%")
        )

        if active_only:
            query = query.filter(Disease.is_active == True)

        base_results = query.limit(limit).all()

        # Also search in translations
        translation_query = (
            db.query(Disease)
            .join(DiseaseTranslation)
            .filter(
                DiseaseTranslation.language_code == language_code,
                DiseaseTranslation.translated_name.ilike(f"%{search_term}%"),
            )
        )

        if active_only:
            translation_query = translation_query.filter(Disease.is_active == True)

        translation_results = translation_query.limit(limit).all()

        # Combine and deduplicate results
        disease_ids = {d.id for d in base_results}
        combined_results = list(base_results)

        for disease in translation_results:
            if disease.id not in disease_ids:
                combined_results.append(disease)
                disease_ids.add(disease.id)

        return combined_results[:limit]

    @staticmethod
    def create_disease(db: Session, disease_data: DiseaseCreate) -> Disease:
        """
        Create a new disease.

        Args:
            db: Database session
            disease_data: Disease creation data

        Returns:
            Created Disease object

        Raises:
            HTTPException: If disease with name already exists
        """
        # Check if disease already exists
        existing = db.query(Disease).filter(Disease.name == disease_data.name).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Disease with this name already exists",
            )

        # Create disease
        disease = Disease(**disease_data.model_dump(exclude_unset=True))
        db.add(disease)
        db.commit()
        db.refresh(disease)

        return disease

    @staticmethod
    def update_disease(
        db: Session, disease: Disease, disease_data: DiseaseUpdate
    ) -> Disease:
        """
        Update disease information.

        Args:
            db: Database session
            disease: Disease object to update
            disease_data: Update data

        Returns:
            Updated Disease object
        """
        for field, value in disease_data.model_dump(exclude_unset=True).items():
            setattr(disease, field, value)

        db.commit()
        db.refresh(disease)

        return disease

    @staticmethod
    def soft_delete_disease(db: Session, disease: Disease) -> None:
        """
        Soft delete a disease (set is_active to False).

        Args:
            db: Database session
            disease: Disease object to delete
        """
        disease.is_active = False
        db.commit()

    @staticmethod
    def get_disease_categories(db: Session, disease_id: int) -> List[DiseaseCategory]:
        """
        Get all categories for a disease.

        Args:
            db: Database session
            disease_id: Disease ID

        Returns:
            List of DiseaseCategory objects
        """
        return (
            db.query(DiseaseCategory)
            .join(
                DiseaseCategoryMapping,
                DiseaseCategoryMapping.category_id == DiseaseCategory.id,
            )
            .filter(DiseaseCategoryMapping.disease_id == disease_id)
            .filter(DiseaseCategory.is_active == True)
            .all()
        )
