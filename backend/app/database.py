"""
Database configuration and session management.
"""

import os
from pathlib import Path

# Load .env file before reading environment variables
# This ensures DATABASE_URL is loaded from .env file if it exists
try:
    from dotenv import load_dotenv
    
    # Load .env file from backend directory
    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists() and env_file.is_file():
        load_dotenv(dotenv_path=str(env_file.resolve()), override=False, verbose=False)
except ImportError:
    # dotenv not available, skip loading
    pass
except Exception:
    # Silently ignore errors if .env file cannot be loaded
    pass

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Create declarative base
Base = declarative_base()

# Database URL from environment variable
# Handle empty string case (Cloud Run may set empty string instead of None)
# For local development, use 'localhost' instead of 'postgres'
DATABASE_URL = (
    os.getenv(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/disease_community"
    )
    or "postgresql://postgres:postgres@localhost:5432/disease_community"
)

# Convert asyncpg URL to psycopg2 URL (for synchronous operations)
# Cloud Run may provide postgresql+asyncpg:// but we need postgresql://
if "+asyncpg" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

# Create engine with connection pool settings
# These settings help prevent connection timeouts in Cloud Run environment
# Optimized for production: increased pool size and added TCP keepalive
engine = create_engine(
    DATABASE_URL,
    pool_size=10,  # Number of connections to maintain in the pool (increased from 5)
    max_overflow=20,  # Maximum number of connections to allow beyond pool_size (increased from 10)
    pool_timeout=30,  # Seconds to wait before giving up on getting a connection from the pool
    pool_recycle=1800,  # Recycle connections after 30 minutes (reduced from 1 hour to prevent stale connections)
    pool_pre_ping=True,  # Verify connections before using them (detect stale connections)
    connect_args={
        "connect_timeout": 10,  # PostgreSQL connection timeout in seconds
        "keepalives": 1,  # Enable TCP keepalive
        "keepalives_idle": 30,  # Start keepalive after 30 seconds of inactivity
        "keepalives_interval": 10,  # Send keepalive every 10 seconds
        "keepalives_count": 5,  # Number of keepalive packets before considering connection dead
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
