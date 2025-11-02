"""
User service layer for handling user-related business logic.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.disease import Disease, UserDisease
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
    def get_user_diseases(db: Session, user_id: UUID) -> List[Disease]:
        """Get all active diseases for a user."""
        return (
            db.query(Disease)
            .join(UserDisease, UserDisease.disease_id == Disease.id)
            .filter(UserDisease.user_id == user_id)
            .filter(UserDisease.is_active == True)
            .filter(Disease.is_active == True)
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
            HTTPException: If user with email already exists
        """
        # Check if user exists by email
        existing_user = UserService.get_user_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists",
            )

        # Create new user using exclude_unset to allow SQLAlchemy defaults
        user = User(**user_data.model_dump(exclude_unset=True))
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return user

    @staticmethod
    def update_user(
        db: Session, user: User, user_data: UserUpdate
    ) -> User:
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
    def add_disease_to_user(
        db: Session, user_id: UUID, disease_id: int
    ) -> UserDisease:
        """
        Add a disease to user's profile.
        
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
    def remove_disease_from_user(
        db: Session, user_id: UUID, disease_id: int
    ) -> None:
        """
        Remove a disease from user's profile (soft delete).
        
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
    def check_profile_visibility(
        user: User, current_user: Optional[dict] = None
    ) -> bool:
        """
        Check if current user can view the profile.
        
        Args:
            user: User whose profile is being accessed
            current_user: Current authenticated user (from Auth0)
            
        Returns:
            True if profile is visible, False otherwise
            
        Raises:
            HTTPException: If profile is not visible
        """
        is_own_profile = (
            current_user and current_user.get("sub") == user.auth0_id
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

