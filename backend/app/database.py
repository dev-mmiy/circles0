"""
Database configuration and session management.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Database URL from environment variable
# Handle empty string case (Cloud Run may set empty string instead of None)
DATABASE_URL = (
    os.getenv(
        "DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/disease_community"
    )
    or "postgresql://postgres:postgres@postgres:5432/disease_community"
)

# Create engine
engine = create_engine(DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
