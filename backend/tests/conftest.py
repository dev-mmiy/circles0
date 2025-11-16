"""
Pytest configuration and shared fixtures.
"""

import os
from unittest.mock import patch

import pytest
from sqlalchemy import create_engine, delete
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base

# Import all models to ensure they're registered with Base.metadata
from app.models import (  # noqa: F401
    Block,
    Disease,
    Follow,
    Post,
    PostComment,
    PostImage,
    PostLike,
    User,
)

# Get test database URL from environment variable or use default
# Default to test database on PostgreSQL (works both locally and in Docker)
# In Docker: use 'postgres' as hostname, locally: use 'localhost'
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://postgres:postgres@postgres:5432/disease_community_test",
)

# Create PostgreSQL engine for testing
engine = create_engine(
    TEST_DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using them
    echo=False,  # Set to True for SQL query logging during tests
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def setup_test_db():
    """Create test database tables once per test session."""
    # Create all tables once at the start of the test session
    Base.metadata.create_all(bind=engine)
    yield
    # Drop all tables at the end of the test session
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(setup_test_db) -> Session:
    """
    Create a fresh database session for each test.
    
    Tables are created once per session, but data is cleared after each test.
    This is much faster than dropping/recreating tables for every test.
    """
    # Create a new session
    session = TestingSessionLocal()

    try:
        # Clear all data before test (in case previous test didn't clean up)
        for table in reversed(Base.metadata.sorted_tables):
            session.execute(delete(table))
        session.commit()
        
        yield session
        
        # Clear all data after test
        session.rollback()  # Rollback any uncommitted changes
        for table in reversed(Base.metadata.sorted_tables):
            session.execute(delete(table))
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@pytest.fixture(autouse=True)
def reset_db():
    """Reset database before each test - now optimized to only clear data."""
    # Tables are created once per session, we just need to ensure they exist
    # The actual data clearing is done in db_session fixture
    pass


@pytest.fixture(autouse=True)
def mock_notification_broadcast():
    """Mock notification broadcasting to avoid async issues in tests."""
    # Mock asyncio.create_task to prevent async issues in tests
    with patch("app.services.notification_service.asyncio.create_task") as mock_create_task:
        # Return a mock task that does nothing
        mock_task = type("MockTask", (), {"done": lambda: True, "cancel": lambda: None})()
        mock_create_task.return_value = mock_task
        yield mock_create_task


# Shared fixtures for all tests
@pytest.fixture
def test_user(db_session: Session) -> User:
    """Create a test user."""
    from uuid import uuid4

    user = User(
        id=uuid4(),
        auth0_id="auth0|testuser123",
        email="testuser@example.com",
        email_verified=True,
        nickname="testuser",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_disease(db_session: Session) -> Disease:
    """Create a test disease."""
    from datetime import datetime

    disease = Disease(
        name="Test Disease",
        description="Test disease description",
        category="test",
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db_session.add(disease)
    db_session.commit()
    db_session.refresh(disease)
    return disease
