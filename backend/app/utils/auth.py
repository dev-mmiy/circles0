"""
Auth0 Authentication Utilities

This module provides utilities for Auth0 JWT token verification and user authentication.
"""

import os
from typing import Dict, Optional

import httpx
from fastapi import Depends, HTTPException, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

# Environment variables
AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN", "")
AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE", "")
AUTH0_ALGORITHMS = os.getenv("AUTH0_ALGORITHMS", "RS256").split(",")

# Security scheme
security = HTTPBearer()

# Cache for JWKS (JSON Web Key Set)
_jwks_cache: Optional[Dict] = None


async def get_jwks() -> Dict:
    """
    Retrieve JWKS (JSON Web Key Set) from Auth0.
    
    Returns:
        Dict: JWKS containing public keys for JWT verification
    """
    global _jwks_cache
    
    if _jwks_cache is not None:
        return _jwks_cache
    
    if not AUTH0_DOMAIN:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AUTH0_DOMAIN is not configured",
        )
    
    jwks_url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(jwks_url)
            response.raise_for_status()
            _jwks_cache = response.json()
            return _jwks_cache
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Unable to retrieve JWKS from Auth0: {str(e)}",
            )


def get_rsa_key(token: str, jwks: Dict) -> Optional[Dict]:
    """
    Extract RSA key from JWKS based on the token's key ID.
    
    Args:
        token: JWT token
        jwks: JSON Web Key Set
        
    Returns:
        Dict: RSA key for verification or None if not found
    """
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError:
        return None
    
    rsa_key = {}
    for key in jwks.get("keys", []):
        if key["kid"] == unverified_header["kid"]:
            rsa_key = {
                "kty": key["kty"],
                "kid": key["kid"],
                "use": key["use"],
                "n": key["n"],
                "e": key["e"],
            }
            break
    
    return rsa_key if rsa_key else None


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> Dict:
    """
    Verify Auth0 JWT token and extract payload.
    
    Args:
        credentials: HTTP Authorization credentials (Bearer token)
        
    Returns:
        Dict: Decoded token payload
        
    Raises:
        HTTPException: If token is invalid or verification fails
    """
    token = credentials.credentials
    
    if not AUTH0_DOMAIN or not AUTH0_AUDIENCE:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Auth0 configuration is incomplete",
        )
    
    # Get JWKS
    jwks = await get_jwks()
    
    # Get RSA key
    rsa_key = get_rsa_key(token, jwks)
    
    if not rsa_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to find appropriate key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify token
    try:
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=AUTH0_ALGORITHMS,
            audience=AUTH0_AUDIENCE,
            issuer=f"https://{AUTH0_DOMAIN}/",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.JWTClaimsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid claims. Please check the audience and issuer.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to parse authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(token_payload: Dict = Depends(verify_token)) -> Dict:
    """
    Extract current user information from verified token.
    
    Args:
        token_payload: Verified JWT token payload
        
    Returns:
        Dict: User information extracted from token
    """
    # Extract user ID (sub claim)
    user_id = token_payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token",
        )
    
    # Extract email (if available in custom claims or standard claims)
    email = token_payload.get("email") or token_payload.get(
        "https://disease-community.com/email"
    )
    
    return {
        "user_id": user_id,
        "email": email,
        "permissions": token_payload.get("permissions", []),
        "token_payload": token_payload,
    }


def require_permission(required_permission: str):
    """
    Dependency to check if user has required permission.
    
    Args:
        required_permission: Permission string (e.g., "read:profile")
        
    Returns:
        Callable: Dependency function
    """

    def permission_checker(current_user: Dict = Depends(get_current_user)) -> Dict:
        permissions = current_user.get("permissions", [])
        if required_permission not in permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{required_permission}' required",
            )
        return current_user

    return permission_checker


# Optional: User with optional authentication
async def get_current_user_optional(
    request: Request,
) -> Optional[Dict]:
    """
    Get current user if authenticated, otherwise return None.
    Useful for endpoints that work both with and without authentication.
    
    Args:
        request: FastAPI request object
        
    Returns:
        Dict or None: User information if authenticated, None otherwise
    """
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    try:
        token = authorization.split(" ")[1]
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        token_payload = await verify_token(credentials)
        return get_current_user(token_payload)
    except (HTTPException, IndexError):
        return None

