"""
SQLAlchemy models package.
"""

from app.database import Base

from .disease import Disease, UserDisease
from .user import User

__all__ = [
    "Base",
    "User",
    "Disease",
    "UserDisease",
]
