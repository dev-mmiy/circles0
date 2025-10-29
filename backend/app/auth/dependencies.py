"""
Authentication dependencies for FastAPI.
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.auth.auth0 import auth0_service


# HTTP Bearer token security schemes
security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)  # Don't auto-error if no token


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
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
            detail=f"Authentication failed: {str(e)}"
        )


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional)
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
                detail=f"Permission '{permission}' required"
            )
        return current_user
    
    return _require_permission
