"""
Authentication Configuration

This module configures fastapi-users for session-based authentication.
"""

from typing import AsyncGenerator
from fastapi import Depends
from fastapi_users import BaseUserManager, UUIDIDMixin
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.models.auth import User


class UserManager(UUIDIDMixin, BaseUserManager[User, UUID]):
    """
    User manager for handling user operations.
    
    Provides methods for:
    - User creation
    - Password validation
    - Email verification
    - User updates
    """
    
    def __init__(self, user_db: SQLAlchemyUserDatabase[User, UUID]):
        super().__init__(user_db)
    
    async def on_after_register(self, user: User, request=None):
        """
        Called after user registration.
        
        Args:
            user: The registered user
            request: The request object (optional)
        """
        print(f"User {user.email} has registered.")
    
    async def on_after_login(
        self,
        user: User,
        request=None,
        response=None,
    ):
        """
        Called after user login.
        
        Args:
            user: The logged in user
            request: The request object (optional)
            response: The response object (optional)
        """
        print(f"User {user.email} has logged in.")


async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    """
    Get user database session.
    
    Args:
        session: Database session
        
    Yields:
        SQLAlchemyUserDatabase: User database instance
    """
    yield SQLAlchemyUserDatabase(session, User)


async def get_user_manager(user_db: SQLAlchemyUserDatabase[User, UUID] = Depends(get_user_db)):
    """
    Get user manager instance.
    
    Args:
        user_db: User database instance
        
    Yields:
        UserManager: User manager instance
    """
    yield UserManager(user_db)
