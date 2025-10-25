"""
Authentication Router

This module provides authentication endpoints using fastapi-users.
"""

from typing import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi_users import FastAPIUsers
from fastapi_users.authentication import SessionAuthentication
from fastapi_users.router import (
    get_auth_router,
    get_register_router,
    get_reset_password_router,
    get_verify_router,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.config import get_user_db, get_user_manager
from app.auth.schemas import UserCreate, UserUpdate
from app.core.config import settings
from app.database import get_async_session
from app.models.auth import User

# Create FastAPIUsers instance
fastapi_users = FastAPIUsers[User, UUID](get_user_manager, [])

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

# Create router
router = APIRouter()

# Include authentication routes
router.include_router(
    get_auth_router(session_authentication, get_user_manager),
    prefix="/auth",
    tags=["authentication"],
)

router.include_router(
    get_register_router(User, UserCreate, get_user_manager),
    prefix="/auth",
    tags=["authentication"],
)

router.include_router(
    get_reset_password_router(), prefix="/auth", tags=["authentication"]
)

router.include_router(
    get_verify_router(User, get_user_manager), prefix="/auth", tags=["authentication"]
)


# Current user endpoint
@router.get("/me")
async def get_current_user(current_user: User = Depends(fastapi_users.current_user())):
    """
    Get current authenticated user.

    Args:
        current_user: Current authenticated user

    Returns:
        dict: User information
    """
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
        "created_at": (
            current_user.created_at.isoformat() if current_user.created_at else None
        ),
        "last_login": (
            current_user.last_login.isoformat() if current_user.last_login else None
        ),
    }


# User profile update endpoint
@router.put("/me")
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(fastapi_users.current_user()),
    user_manager: UserManager = Depends(get_user_manager),
):
    """
    Update current user profile.

    Args:
        user_update: User update data
        current_user: Current authenticated user
        user_manager: User manager instance

    Returns:
        dict: Updated user information
    """
    try:
        updated_user = await user_manager.update(
            user_update, current_user, session=await get_async_session()
        )
        return {
            "id": str(updated_user.id),
            "email": updated_user.email,
            "first_name": updated_user.first_name,
            "last_name": updated_user.last_name,
            "is_active": updated_user.is_active,
            "is_verified": updated_user.is_verified,
            "updated_at": (
                updated_user.updated_at.isoformat() if updated_user.updated_at else None
            ),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update user: {str(e)}",
        )
