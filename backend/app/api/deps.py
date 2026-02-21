from typing import Generator

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.user_service import UserService
from app.utils.auth_utils import extract_auth0_id

def get_current_active_user(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """
    Get current active user from Auth0 token.
    Validates that the user exists in local DB and is active.
    """
    auth0_id = extract_auth0_id(current_user)
    user = UserService.get_user_by_auth0_id(db, auth0_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user
