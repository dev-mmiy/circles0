"""
User service layer for handling user-related business logic.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.disease import Disease, UserDisease
from app.models.user import User
from app.schemas.disease import UserDiseaseCreate, UserDiseaseUpdate
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    """Service class for user-related operations."""

    @staticmethod
    def get_user_by_auth0_id(db: Session, auth0_id: str) -> Optional[User]:
        """Get user by Auth0 ID."""
        return db.query(User).filter(User.auth0_id == auth0_id).first()

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """Get user by email."""
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_user_by_id(
        db: Session, user_id: UUID, active_only: bool = True
    ) -> Optional[User]:
        """Get user by ID."""
        query = db.query(User).filter(User.id == user_id)
        if active_only:
            query = query.filter(User.is_active == True)
        return query.first()

    @staticmethod
    def get_user_by_member_id(db: Session, member_id: str) -> Optional[User]:
        """Get user by member ID."""
        return db.query(User).filter(User.member_id == member_id).first()

    @staticmethod
    def get_user_by_nickname(db: Session, nickname: str) -> Optional[User]:
        """Get user by nickname."""
        return db.query(User).filter(User.nickname == nickname).first()

    @staticmethod
    def get_user_diseases(db: Session, user_id: UUID) -> List[Disease]:
        """Get all active diseases for a user with translations."""
        from sqlalchemy.orm import joinedload

        return (
            db.query(Disease)
            .options(joinedload(Disease.translations))
            .join(UserDisease, UserDisease.disease_id == Disease.id)
            .filter(UserDisease.user_id == user_id)
            .filter(UserDisease.is_active == True)
            .filter(Disease.is_active == True)
            .all()
        )

    @staticmethod
    def get_user_public_diseases(db: Session, user_id: UUID) -> List[Disease]:
        """
        Get all public and searchable diseases for a user with translations.
        Used for displaying user diseases in search results.
        """
        from sqlalchemy.orm import joinedload

        return (
            db.query(Disease)
            .options(joinedload(Disease.translations))
            .join(UserDisease, UserDisease.disease_id == Disease.id)
            .filter(UserDisease.user_id == user_id)
            .filter(UserDisease.is_active == True)
            .filter(UserDisease.is_public == True)
            .filter(UserDisease.is_searchable == True)
            .filter(Disease.is_active == True)
            .all()
        )

    @staticmethod
    def get_all_user_diseases(db: Session, user_id: UUID) -> List[UserDisease]:
        """Get all active user diseases with detailed information."""
        from sqlalchemy.orm import joinedload

        return (
            db.query(UserDisease)
            .options(
                joinedload(UserDisease.disease).joinedload(Disease.translations),
                joinedload(UserDisease.status),
            )
            .filter(UserDisease.user_id == user_id)
            .filter(UserDisease.is_active == True)
            .order_by(UserDisease.created_at.desc())
            .all()
        )

    @staticmethod
    def create_user(db: Session, user_data: UserCreate) -> User:
        """
        Create a new user.

        Args:
            db: Database session
            user_data: User creation data

        Returns:
            Created user instance

        Raises:
            HTTPException: If user with email or nickname already exists
        """
        # Check if user exists by email
        existing_user = UserService.get_user_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists",
            )

        # Check if nickname already exists
        if user_data.nickname:
            existing_nickname = UserService.get_user_by_nickname(db, user_data.nickname)
            if existing_nickname:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User with this nickname already exists",
                )

        # Create new user using exclude_unset to allow SQLAlchemy defaults
        user = User(**user_data.model_dump(exclude_unset=True))
        db.add(user)
        db.commit()
        db.refresh(user)

        return user

    @staticmethod
    def update_user(db: Session, user: User, user_data: UserUpdate) -> User:
        """
        Update user profile.

        Args:
            db: Database session
            user: User instance to update
            user_data: Update data

        Returns:
            Updated user instance
        """
        # Update user fields
        for field, value in user_data.model_dump(exclude_unset=True).items():
            setattr(user, field, value)

        db.commit()
        db.refresh(user)

        return user

    @staticmethod
    def update_last_login(db: Session, user: User) -> User:
        """Update user's last login timestamp."""
        user.last_login_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def soft_delete_user(db: Session, user: User) -> None:
        """Soft delete a user (set is_active to False)."""
        user.is_active = False
        db.commit()

    @staticmethod
    def add_disease_to_user(db: Session, user_id: UUID, disease_id: int) -> UserDisease:
        """
        Add a disease to user's profile (basic version for backward compatibility).

        Args:
            db: Database session
            user_id: User UUID
            disease_id: Disease ID

        Returns:
            UserDisease relationship instance

        Raises:
            HTTPException: If disease not found or already added
        """
        # Check if disease exists
        disease = (
            db.query(Disease)
            .filter(Disease.id == disease_id, Disease.is_active == True)
            .first()
        )
        if not disease:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Disease not found",
            )

        # Check if user already has this disease
        existing = (
            db.query(UserDisease)
            .filter(
                UserDisease.user_id == user_id,
                UserDisease.disease_id == disease_id,
                UserDisease.is_active == True,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Disease already added to your profile",
            )

        # Create relationship
        user_disease = UserDisease(
            user_id=user_id, disease_id=disease_id, is_active=True
        )
        db.add(user_disease)
        db.commit()
        db.refresh(user_disease)

        return user_disease

    @staticmethod
    def add_disease_to_user_detailed(
        db: Session, user_id: UUID, disease_data: UserDiseaseCreate
    ) -> UserDisease:
        """
        Add a disease to user's profile with detailed information.

        Args:
            db: Database session
            user_id: User UUID
            disease_data: Detailed disease information

        Returns:
            UserDisease relationship instance

        Raises:
            HTTPException: If disease not found or already added
        """
        from sqlalchemy.orm import joinedload

        # Check if disease exists
        disease = (
            db.query(Disease)
            .filter(Disease.id == disease_data.disease_id, Disease.is_active == True)
            .first()
        )
        if not disease:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Disease not found",
            )

        # Check if user already has this disease (including inactive)
        existing = (
            db.query(UserDisease)
            .filter(
                UserDisease.user_id == user_id,
                UserDisease.disease_id == disease_data.disease_id,
            )
            .first()
        )

        if existing:
            if existing.is_active:
                # Already active
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Disease already added to your profile",
                )
            else:
                # Reactivate the deleted disease
                existing.is_active = True
                # Update with new data
                for field, value in disease_data.model_dump(exclude_unset=True).items():
                    if field != "disease_id":  # Don't update disease_id
                        setattr(existing, field, value)
                db.commit()

                # Eager load relationships for response
                db.refresh(existing)
                user_disease = (
                    db.query(UserDisease)
                    .options(
                        joinedload(UserDisease.disease).joinedload(
                            Disease.translations
                        ),
                        joinedload(UserDisease.status),
                    )
                    .filter(UserDisease.id == existing.id)
                    .first()
                )
                return user_disease

        # Create new relationship with detailed information
        user_disease = UserDisease(
            user_id=user_id, **disease_data.model_dump(exclude_unset=True)
        )
        db.add(user_disease)
        db.commit()
        db.refresh(user_disease)

        # Eager load relationships for response
        db.refresh(user_disease)
        user_disease = (
            db.query(UserDisease)
            .options(
                joinedload(UserDisease.disease).joinedload(Disease.translations),
                joinedload(UserDisease.status),
            )
            .filter(UserDisease.id == user_disease.id)
            .first()
        )

        return user_disease

    @staticmethod
    def update_user_disease(
        db: Session, user_id: UUID, disease_id: int, disease_data: UserDiseaseUpdate
    ) -> UserDisease:
        """
        Update user's disease information.

        Args:
            db: Database session
            user_id: User UUID
            disease_id: Disease ID
            disease_data: Update data

        Returns:
            Updated UserDisease instance

        Raises:
            HTTPException: If disease not found in user's profile
        """
        user_disease = (
            db.query(UserDisease)
            .filter(
                UserDisease.user_id == user_id,
                UserDisease.disease_id == disease_id,
                UserDisease.is_active == True,
            )
            .first()
        )

        if not user_disease:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Disease not found in your profile",
            )

        # Update fields
        for field, value in disease_data.model_dump(exclude_unset=True).items():
            setattr(user_disease, field, value)

        db.commit()
        db.refresh(user_disease)

        return user_disease

    @staticmethod
    def get_user_disease(
        db: Session, user_id: UUID, disease_id: int
    ) -> Optional[UserDisease]:
        """
        Get specific user disease relationship by disease_id.

        Args:
            db: Database session
            user_id: User UUID
            disease_id: Disease ID

        Returns:
            UserDisease instance or None
        """
        return (
            db.query(UserDisease)
            .filter(
                UserDisease.user_id == user_id,
                UserDisease.disease_id == disease_id,
                UserDisease.is_active == True,
            )
            .first()
        )

    @staticmethod
    def get_user_disease_by_id(
        db: Session, user_id: UUID, user_disease_id: int
    ) -> Optional[UserDisease]:
        """
        Get specific user disease relationship by UserDisease ID.

        Args:
            db: Database session
            user_id: User UUID
            user_disease_id: UserDisease ID

        Returns:
            UserDisease instance or None
        """
        from sqlalchemy.orm import joinedload

        return (
            db.query(UserDisease)
            .options(
                joinedload(UserDisease.disease).joinedload(Disease.translations),
                joinedload(UserDisease.status),
            )
            .filter(
                UserDisease.id == user_disease_id,
                UserDisease.user_id == user_id,
                UserDisease.is_active == True,
            )
            .first()
        )

    @staticmethod
    def update_user_disease_by_id(
        db: Session,
        user_id: UUID,
        user_disease_id: int,
        disease_data: UserDiseaseUpdate,
    ) -> UserDisease:
        """
        Update user's disease information by UserDisease ID.

        Args:
            db: Database session
            user_id: User UUID
            user_disease_id: UserDisease ID
            disease_data: Update data

        Returns:
            Updated UserDisease instance

        Raises:
            HTTPException: If disease not found in user's profile
        """
        from sqlalchemy.orm import joinedload

        user_disease = (
            db.query(UserDisease)
            .filter(
                UserDisease.id == user_disease_id,
                UserDisease.user_id == user_id,
                UserDisease.is_active == True,
            )
            .first()
        )

        if not user_disease:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Disease not found in your profile",
            )

        # Update fields
        for field, value in disease_data.model_dump(exclude_unset=True).items():
            setattr(user_disease, field, value)

        db.commit()
        db.refresh(user_disease)

        # Eager load relationships for response
        user_disease = (
            db.query(UserDisease)
            .options(
                joinedload(UserDisease.disease).joinedload(Disease.translations),
                joinedload(UserDisease.status),
            )
            .filter(UserDisease.id == user_disease_id)
            .first()
        )

        return user_disease

    @staticmethod
    def remove_disease_from_user(db: Session, user_id: UUID, disease_id: int) -> None:
        """
        Remove a disease from user's profile (soft delete) by Disease ID.

        Args:
            db: Database session
            user_id: User UUID
            disease_id: Disease ID

        Raises:
            HTTPException: If disease not found in user's profile
        """
        user_disease = (
            db.query(UserDisease)
            .filter(
                UserDisease.user_id == user_id,
                UserDisease.disease_id == disease_id,
                UserDisease.is_active == True,
            )
            .first()
        )

        if not user_disease:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Disease not found in your profile",
            )

        # Soft delete
        user_disease.is_active = False
        db.commit()

    @staticmethod
    def remove_disease_from_user_by_id(
        db: Session, user_id: UUID, user_disease_id: int
    ) -> None:
        """
        Remove a disease from user's profile (soft delete) by UserDisease ID.

        Args:
            db: Database session
            user_id: User UUID
            user_disease_id: UserDisease relationship ID

        Raises:
            HTTPException: If disease not found in user's profile
        """
        user_disease = (
            db.query(UserDisease)
            .filter(
                UserDisease.id == user_disease_id,
                UserDisease.user_id == user_id,
                UserDisease.is_active == True,
            )
            .first()
        )

        if not user_disease:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Disease not found in your profile",
            )

        # Soft delete
        user_disease.is_active = False
        db.commit()

    @staticmethod
    def check_profile_visibility(
        user: User, current_user: Optional[dict] = None, db: Optional[Session] = None
    ) -> bool:
        """
        Check if current user can view the profile.

        Args:
            user: User whose profile is being accessed
            current_user: Current authenticated user (from Auth0)
            db: Database session (optional, needed for block check)

        Returns:
            True if profile is visible, False otherwise

        Raises:
            HTTPException: If profile is not visible
        """
        # Check if this is the user's own profile
        is_own_profile = False
        if current_user and user.auth0_id:
            current_user_sub = current_user.get("sub")
            if current_user_sub:
                is_own_profile = current_user_sub == user.auth0_id

        # Check if blocked (if db is provided and current_user exists)
        if db and current_user and not is_own_profile:
            from app.services.block_service import BlockService
            from app.utils.auth_utils import extract_auth0_id

            current_user_obj = UserService.get_user_by_auth0_id(
                db, extract_auth0_id(current_user)
            )
            if current_user_obj:
                if BlockService.are_blocked(db, current_user_obj.id, user.id):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="This profile is not accessible",
                    )

        if user.profile_visibility == "private":
            if not is_own_profile:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This profile is private",
                )
        elif user.profile_visibility == "limited":
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This profile is only visible to authenticated users",
                )
        # 'public' profiles are visible to everyone

        return True
