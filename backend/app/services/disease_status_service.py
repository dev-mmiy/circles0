"""
Disease status service layer for handling status-related business logic.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.disease import (
    DiseaseStatus,
    DiseaseStatusTranslation,
)
from app.schemas.disease import (
    DiseaseStatusCreate,
    DiseaseStatusUpdate,
)


class DiseaseStatusService:
    """Service class for disease status operations."""

    @staticmethod
    def get_all_statuses(db: Session) -> List[DiseaseStatus]:
        """
        Get all disease statuses.

        Args:
            db: Database session

        Returns:
            List of DiseaseStatus objects ordered by display_order
        """
        return (
            db.query(DiseaseStatus)
            .order_by(DiseaseStatus.display_order)
            .all()
        )

    @staticmethod
    def get_status_by_id(db: Session, status_id: int) -> Optional[DiseaseStatus]:
        """
        Get status by ID.

        Args:
            db: Database session
            status_id: Status ID

        Returns:
            DiseaseStatus object or None
        """
        return db.query(DiseaseStatus).filter(DiseaseStatus.id == status_id).first()

    @staticmethod
    def get_status_by_code(
        db: Session, status_code: str
    ) -> Optional[DiseaseStatus]:
        """
        Get status by code.

        Args:
            db: Database session
            status_code: Status code (e.g., 'ACTIVE', 'REMISSION')

        Returns:
            DiseaseStatus object or None
        """
        return (
            db.query(DiseaseStatus)
            .filter(DiseaseStatus.status_code == status_code)
            .first()
        )

    @staticmethod
    def get_status_translations(
        db: Session, status_id: int
    ) -> List[DiseaseStatusTranslation]:
        """
        Get all translations for a status.

        Args:
            db: Database session
            status_id: Status ID

        Returns:
            List of DiseaseStatusTranslation objects
        """
        return (
            db.query(DiseaseStatusTranslation)
            .filter(DiseaseStatusTranslation.status_id == status_id)
            .order_by(DiseaseStatusTranslation.language_code)
            .all()
        )

    @staticmethod
    def get_status_translation(
        db: Session, status_id: int, language_code: str
    ) -> Optional[DiseaseStatusTranslation]:
        """
        Get specific translation for a status.

        Args:
            db: Database session
            status_id: Status ID
            language_code: Language code (e.g., 'ja', 'en')

        Returns:
            DiseaseStatusTranslation object or None
        """
        return (
            db.query(DiseaseStatusTranslation)
            .filter(
                DiseaseStatusTranslation.status_id == status_id,
                DiseaseStatusTranslation.language_code == language_code,
            )
            .first()
        )

    @staticmethod
    def create_status(db: Session, status_data: DiseaseStatusCreate) -> DiseaseStatus:
        """
        Create a new disease status.

        Args:
            db: Database session
            status_data: Status creation data

        Returns:
            Created DiseaseStatus object

        Raises:
            HTTPException: If status with code already exists
        """
        # Check if status code already exists
        existing = (
            db.query(DiseaseStatus)
            .filter(DiseaseStatus.status_code == status_data.status_code)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Status with this code already exists",
            )

        # Create status
        disease_status = DiseaseStatus(**status_data.model_dump(exclude_unset=True))
        db.add(disease_status)
        db.commit()
        db.refresh(disease_status)

        return disease_status

    @staticmethod
    def update_status(
        db: Session, disease_status: DiseaseStatus, status_data: DiseaseStatusUpdate
    ) -> DiseaseStatus:
        """
        Update status information.

        Args:
            db: Database session
            disease_status: DiseaseStatus object to update
            status_data: Update data

        Returns:
            Updated DiseaseStatus object
        """
        for field, value in status_data.model_dump(exclude_unset=True).items():
            setattr(disease_status, field, value)

        db.commit()
        db.refresh(disease_status)

        return disease_status

    @staticmethod
    def delete_status(db: Session, disease_status: DiseaseStatus) -> None:
        """
        Delete a disease status.

        Args:
            db: Database session
            disease_status: DiseaseStatus object to delete

        Raises:
            HTTPException: If status is in use by user diseases
        """
        # Check if status is in use
        from app.models.disease import UserDisease

        in_use = (
            db.query(UserDisease)
            .filter(UserDisease.status_id == disease_status.id)
            .first()
        )

        if in_use:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete status that is in use by user diseases",
            )

        db.delete(disease_status)
        db.commit()
