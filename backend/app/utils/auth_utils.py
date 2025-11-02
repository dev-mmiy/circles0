"""
Authentication utility functions.
"""

from fastapi import HTTPException, status


def extract_auth0_id(current_user: dict) -> str:
    """
    Extract Auth0 ID from current user token.
    
    Args:
        current_user: Decoded Auth0 token
        
    Returns:
        Auth0 ID (sub claim)
        
    Raises:
        HTTPException: If auth0_id is not found in token
    """
    auth0_id = current_user.get("sub")
    
    if not auth0_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )
    
    return auth0_id

