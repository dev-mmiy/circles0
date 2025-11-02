"""
User API endpoints with Auth0 integration and profile management.
"""

from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.disease import Disease, UserDisease
from app.schemas.user import UserCreate, UserResponse, UserUpdate, UserPublicResponse
from app.schemas.disease import DiseaseResponse
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
    
    user = db.query(User).filter(
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
    db.refresh(user)
    
    # Get user's diseases through the relationship
    user_diseases = (
        db.query(Disease)
        .join(UserDisease, UserDisease.disease_id == Disease.id)
        .filter(UserDisease.user_id == user.id)
        .filter(UserDisease.is_active == True)
        .filter(Disease.is_active == True)
        .all()
    )
    
    # Create response with diseases
    user_dict = {
        "id": user.id,
        "auth0_id": user.auth0_id,
        "email": user.email,
        "email_verified": user.email_verified,
        "display_name": user.display_name,
        "username": user.username,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "date_of_birth": user.date_of_birth,
        "gender": user.gender,
        "country": user.country,
        "language": user.language,
        "timezone": user.timezone,
        "profile_visibility": user.profile_visibility,
        "show_email": user.show_email,
        "show_online_status": user.show_online_status,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "last_login_at": user.last_login_at,
        "is_active": user.is_active,
        "diseases": user_diseases
    }
    
    return user_dict


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
    # Use exclude_unset=True to only include fields that were explicitly set
    # This allows SQLAlchemy defaults to work properly
    user = User(**user_data.model_dump(exclude_unset=True))
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
    user = db.query(User).filter(
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
    
    # Get user's diseases
    user_diseases = (
        db.query(Disease)
        .join(UserDisease, UserDisease.disease_id == Disease.id)
        .filter(UserDisease.user_id == user.id)
        .filter(UserDisease.is_active == True)
        .filter(Disease.is_active == True)
        .all()
    )
    
    # Create response with diseases
    user_dict = {
        "id": user.id,
        "display_name": user.display_name,
        "username": user.username,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "country": user.country,
        "created_at": user.created_at,
        "diseases": user_diseases
    }
    
    # Include email only if user has chosen to show it
    # Note: Email is never shown in public profiles for privacy
    # Users can only see their own email in their full profile (/me)
    
    return user_dict


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


# User Disease Management Endpoints

@router.get("/me/diseases", response_model=List[DiseaseResponse])
async def get_current_user_diseases(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get current user's diseases."""
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
    
    # Get user's diseases through UserDisease relationship
    user_diseases = (
        db.query(Disease)
        .join(UserDisease, UserDisease.disease_id == Disease.id)
        .filter(UserDisease.user_id == user.id)
        .filter(UserDisease.is_active == True)
        .filter(Disease.is_active == True)
        .all()
    )
    
    return user_diseases


@router.post("/me/diseases/{disease_id}", status_code=status.HTTP_201_CREATED)
async def add_disease_to_current_user(
    disease_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a disease to current user's profile."""
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
    
    # Check if disease exists
    disease = db.query(Disease).filter(
        Disease.id == disease_id,
        Disease.is_active == True
    ).first()
    
    if not disease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disease not found"
        )
    
    # Check if user already has this disease
    existing = db.query(UserDisease).filter(
        UserDisease.user_id == user.id,
        UserDisease.disease_id == disease_id,
        UserDisease.is_active == True
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Disease already added to your profile"
        )
    
    # Add disease to user
    user_disease = UserDisease(
        user_id=user.id,
        disease_id=disease_id,
        is_active=True
    )
    db.add(user_disease)
    db.commit()
    
    return {"message": "Disease added successfully", "disease": disease}


@router.delete("/me/diseases/{disease_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_disease_from_current_user(
    disease_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Remove a disease from current user's profile."""
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
    
    # Find the user_disease relationship
    user_disease = db.query(UserDisease).filter(
        UserDisease.user_id == user.id,
        UserDisease.disease_id == disease_id,
        UserDisease.is_active == True
    ).first()
    
    if not user_disease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disease not found in your profile"
        )
    
    # Soft delete (set is_active to False)
    user_disease.is_active = False
    db.commit()
    
    return None
