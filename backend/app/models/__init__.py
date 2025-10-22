"""
SQLAlchemy models package.
"""

from app.database import Base
from .user import User
from .disease import Disease, UserDisease

__all__ = [
    "Base",
    "User",
    "Disease", 
    "UserDisease",
]