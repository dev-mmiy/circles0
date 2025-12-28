"""
Disease category service layer for handling category-related business logic.
"""

from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.disease import DiseaseCategory, DiseaseCategoryTranslation
from app.schemas.disease import DiseaseCategoryCreate, DiseaseCategoryUpdate


class DiseaseCategoryService:
    """Service class for disease category operations."""

    @staticmethod
    def get_all_categories(
        db: Session,
        active_only: bool = True,
        include_children: bool = True,
    ) -> List[DiseaseCategory]:
        """
        Get all disease categories.

        Args:
            db: Database session
            active_only: Only return active categories
            include_children: Include child categories

        Returns:
            List of DiseaseCategory objects
        """
        query = db.query(DiseaseCategory)

        if active_only:
            query = query.filter(DiseaseCategory.is_active == True)

        if not include_children:
            query = query.filter(DiseaseCategory.parent_category_id.is_(None))

        query = query.order_by(DiseaseCategory.display_order)

        return query.all()

    @staticmethod
    def get_root_categories(
        db: Session, active_only: bool = True
    ) -> List[DiseaseCategory]:
        """
        Get root categories (categories without parent).

        Args:
            db: Database session
            active_only: Only return active categories

        Returns:
            List of root DiseaseCategory objects
        """
        query = db.query(DiseaseCategory).filter(
            DiseaseCategory.parent_category_id.is_(None)
        )

        if active_only:
            query = query.filter(DiseaseCategory.is_active == True)

        query = query.order_by(DiseaseCategory.display_order)

        return query.all()

    @staticmethod
    def get_category_by_id(
        db: Session, category_id: int, active_only: bool = True
    ) -> Optional[DiseaseCategory]:
        """
        Get category by ID.

        Args:
            db: Database session
            category_id: Category ID
            active_only: Only return if active

        Returns:
            DiseaseCategory object or None
        """
        query = db.query(DiseaseCategory).filter(DiseaseCategory.id == category_id)

        if active_only:
            query = query.filter(DiseaseCategory.is_active == True)

        return query.first()

    @staticmethod
    def get_category_by_code(
        db: Session, category_code: str, active_only: bool = True
    ) -> Optional[DiseaseCategory]:
        """
        Get category by code.

        Args:
            db: Database session
            category_code: Category code
            active_only: Only return if active

        Returns:
            DiseaseCategory object or None
        """
        query = db.query(DiseaseCategory).filter(
            DiseaseCategory.category_code == category_code
        )

        if active_only:
            query = query.filter(DiseaseCategory.is_active == True)

        return query.first()

    @staticmethod
    def get_child_categories(
        db: Session, parent_id: int, active_only: bool = True
    ) -> List[DiseaseCategory]:
        """
        Get child categories of a parent category.

        Args:
            db: Database session
            parent_id: Parent category ID
            active_only: Only return active categories

        Returns:
            List of child DiseaseCategory objects
        """
        query = db.query(DiseaseCategory).filter(
            DiseaseCategory.parent_category_id == parent_id
        )

        if active_only:
            query = query.filter(DiseaseCategory.is_active == True)

        query = query.order_by(DiseaseCategory.display_order)

        return query.all()

    @staticmethod
    def get_category_hierarchy(db: Session, category_id: int) -> List[DiseaseCategory]:
        """
        Get category hierarchy from root to specified category.

        Args:
            db: Database session
            category_id: Category ID

        Returns:
            List of DiseaseCategory objects from root to target
        """
        hierarchy = []
        current = DiseaseCategoryService.get_category_by_id(
            db, category_id, active_only=False
        )

        while current:
            hierarchy.insert(0, current)
            if current.parent_category_id:
                current = DiseaseCategoryService.get_category_by_id(
                    db, current.parent_category_id, active_only=False
                )
            else:
                current = None

        return hierarchy

    @staticmethod
    def get_category_translations(
        db: Session, category_id: int
    ) -> List[DiseaseCategoryTranslation]:
        """
        Get all translations for a category.

        Args:
            db: Database session
            category_id: Category ID

        Returns:
            List of DiseaseCategoryTranslation objects
        """
        return (
            db.query(DiseaseCategoryTranslation)
            .filter(DiseaseCategoryTranslation.category_id == category_id)
            .order_by(DiseaseCategoryTranslation.language_code)
            .all()
        )

    @staticmethod
    def get_category_translation(
        db: Session, category_id: int, language_code: str
    ) -> Optional[DiseaseCategoryTranslation]:
        """
        Get specific translation for a category.

        Args:
            db: Database session
            category_id: Category ID
            language_code: Language code (e.g., 'ja', 'en')

        Returns:
            DiseaseCategoryTranslation object or None
        """
        return (
            db.query(DiseaseCategoryTranslation)
            .filter(
                DiseaseCategoryTranslation.category_id == category_id,
                DiseaseCategoryTranslation.language_code == language_code,
            )
            .first()
        )

    @staticmethod
    def create_category(
        db: Session, category_data: DiseaseCategoryCreate
    ) -> DiseaseCategory:
        """
        Create a new category.

        Args:
            db: Database session
            category_data: Category creation data

        Returns:
            Created DiseaseCategory object

        Raises:
            HTTPException: If category with code already exists
        """
        # Check if category code already exists
        existing = (
            db.query(DiseaseCategory)
            .filter(DiseaseCategory.category_code == category_data.category_code)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this code already exists",
            )

        # Validate parent category exists if specified
        if category_data.parent_category_id:
            parent = DiseaseCategoryService.get_category_by_id(
                db, category_data.parent_category_id
            )
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parent category not found",
                )

        # Create category
        category = DiseaseCategory(**category_data.model_dump(exclude_unset=True))
        db.add(category)
        db.commit()
        db.refresh(category)

        return category

    @staticmethod
    def update_category(
        db: Session, category: DiseaseCategory, category_data: DiseaseCategoryUpdate
    ) -> DiseaseCategory:
        """
        Update category information.

        Args:
            db: Database session
            category: DiseaseCategory object to update
            category_data: Update data

        Returns:
            Updated DiseaseCategory object
        """
        # Validate parent category exists if being updated
        if (
            category_data.parent_category_id is not None
            and category_data.parent_category_id != category.parent_category_id
        ):
            parent = DiseaseCategoryService.get_category_by_id(
                db, category_data.parent_category_id
            )
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parent category not found",
                )

            # Prevent circular reference
            if category_data.parent_category_id == category.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Category cannot be its own parent",
                )

        for field, value in category_data.model_dump(exclude_unset=True).items():
            setattr(category, field, value)

        db.commit()
        db.refresh(category)

        return category

    @staticmethod
    def soft_delete_category(db: Session, category: DiseaseCategory) -> None:
        """
        Soft delete a category (set is_active to False).

        Args:
            db: Database session
            category: DiseaseCategory object to delete
        """
        category.is_active = False
        db.commit()
