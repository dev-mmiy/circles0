"""
User API endpoints with Auth0 integration and profile management.

This module has been refactored to use a service layer for business logic,
improving maintainability and testability.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import UserCreate, UserResponse, UserUpdate, UserPublicResponse
from app.schemas.disease import (
    DiseaseResponse,
    UserDiseaseCreate,
    UserDiseaseUpdate,
    UserDiseaseResponse,
)
from app.auth.dependencies import get_current_user, get_current_user_optional
from app.services.user_service import UserService
from app.utils.auth_utils import extract_auth0_id
from app.models.disease import Disease

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get current authenticated user's profile."""
    auth0_id = extract_auth0_id(current_user)
    
    user = UserService.get_user_by_auth0_id(db, auth0_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    # Update last login timestamp
    user = UserService.update_last_login(db, user)
    
    # Get user's diseases
    user_diseases = UserService.get_user_diseases(db, user.id)
    
    # Create response with diseases
    user_dict = {
        "id": user.id,
        "member_id": user.member_id,
        "auth0_id": user.auth0_id,
        "idp_id": user.idp_id,
        "idp_provider": user.idp_provider,
        "email": user.email,
        "email_verified": user.email_verified,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone": user.phone,
        "nickname": user.nickname,
        "username": user.username,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "date_of_birth": user.date_of_birth,
        "gender": user.gender,
        "country": user.country,
        "language": user.language,
        "preferred_language": user.preferred_language,
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
    auth0_id = extract_auth0_id(current_user)
    
    user = UserService.get_user_by_auth0_id(db, auth0_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    # Update user profile
    user = UserService.update_user(db, user, user_data)
    
    return user


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_or_get_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """Create a new user from Auth0 data or return existing user."""
    try:
        # Check if user already exists by auth0_id
        existing_user = UserService.get_user_by_auth0_id(db, user_data.auth0_id)
        
        if existing_user:
            # Update email_verified if changed
            if existing_user.email_verified != user_data.email_verified:
                existing_user.email_verified = user_data.email_verified
                db.commit()
                db.refresh(existing_user)
            return existing_user
        
        # Create new user
        user = UserService.create_user(db, user_data)
        
        return user
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error creating user: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )


@router.get("/{user_id}", response_model=UserPublicResponse)
async def get_user_public_profile(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_optional)
):
    """Get a user's public profile."""
    user = UserService.get_user_by_id(db, user_id, active_only=True)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check profile visibility
    UserService.check_profile_visibility(user, current_user)
    
    # Get user's diseases
    user_diseases = UserService.get_user_diseases(db, user.id)
    
    # Create response with diseases
    user_dict = {
        "id": user.id,
        "member_id": user.member_id,
        "nickname": user.nickname,
        "username": user.username,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "country": user.country,
        "created_at": user.created_at,
        "diseases": user_diseases
    }
    
    return user_dict


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete current user's account (soft delete)."""
    auth0_id = extract_auth0_id(current_user)
    
    user = UserService.get_user_by_auth0_id(db, auth0_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Soft delete
    UserService.soft_delete_user(db, user)
    
    return None


# User Disease Management Endpoints

@router.get("/me/diseases", response_model=List[UserDiseaseResponse])
async def get_current_user_diseases(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get current user's diseases with detailed information."""
    auth0_id = extract_auth0_id(current_user)

    user = UserService.get_user_by_auth0_id(db, auth0_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Get user's diseases with detailed information
    user_diseases = UserService.get_all_user_diseases(db, user.id)

    return user_diseases


@router.post("/me/diseases/{disease_id}", status_code=status.HTTP_201_CREATED)
async def add_disease_to_current_user(
    disease_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a disease to current user's profile."""
    auth0_id = extract_auth0_id(current_user)
    
    user = UserService.get_user_by_auth0_id(db, auth0_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Add disease to user
    user_disease = UserService.add_disease_to_user(db, user.id, disease_id)
    
    # Get disease for response
    disease = db.query(Disease).filter(Disease.id == disease_id).first()
    
    return {"message": "Disease added successfully", "disease": disease}


@router.delete("/me/diseases/{user_disease_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_disease_from_current_user(
    user_disease_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Remove a disease from current user's profile by UserDisease ID."""
    auth0_id = extract_auth0_id(current_user)

    user = UserService.get_user_by_auth0_id(db, auth0_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Remove disease from user by UserDisease ID
    UserService.remove_disease_from_user_by_id(db, user.id, user_disease_id)

    return None


# Extended User Disease Management Endpoints

@router.post("/me/diseases", response_model=UserDiseaseResponse, status_code=status.HTTP_201_CREATED)
async def add_disease_to_user_detailed(
    disease_data: UserDiseaseCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Add a disease to current user's profile with detailed information.

    This endpoint allows adding diseases with additional details such as:
    - Diagnosis information (doctor, hospital, date)
    - Symptoms and limitations
    - Medications
    - Disease status
    - Visibility settings
    """
    auth0_id = extract_auth0_id(current_user)

    user = UserService.get_user_by_auth0_id(db, auth0_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Add disease with detailed information
    user_disease = UserService.add_disease_to_user_detailed(db, user.id, disease_data)

    return user_disease


@router.get("/me/diseases/{user_disease_id}", response_model=UserDiseaseResponse)
async def get_user_disease_detail(
    user_disease_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed information about a specific disease in user's profile."""
    auth0_id = extract_auth0_id(current_user)

    user = UserService.get_user_by_auth0_id(db, auth0_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user_disease = UserService.get_user_disease_by_id(db, user.id, user_disease_id)
    if not user_disease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disease not found in your profile"
        )

    return user_disease


@router.put("/me/diseases/{user_disease_id}", response_model=UserDiseaseResponse)
async def update_user_disease_detail(
    user_disease_id: int,
    disease_data: UserDiseaseUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Update detailed information about a disease in user's profile.

    Allows updating:
    - Diagnosis information
    - Symptoms and limitations
    - Medications
    - Disease status
    - Visibility settings
    """
    auth0_id = extract_auth0_id(current_user)

    user = UserService.get_user_by_auth0_id(db, auth0_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update disease information
    user_disease = UserService.update_user_disease_by_id(db, user.id, user_disease_id, disease_data)

    return user_disease
