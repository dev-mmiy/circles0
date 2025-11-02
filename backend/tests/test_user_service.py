"""
Unit tests for UserService.
"""

import pytest
from datetime import datetime
from uuid import uuid4
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.user import User
from app.models.disease import Disease, UserDisease
from app.services.user_service import UserService
from app.schemas.user import UserCreate, UserUpdate


class TestUserService:
    """Test cases for UserService."""

    def test_get_user_by_auth0_id(self, db_session: Session, test_user: User):
        """Test getting user by Auth0 ID."""
        user = UserService.get_user_by_auth0_id(db_session, test_user.auth0_id)
        assert user is not None
        assert user.id == test_user.id
        assert user.auth0_id == test_user.auth0_id

    def test_get_user_by_auth0_id_not_found(self, db_session: Session):
        """Test getting user by Auth0 ID when not found."""
        user = UserService.get_user_by_auth0_id(db_session, "nonexistent_id")
        assert user is None

    def test_get_user_by_email(self, db_session: Session, test_user: User):
        """Test getting user by email."""
        user = UserService.get_user_by_email(db_session, test_user.email)
        assert user is not None
        assert user.id == test_user.id
        assert user.email == test_user.email

    def test_get_user_by_id(self, db_session: Session, test_user: User):
        """Test getting user by ID."""
        user = UserService.get_user_by_id(db_session, test_user.id)
        assert user is not None
        assert user.id == test_user.id

    def test_get_user_by_id_inactive(self, db_session: Session, test_user: User):
        """Test getting inactive user by ID."""
        test_user.is_active = False
        db_session.commit()

        # Should not find inactive user when active_only=True
        user = UserService.get_user_by_id(db_session, test_user.id, active_only=True)
        assert user is None

        # Should find inactive user when active_only=False
        user = UserService.get_user_by_id(db_session, test_user.id, active_only=False)
        assert user is not None

    def test_create_user(self, db_session: Session):
        """Test creating a new user."""
        user_data = UserCreate(
            auth0_id="auth0|test123",
            email="test@example.com",
            email_verified=True,
            display_name="Test User"
        )

        user = UserService.create_user(db_session, user_data)

        assert user.id is not None
        assert user.auth0_id == "auth0|test123"
        assert user.email == "test@example.com"
        assert user.display_name == "Test User"
        assert user.gender == "prefer_not_to_say"
        assert user.country == "jp"
        assert user.language == "ja"

    def test_create_user_duplicate_email(self, db_session: Session, test_user: User):
        """Test creating user with duplicate email raises exception."""
        user_data = UserCreate(
            auth0_id="auth0|different123",
            email=test_user.email,  # Duplicate email
            email_verified=True,
            display_name="Another User"
        )

        with pytest.raises(HTTPException) as exc_info:
            UserService.create_user(db_session, user_data)
        
        assert exc_info.value.status_code == 400
        assert "email already exists" in exc_info.value.detail.lower()

    def test_update_user(self, db_session: Session, test_user: User):
        """Test updating user profile."""
        update_data = UserUpdate(
            display_name="Updated Name",
            bio="Updated bio",
            country="us"
        )

        updated_user = UserService.update_user(db_session, test_user, update_data)

        assert updated_user.display_name == "Updated Name"
        assert updated_user.bio == "Updated bio"
        assert updated_user.country == "us"
        # Unchanged fields should remain the same
        assert updated_user.email == test_user.email

    def test_update_last_login(self, db_session: Session, test_user: User):
        """Test updating last login timestamp."""
        original_last_login = test_user.last_login_at

        updated_user = UserService.update_last_login(db_session, test_user)

        assert updated_user.last_login_at is not None
        assert updated_user.last_login_at != original_last_login

    def test_soft_delete_user(self, db_session: Session, test_user: User):
        """Test soft deleting a user."""
        assert test_user.is_active is True

        UserService.soft_delete_user(db_session, test_user)

        db_session.refresh(test_user)
        assert test_user.is_active is False

    def test_get_user_diseases(
        self, db_session: Session, test_user: User, test_disease: Disease
    ):
        """Test getting user's diseases."""
        # Add disease to user
        user_disease = UserDisease(
            user_id=test_user.id,
            disease_id=test_disease.id,
            is_active=True
        )
        db_session.add(user_disease)
        db_session.commit()

        diseases = UserService.get_user_diseases(db_session, test_user.id)

        assert len(diseases) == 1
        assert diseases[0].id == test_disease.id

    def test_add_disease_to_user(
        self, db_session: Session, test_user: User, test_disease: Disease
    ):
        """Test adding disease to user."""
        user_disease = UserService.add_disease_to_user(
            db_session, test_user.id, test_disease.id
        )

        assert user_disease.user_id == test_user.id
        assert user_disease.disease_id == test_disease.id
        assert user_disease.is_active is True

    def test_add_disease_to_user_duplicate(
        self, db_session: Session, test_user: User, test_disease: Disease
    ):
        """Test adding duplicate disease raises exception."""
        # Add disease first time
        UserService.add_disease_to_user(db_session, test_user.id, test_disease.id)

        # Try to add again
        with pytest.raises(HTTPException) as exc_info:
            UserService.add_disease_to_user(db_session, test_user.id, test_disease.id)
        
        assert exc_info.value.status_code == 400
        assert "already added" in exc_info.value.detail.lower()

    def test_remove_disease_from_user(
        self, db_session: Session, test_user: User, test_disease: Disease
    ):
        """Test removing disease from user."""
        # Add disease first
        UserService.add_disease_to_user(db_session, test_user.id, test_disease.id)

        # Remove disease
        UserService.remove_disease_from_user(db_session, test_user.id, test_disease.id)

        # Verify disease is no longer active
        user_disease = (
            db_session.query(UserDisease)
            .filter(
                UserDisease.user_id == test_user.id,
                UserDisease.disease_id == test_disease.id
            )
            .first()
        )
        assert user_disease.is_active is False

    def test_remove_disease_from_user_not_found(
        self, db_session: Session, test_user: User
    ):
        """Test removing non-existent disease raises exception."""
        with pytest.raises(HTTPException) as exc_info:
            UserService.remove_disease_from_user(db_session, test_user.id, 99999)
        
        assert exc_info.value.status_code == 404

    def test_check_profile_visibility_public(
        self, db_session: Session, test_user: User
    ):
        """Test public profile visibility."""
        test_user.profile_visibility = "public"
        db_session.commit()

        # Should be visible to anyone
        result = UserService.check_profile_visibility(test_user, None)
        assert result is True

    def test_check_profile_visibility_private(
        self, db_session: Session, test_user: User
    ):
        """Test private profile visibility."""
        test_user.profile_visibility = "private"
        db_session.commit()

        # Should not be visible to others
        with pytest.raises(HTTPException) as exc_info:
            UserService.check_profile_visibility(test_user, None)
        
        assert exc_info.value.status_code == 403

        # Should be visible to owner
        current_user = {"sub": test_user.auth0_id}
        result = UserService.check_profile_visibility(test_user, current_user)
        assert result is True

    def test_check_profile_visibility_limited(
        self, db_session: Session, test_user: User
    ):
        """Test limited profile visibility."""
        test_user.profile_visibility = "limited"
        db_session.commit()

        # Should not be visible to unauthenticated users
        with pytest.raises(HTTPException) as exc_info:
            UserService.check_profile_visibility(test_user, None)
        
        assert exc_info.value.status_code == 403

        # Should be visible to authenticated users
        current_user = {"sub": "different_auth0_id"}
        result = UserService.check_profile_visibility(test_user, current_user)
        assert result is True


# Pytest fixtures

@pytest.fixture
def test_user(db_session: Session) -> User:
    """Create a test user."""
    user = User(
        id=uuid4(),
        auth0_id="auth0|testuser123",
        email="testuser@example.com",
        email_verified=True,
        display_name="Test User",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_disease(db_session: Session) -> Disease:
    """Create a test disease."""
    disease = Disease(
        name="Test Disease",
        description="Test disease description",
        category="test",
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db_session.add(disease)
    db_session.commit()
    db_session.refresh(disease)
    return disease

