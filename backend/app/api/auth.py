"""
Authentication API Endpoints

This module provides endpoints for authentication-related operations.
"""

from typing import Dict

from fastapi import APIRouter, Depends, Request

from app.utils.auth import get_current_user, get_current_user_optional

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])


@router.get("/me")
async def get_authenticated_user(current_user: Dict = Depends(get_current_user)):
    """
    Get current authenticated user information.
    
    Requires: Valid Auth0 access token
    
    Returns:
        Dict: Current user information from token
    """
    return {
        "status": "authenticated",
        "user": {
            "user_id": current_user["user_id"],
            "email": current_user["email"],
            "permissions": current_user["permissions"],
        },
    }


@router.get("/status")
async def get_auth_status(
    request: Request,
):
    """
    Check authentication status.
    
    Works both with and without authentication.
    
    Returns:
        Dict: Authentication status
    """
    current_user = await get_current_user_optional(request)
    if current_user:
        return {
            "authenticated": True,
            "user_id": current_user["user_id"],
            "email": current_user["email"],
        }
    else:
        return {"authenticated": False}


@router.get("/public")
async def public_endpoint():
    """
    Public endpoint (no authentication required).
    
    Returns:
        Dict: Public message
    """
    return {
        "message": "This is a public endpoint",
        "authentication_required": False,
    }

