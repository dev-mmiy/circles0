"""
Auth0 JWT verification utilities.
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

import requests
from fastapi import HTTPException, status
from jose import JWTError, jwt

# Load .env file before reading environment variables
try:
    from dotenv import load_dotenv
    
    # Load .env file from backend directory
    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists() and env_file.is_file():
        load_dotenv(dotenv_path=str(env_file.resolve()), override=False, verbose=False)
except ImportError:
    # dotenv not available, skip loading
    pass
except Exception:
    # Silently ignore errors if .env file cannot be loaded
    pass


class Auth0Service:
    """Auth0 JWT verification service."""

    def __init__(self):
        # Reload environment variables in case .env was loaded after module import
        self.domain = os.getenv("AUTH0_DOMAIN")
        self.audience = os.getenv("AUTH0_AUDIENCE")
        self.algorithm = "RS256"
        # Only set jwks_url if domain is available
        if self.domain:
            self.jwks_url = f"https://{self.domain}/.well-known/jwks.json"
        else:
            self.jwks_url = None
        self._jwks_cache = None
    
    def _reload_env(self):
        """Reload environment variables from .env file if needed."""
        try:
            from dotenv import load_dotenv
            from pathlib import Path
            env_file = Path(__file__).parent.parent / ".env"
            if env_file.exists() and env_file.is_file():
                # Force reload by clearing any cached values
                load_dotenv(dotenv_path=str(env_file.resolve()), override=True, verbose=False)
                # Update instance variables directly from os.getenv
                self.domain = os.getenv("AUTH0_DOMAIN") or os.environ.get("AUTH0_DOMAIN")
                self.audience = os.getenv("AUTH0_AUDIENCE") or os.environ.get("AUTH0_AUDIENCE")
                if self.domain:
                    self.jwks_url = f"https://{self.domain}/.well-known/jwks.json"
                else:
                    self.jwks_url = None
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.debug(f"Error reloading env: {str(e)}")

    def get_jwks(self) -> Dict[str, Any]:
        """Get JWKS (JSON Web Key Set) from Auth0."""
        # Ensure jwks_url is set
        if not self.jwks_url:
            self._reload_env()
            if not self.domain:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="AUTH0_DOMAIN is not configured",
                )
            self.jwks_url = f"https://{self.domain}/.well-known/jwks.json"
        
        if self._jwks_cache is None:
            try:
                response = requests.get(self.jwks_url, timeout=10)
                response.raise_for_status()
                self._jwks_cache = response.json()
            except requests.RequestException as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to fetch JWKS from {self.jwks_url}: {str(e)}")
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
        # Always reload environment variables to ensure they're up to date
        self._reload_env()
        
        # If still missing, try reading directly from environment
        if not self.domain or not self.audience:
            self.domain = os.getenv("AUTH0_DOMAIN") or os.environ.get("AUTH0_DOMAIN")
            self.audience = os.getenv("AUTH0_AUDIENCE") or os.environ.get("AUTH0_AUDIENCE")
            if self.domain:
                self.jwks_url = f"https://{self.domain}/.well-known/jwks.json"
        
        if not self.domain or not self.audience:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Auth0 configuration missing: domain={self.domain}, audience={self.audience}")
            # Try to read .env file directly to debug
            try:
                from pathlib import Path
                env_file = Path(__file__).parent.parent / ".env"
                if env_file.exists():
                    with open(env_file, 'r') as f:
                        content = f.read()
                        has_domain = "AUTH0_DOMAIN" in content
                        has_audience = "AUTH0_AUDIENCE" in content
                        logger.error(f".env file exists: {env_file.exists()}, has AUTH0_DOMAIN: {has_domain}, has AUTH0_AUDIENCE: {has_audience}")
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Auth0 configuration missing: domain={bool(self.domain)}, audience={bool(self.audience)}. Please check AUTH0_DOMAIN and AUTH0_AUDIENCE in .env file.",
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

        except HTTPException:
            # Re-raise HTTPException as-is
            raise
        except JWTError as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"JWT verification failed: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token verification failed: {str(e)}",
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Unexpected error during token verification: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal server error during token verification: {str(e)}",
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
