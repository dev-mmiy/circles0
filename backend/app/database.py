"""
Database configuration and session management.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Create declarative base
Base = declarative_base()

# Database URL from environment variable
# Handle empty string case (Cloud Run may set empty string instead of None)
DATABASE_URL = (
    os.getenv(
        "DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/disease_community"
    )
    or "postgresql://postgres:postgres@postgres:5432/disease_community"
)

# Convert asyncpg URL to psycopg2 URL (for synchronous operations)
# Cloud Run may provide postgresql+asyncpg:// but we need postgresql://
if "+asyncpg" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

# Create engine with connection pool settings
# These settings help prevent connection timeouts in Cloud Run environment
engine = create_engine(
    DATABASE_URL,
    pool_size=5,  # Number of connections to maintain in the pool
    max_overflow=10,  # Maximum number of connections to allow beyond pool_size
    pool_timeout=30,  # Seconds to wait before giving up on getting a connection from the pool
    pool_recycle=3600,  # Recycle connections after 1 hour (prevent stale connections)
    pool_pre_ping=True,  # Verify connections before using them (detect stale connections)
    connect_args={
        "connect_timeout": 10,  # PostgreSQL connection timeout in seconds
    },
)

# Create async engine for fastapi-users (temporarily disabled)
# async_database_url = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
# async_engine = create_async_engine(async_database_url)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create async session factory (temporarily disabled)
# AsyncSessionLocal = sessionmaker(
#     class_=AsyncSession,
#     autocommit=False,
#     autoflush=False,
#     bind=async_engine
# )


def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# async def get_async_session():
#     """Get async database session for fastapi-users."""
#     async with AsyncSessionLocal() as session:
#         yield session
