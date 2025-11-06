"""
Auth0 JWT verification utilities.
"""

import json
import os
from typing import Any, Dict, Optional

import requests
from fastapi import HTTPException, status
from jose import JWTError, jwt


class Auth0Service:
    """Auth0 JWT verification service."""

    def __init__(self):
        self.domain = os.getenv("AUTH0_DOMAIN")
        self.audience = os.getenv("AUTH0_AUDIENCE")
        self.algorithm = "RS256"
        self.jwks_url = f"https://{self.domain}/.well-known/jwks.json"
        self._jwks_cache = None

    def get_jwks(self) -> Dict[str, Any]:
        """Get JWKS (JSON Web Key Set) from Auth0."""
        if self._jwks_cache is None:
            try:
                response = requests.get(self.jwks_url, timeout=10)
                response.raise_for_status()
                self._jwks_cache = response.json()
            except requests.RequestException as e:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Failed to fetch JWKS: {str(e)}",
                )
        return self._jwks_cache

    def get_signing_key(self, token: str) -> str:
        """Get the signing key for JWT verification."""
        try:
            # Decode header to get key ID
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")

            if not kid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token header missing 'kid'",
                )

            # Get JWKS
            jwks = self.get_jwks()

            # Find the key with matching kid
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    # Convert JWK to PEM format
                    from jose.backends import RSAKey

                    return RSAKey(key, algorithm=self.algorithm)

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to find appropriate key",
            )

        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token verification failed: {str(e)}",
            )

    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify Auth0 JWT token and return payload."""
        if not self.domain or not self.audience:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Auth0 configuration missing",
            )

        try:
            # Get signing key
            signing_key = self.get_signing_key(token)

            # Verify and decode token
            payload = jwt.decode(
                token,
                signing_key,
                algorithms=[self.algorithm],
                audience=self.audience,
                issuer=f"https://{self.domain}/",
            )

            return payload

        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token verification failed: {str(e)}",
            )

    def get_user_info(self, token: str) -> Dict[str, Any]:
        """Get user information from Auth0 token."""
        payload = self.verify_token(token)

        return {
            "sub": payload.get("sub"),
            "email": payload.get("email"),
            "name": payload.get("name"),
            "picture": payload.get("picture"),
            "email_verified": payload.get("email_verified", False),
            "permissions": payload.get("permissions", []),
        }


# Global Auth0 service instance
auth0_service = Auth0Service()
