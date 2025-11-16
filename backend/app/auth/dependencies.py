"""
Authentication dependencies for FastAPI.
"""

from typing import Optional

from fastapi import Depends, HTTPException, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.auth0 import auth0_service
from app.database import get_db
from app.models.user import User
from app.services.user_service import UserService
from app.utils.auth_utils import extract_auth0_id

# HTTP Bearer token security schemes
security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)  # Don't auto-error if no token


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Get current authenticated user from Auth0 JWT token.

    Args:
        credentials: HTTP Bearer token credentials

    Returns:
        dict: User information from token

    Raises:
        HTTPException: If token is invalid or missing
    """
    try:
        # Verify token and get user info
        user_info = auth0_service.get_user_info(credentials.credentials)
        return user_info
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
        )


def get_current_user_from_query(
    request: Request,
    token: Optional[str] = Query(None, description="Auth0 JWT token"),
    db: Session = Depends(get_db),
) -> User:
    """
    Get current authenticated user from Auth0 JWT token in query parameter.
    
    This is used for SSE endpoints where EventSource doesn't support custom headers.
    Falls back to Authorization header if query parameter is not provided.

    Args:
        request: FastAPI request object
        token: Auth0 JWT token from query parameter
        db: Database session

    Returns:
        User: Database user object

    Raises:
        HTTPException: If token is invalid or missing, or user not found
    """
    # Try query parameter first (for SSE)
    auth_token = token
    
    # Fall back to Authorization header if query parameter is not provided
    if not auth_token:
        authorization = request.headers.get("Authorization")
        if authorization and authorization.startswith("Bearer "):
            auth_token = authorization.split(" ")[1]
    
    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
        )
    
    try:
        # Verify token and get user info
        user_info = auth0_service.get_user_info(auth_token)
        auth0_id = extract_auth0_id(user_info)
        
        # Get user from database
        user = UserService.get_user_by_auth0_id(db, auth0_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
        )


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
) -> Optional[dict]:
    """
    Get current authenticated user (optional).

    Args:
        credentials: HTTP Bearer token credentials (optional)

    Returns:
        dict or None: User information if authenticated, None otherwise
    """
    if not credentials:
        return None

    try:
        return get_current_user(credentials)
    except HTTPException:
        return None


def require_permission(permission: str):
    """
    Require specific permission for endpoint access.

    Args:
        permission: Required permission string

    Returns:
        function: Dependency function
    """

    def _require_permission(current_user: dict = Depends(get_current_user)):
        user_permissions = current_user.get("permissions", [])
        if permission not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required",
            )
        return current_user

    return _require_permission
