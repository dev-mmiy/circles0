"""
User management API endpoints.
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, NameDisplayOrder, LocaleNameFormat, UserPreference
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserPublic,
    UserPreferenceCreate,
    UserPreferenceUpdate,
    UserPreferenceResponse,
    NameDisplayOrderResponse,
    LocaleNameFormatResponse,
)
from app.utils.member_id import generate_unique_member_id, format_member_id

router = APIRouter()


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Create a new user."""
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.email == user_data.email) | 
        (User.idp_id == user_data.idp_id)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or IDP ID already exists"
        )
    
    # Generate unique member ID
    member_id = generate_unique_member_id(db)
    
    # Create user
    user = User(
        member_id=member_id,
        idp_id=user_data.idp_id,
        idp_provider=user_data.idp_provider,
        first_name=user_data.first_name,
        middle_name=user_data.middle_name,
        last_name=user_data.last_name,
        name_display_order=user_data.name_display_order,
        custom_name_format=user_data.custom_name_format,
        email=user_data.email,
        phone=user_data.phone,
        birth_date=user_data.birth_date,
        country_code=user_data.country_code,
        timezone=user_data.timezone,
        nickname=user_data.nickname,
        display_name=user_data.display_name,
        bio=user_data.bio,
        avatar_url=user_data.avatar_url,
        preferred_language=user_data.preferred_language,
        preferred_locale=user_data.preferred_locale,
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Add computed fields
    user_response = UserResponse.from_orm(user)
    user_response.full_name = user.get_full_name()
    user_response.formatted_member_id = format_member_id(user.member_id)
    
    return user_response


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: UUID, db: Session = Depends(get_db)):
    """Get user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Add computed fields
    user_response = UserResponse.from_orm(user)
    user_response.full_name = user.get_full_name()
    user_response.formatted_member_id = format_member_id(user.member_id)
    
    return user_response


@router.get("/member/{member_id}", response_model=UserResponse)
async def get_user_by_member_id(member_id: str, db: Session = Depends(get_db)):
    """Get user by member ID."""
    user = db.query(User).filter(User.member_id == member_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Add computed fields
    user_response = UserResponse.from_orm(user)
    user_response.full_name = user.get_full_name()
    user_response.formatted_member_id = format_member_id(user.member_id)
    
    return user_response


@router.get("/public/{user_id}", response_model=UserPublic)
async def get_public_user(user_id: UUID, db: Session = Depends(get_db)):
    """Get public user information."""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not user.is_profile_public:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User profile is private"
        )
    
    # Add computed fields
    user_response = UserPublic.from_orm(user)
    user_response.full_name = user.get_full_name()
    user_response.formatted_member_id = format_member_id(user.member_id)
    
    return user_response


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID, 
    user_data: UserUpdate, 
    db: Session = Depends(get_db)
):
    """Update user information."""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update user fields
    update_data = user_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    # Add computed fields
    user_response = UserResponse.from_orm(user)
    user_response.full_name = user.get_full_name()
    user_response.formatted_member_id = format_member_id(user.member_id)
    
    return user_response


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: UUID, db: Session = Depends(get_db)):
    """Delete user."""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    db.delete(user)
    db.commit()


@router.get("/name-display-orders/", response_model=List[NameDisplayOrderResponse])
async def get_name_display_orders(db: Session = Depends(get_db)):
    """Get available name display orders."""
    orders = db.query(NameDisplayOrder).filter(NameDisplayOrder.is_active).all()
    return orders


@router.get("/locale-formats/", response_model=List[LocaleNameFormatResponse])
async def get_locale_formats(db: Session = Depends(get_db)):
    """Get locale-specific name formats."""
    formats = db.query(LocaleNameFormat).filter(LocaleNameFormat.is_active).all()
    return formats


@router.get("/{user_id}/preferences/", response_model=List[UserPreferenceResponse])
async def get_user_preferences(user_id: UUID, db: Session = Depends(get_db)):
    """Get user preferences."""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user.preferences


@router.post("/{user_id}/preferences/", response_model=UserPreferenceResponse)
async def create_user_preference(
    user_id: UUID,
    preference_data: UserPreferenceCreate,
    db: Session = Depends(get_db)
):
    """Create user preference."""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if preference already exists
    existing_preference = db.query(UserPreference).filter(
        UserPreference.user_id == user_id,
        UserPreference.preference_key == preference_data.preference_key
    ).first()
    
    if existing_preference:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Preference already exists"
        )
    
    preference = UserPreference(
        user_id=user_id,
        preference_key=preference_data.preference_key,
        preference_value=preference_data.preference_value
    )
    
    db.add(preference)
    db.commit()
    db.refresh(preference)
    
    return preference


@router.put(
    "/{user_id}/preferences/{preference_id}", 
    response_model=UserPreferenceResponse
)
async def update_user_preference(
    user_id: UUID,
    preference_id: int,
    preference_data: UserPreferenceUpdate,
    db: Session = Depends(get_db)
):
    """Update user preference."""
    preference = db.query(UserPreference).filter(
        UserPreference.id == preference_id,
        UserPreference.user_id == user_id
    ).first()
    
    if not preference:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preference not found"
        )
    
    update_data = preference_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(preference, field, value)
    
    db.commit()
    db.refresh(preference)
    
    return preference
