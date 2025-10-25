"""
Simple authentication system.
"""

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi_users import FastAPIUsers
from fastapi_users.authentication import SessionAuthentication
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models.user import User

# Create FastAPIUsers instance
fastapi_users = FastAPIUsers[User, str](None, [])

# Session authentication backend
session_authentication = SessionAuthentication(
    secret=settings.SECRET_KEY,
    cookie_name="session",
    cookie_secure=False,  # Set to True in production with HTTPS
    cookie_httponly=True,
    cookie_samesite="lax",
    max_age=3600,  # 1 hour
)

# Add session authentication to fastapi_users
fastapi_users.authenticator = session_authentication


def get_current_user_optional(db: Session = Depends(get_db)) -> Optional[User]:
    """
    Get current user if authenticated, otherwise return None.
    Simple implementation for now.
    """
    # For now, return None (no authentication required)
    return None


def get_current_user(db: Session = Depends(get_db)) -> User:
    """
    Get current authenticated user.
    Simple implementation for now.
    """
    # For now, raise exception (authentication required but not implemented)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
    )
