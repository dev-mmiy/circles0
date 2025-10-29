"""
User API endpoints with Auth0 integration and profile management.
"""

from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate, UserPublicResponse
from app.auth.dependencies import get_current_user, get_current_user_optional

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get current authenticated user's profile."""
    auth0_id = current_user.get("sub")
    
    if not auth0_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
    
    user = db.query(User).options(joinedload(User.diseases)).filter(
        User.auth0_id == auth0_id
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    # Update last login timestamp
    user.last_login_at = datetime.utcnow()
    db.commit()
    
    return user


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update current authenticated user's profile."""
    auth0_id = current_user.get("sub")
    
    if not auth0_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
    
    user = db.query(User).filter(User.auth0_id == auth0_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    # Update user fields
    for field, value in user_data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    return user


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_or_get_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """Create a new user from Auth0 data or return existing user."""
    # Check if user already exists by auth0_id
    existing_user = db.query(User).filter(
        User.auth0_id == user_data.auth0_id
    ).first()
    
    if existing_user:
        # Update email_verified if changed
        if existing_user.email_verified != user_data.email_verified:
            existing_user.email_verified = user_data.email_verified
            db.commit()
            db.refresh(existing_user)
        return existing_user
    
    # Check if user already exists by email
    existing_user_by_email = db.query(User).filter(
        User.email == user_data.email
    ).first()
    
    if existing_user_by_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Create new user
    user = User(**user_data.model_dump())
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user


@router.get("/{user_id}", response_model=UserPublicResponse)
async def get_user_public_profile(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_optional)
):
    """Get a user's public profile."""
    user = db.query(User).options(joinedload(User.diseases)).filter(
        User.id == user_id,
        User.is_active == True
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check profile visibility
    is_own_profile = current_user and current_user.get("sub") == user.auth0_id
    
    if user.profile_visibility == 'private':
        # Only the user themselves can view their private profile
        if not is_own_profile:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This profile is private"
            )
    elif user.profile_visibility == 'limited':
        # Only authenticated users can view limited profiles
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This profile is only visible to authenticated users"
            )
    # 'public' profiles are visible to everyone
    
    return user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete current user's account (soft delete)."""
    auth0_id = current_user.get("sub")
    
    if not auth0_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
    
    user = db.query(User).filter(User.auth0_id == auth0_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Soft delete
    user.is_active = False
    db.commit()
    
    return None
