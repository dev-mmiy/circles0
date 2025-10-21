"""
SQLAlchemy models package.
"""

from .user import User
from .disease import Disease, UserDisease

__all__ = [
    "User",
    "Disease", 
    "UserDisease",
]