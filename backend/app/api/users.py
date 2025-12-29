"""
User API endpoints with Auth0 integration and profile management.

This module has been refactored to use a service layer for business logic,
improving maintainability and testability.
"""

import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.auth.dependencies import get_current_user, get_current_user_optional
from app.database import get_db
from app.models.disease import Disease
from app.models.user import User
from app.schemas.disease import (
    DiseaseResponse,
    UserDiseaseCreate,
    UserDiseaseResponse,
    UserDiseaseUpdate,
)
from app.schemas.user import (
    AllFieldVisibilityResponse,
    FieldVisibilityResponse,
    FieldVisibilityUpdate,
    UserCreate,
    UserPublicResponse,
    UserResponse,
    UserUpdate,
)
from app.services.user_field_visibility_service import UserFieldVisibilityService
from app.services.user_service import UserService
from app.utils.auth_utils import extract_auth0_id

router = APIRouter()


def format_user_response(user: User, db: Session) -> dict:
    """
    Format User object to UserResponse dict with properly formatted diseases.

    Args:
        user: User object to format
        db: Database session for querying diseases

    Returns:
        Dictionary compatible with UserResponse schema
    """
    # Get user's diseases (returns Disease objects)
    diseases = UserService.get_user_diseases(db, user.id)

    # Convert Disease objects to UserDiseaseResponse format with translations
    user_diseases = [
        {
            "id": disease.id,
            "name": disease.name,
            "description": disease.description,
            "category": disease.category,
            "translations": [
                {
                    "language_code": trans.language_code,
                    "translated_name": trans.translated_name,
                    "details": trans.details,
                }
                for trans in disease.translations
            ],
        }
        for disease in diseases
    ]

    # Create response with diseases
    return {
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
        "timezone": user.timezone,  # Internal use only for time display
        "profile_visibility": user.profile_visibility,
        "show_email": user.show_email,
        "show_online_status": user.show_online_status,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "last_login_at": user.last_login_at,
        "is_active": user.is_active,
        "diseases": user_diseases,
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)
):
    """Get current authenticated user's profile."""
    auth0_id = extract_auth0_id(current_user)

    user = UserService.get_user_by_auth0_id(db, auth0_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found"
        )

    # Update last login timestamp
    user = UserService.update_last_login(db, user)

    return format_user_response(user, db)


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update current authenticated user's profile."""
    auth0_id = extract_auth0_id(current_user)

    user = UserService.get_user_by_auth0_id(db, auth0_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found"
        )

    # Update user profile
    user = UserService.update_user(db, user, user_data)

    return format_user_response(user, db)


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_or_get_user(user_data: UserCreate, db: Session = Depends(get_db)):
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

            return format_user_response(existing_user, db)

        # Create new user
        user = UserService.create_user(db, user_data)

        return format_user_response(user, db)
    except HTTPException:
        raise
    except Exception as e:
        import traceback

        logger.error(f"Error creating user: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}",
        )


@router.get("/search")
async def search_users(
    q: Optional[str] = Query(None, description="Search query (nickname or bio)"),
    disease_ids: Optional[str] = Query(
        None, description="Comma-separated disease IDs to filter by"
    ),
    country: Optional[str] = Query(None, description="Country code"),
    language: Optional[str] = Query(None, description="Language code"),
    sort_by: str = Query(
        "created_at",
        pattern="^(created_at|last_login_at|nickname|post_count)$",
        description="Sort field: created_at, last_login_at, nickname, or post_count",
    ),
    sort_order: str = Query(
        "desc", pattern="^(asc|desc)$", description="Sort order: asc or desc"
    ),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_optional),
):
    """
    Search for users with various filters.

    - Search by nickname or bio (q parameter)
    - Filter by disease IDs (comma-separated)
    - Filter by country and language
    - Sort by created_at, last_login_at, or nickname
    """
    from sqlalchemy import asc, desc, func, or_, and_
    from sqlalchemy.orm import joinedload

    # Start with base query (only active users)
    query = db.query(User).filter(User.is_active == True)

    # Exclude current user from search results
    if current_user:
        from app.utils.auth_utils import extract_auth0_id
        from app.services.user_service import UserService
        
        auth0_id = extract_auth0_id(current_user)
        viewer = UserService.get_user_by_auth0_id(db, auth0_id)
        if viewer:
            query = query.filter(User.id != viewer.id)

    # Search by query string (nickname or bio)
    if q:
        query = query.filter(
            or_(
                User.nickname.ilike(f"%{q}%"),
                and_(User.bio.isnot(None), User.bio.ilike(f"%{q}%")),
            )
        )

    # Filter by disease IDs
    if disease_ids:
        disease_id_list = [
            int(did.strip()) for did in disease_ids.split(",") if did.strip()
        ]
        if disease_id_list:
            from app.models.disease import UserDisease

            # Get users who have at least one of the specified diseases
            # (searchable diseases only - is_public is not required for search)
            users_with_diseases = (
                db.query(UserDisease.user_id)
                .filter(
                    UserDisease.disease_id.in_(disease_id_list),
                    UserDisease.is_active == True,
                    UserDisease.is_searchable == True,
                )
                .distinct()
            )
            query = query.filter(User.id.in_(users_with_diseases))

    # Filter by country
    if country:
        query = query.filter(User.country == country)

    # Filter by language
    if language:
        query = query.filter(User.language == language)

    # Apply sorting and get post counts
    post_count_subquery = None
    if sort_by == "post_count":
        # Sort by post count (number of posts in feed)
        from app.models.post import Post
        post_count_subquery = (
            db.query(Post.user_id, func.count(Post.id).label('post_count'))
            .filter(Post.is_active == True)
            .group_by(Post.user_id)
            .subquery()
        )
        query = query.outerjoin(
            post_count_subquery, User.id == post_count_subquery.c.user_id
        )
        # Add post_count to the select columns
        query = query.add_columns(func.coalesce(post_count_subquery.c.post_count, 0).label('post_count'))
        if sort_order == "asc":
            query = query.order_by(func.coalesce(post_count_subquery.c.post_count, 0).asc())
        else:
            query = query.order_by(func.coalesce(post_count_subquery.c.post_count, 0).desc())
    elif sort_by == "nickname":
        order_func = asc if sort_order == "asc" else desc
        query = query.order_by(order_func(User.nickname))
    elif sort_by == "last_login_at":
        order_func = asc if sort_order == "asc" else desc
        query = query.order_by(order_func(User.last_login_at))
    else:  # created_at (default)
        order_func = asc if sort_order == "asc" else desc
        query = query.order_by(order_func(User.created_at))

    # Apply limit and execute query
    if sort_by == "post_count":
        # When sorting by post_count, the query returns tuples (User, post_count)
        results_with_counts = query.limit(limit).all()
        users = [row[0] for row in results_with_counts]
        post_counts = {row[0].id: int(row[1]) for row in results_with_counts}
    else:
        users = query.limit(limit).all()
        # Get post counts for all users in a single query
        from app.models.post import Post
        user_ids = [user.id for user in users]
        if user_ids:
            post_counts_query = (
                db.query(Post.user_id, func.count(Post.id).label('post_count'))
                .filter(
                    Post.user_id.in_(user_ids),
                    Post.is_active == True
                )
                .group_by(Post.user_id)
                .all()
            )
            post_counts = {user_id: int(count) for user_id, count in post_counts_query}
        else:
            post_counts = {}

    # Get current viewer's ID for visibility checks
    viewer_id = None
    viewer_disease_ids = None
    if current_user:
        auth0_id = extract_auth0_id(current_user)
        viewer = UserService.get_user_by_auth0_id(db, auth0_id)
        if viewer:
            viewer_id = viewer.id
            from app.models.disease import UserDisease

            viewer_disease_ids = [
                ud.disease_id
                for ud in db.query(UserDisease)
                .filter(
                    UserDisease.user_id == viewer_id,
                    UserDisease.is_active.is_(True),
                )
                .all()
            ]

    # Build response with visibility filtering
    results = []
    for user in users:
        # Check profile visibility
        try:
            UserService.check_profile_visibility(user, current_user, db)
        except HTTPException:
            # Skip users whose profiles are not visible
            continue

        # Get user's public diseases
        user_diseases = UserService.get_user_public_diseases(db, user.id)

        # Get post count for this user
        if sort_by == "post_count" and user.id in post_counts:
            post_count = post_counts[user.id]
        else:
            # Calculate post count if not already in query
            from app.models.post import Post
            post_count = db.query(func.count(Post.id)).filter(
                Post.user_id == user.id,
                Post.is_active == True
            ).scalar() or 0

        # Build user dict with field-level visibility
        user_dict = {
            "id": user.id,
            "member_id": user.member_id,
            "nickname": user.nickname,  # Always visible
            "created_at": user.created_at,  # Always visible
            "post_count": post_count,  # Number of posts in feed
            "diseases": [
                {
                    "id": d.id,
                    "name": d.name,
                    "description": d.description,
                    "category": d.category,
                    "translations": [
                        {
                            "language_code": trans.language_code,
                            "translated_name": trans.translated_name,
                            "details": trans.details,
                        }
                        for trans in d.translations
                    ],
                }
                for d in user_diseases
            ],
        }

        # Check visibility for each field
        fields_to_check = {
            "username": user.username,
            "bio": user.bio,
            "avatar_url": user.avatar_url,
            "country": user.country,
            "date_of_birth": user.date_of_birth,
            "gender": user.gender,
            "language": user.language,
        }

        for field_name, field_value in fields_to_check.items():
            if UserFieldVisibilityService.can_view_field(
                db, user.id, field_name, viewer_id, viewer_disease_ids
            ):
                user_dict[field_name] = field_value

        results.append(user_dict)

    return results


@router.get("/{user_id}", response_model=UserPublicResponse)
async def get_user_public_profile(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_optional),
):
    """Get a user's public profile with field-level visibility filtering."""
    from app.models.disease import UserDisease

    user = UserService.get_user_by_id(db, user_id, active_only=True)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Check profile visibility (with block check)
    UserService.check_profile_visibility(user, current_user, db)

    # Get current viewer's ID and disease IDs
    viewer_id = None
    viewer_disease_ids = None
    is_own_profile = False
    if current_user:
        auth0_id = extract_auth0_id(current_user)
        viewer = UserService.get_user_by_auth0_id(db, auth0_id)
        if viewer:
            viewer_id = viewer.id
            is_own_profile = viewer_id == user.id
            viewer_disease_ids = [
                ud.disease_id
                for ud in db.query(UserDisease)
                .filter(
                    UserDisease.user_id == viewer_id,
                    UserDisease.is_active.is_(True),
                )
                .all()
            ]

    # Get user's diseases
    # Always show only public diseases for public profile endpoint
    # This ensures that /profile/{user_id} shows the same information as others see
    # Uses get_user_public_diseases_for_profile to respect is_public setting
    user_diseases = UserService.get_user_public_diseases_for_profile(db, user.id)

    # Convert Disease objects to UserDiseaseResponse format with translations
    diseases_list = [
        {
            "id": disease.id,
            "name": disease.name,
            "description": disease.description,
            "category": disease.category,
            "translations": [
                {
                    "id": trans.id,
                    "disease_id": trans.disease_id,
                    "language_code": trans.language_code,
                    "translated_name": trans.translated_name,
                    "details": trans.details,
                    "created_at": trans.created_at,
                    "updated_at": trans.updated_at,
                }
                for trans in disease.translations
            ],
        }
        for disease in user_diseases
    ]

    # Build response with field-level visibility filtering
    user_dict = {
        "id": user.id,
        "member_id": user.member_id,
        "nickname": user.nickname,  # Always visible
        "created_at": user.created_at,  # Always visible
        "diseases": diseases_list,  # Already filtered to public diseases with translations
    }

    # Check visibility for each field
    # Always include fields in response (set to None if not visible)
    fields_to_check = {
        "username": user.username,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "country": user.country,
        "date_of_birth": user.date_of_birth,
        "gender": user.gender,
        "language": user.language,
        "preferred_language": user.preferred_language,
    }

    for field_name, field_value in fields_to_check.items():
        if UserFieldVisibilityService.can_view_field(
            db, user.id, field_name, viewer_id, viewer_disease_ids
        ):
            user_dict[field_name] = field_value
        else:
            # Set to None if field is not visible (to satisfy schema requirements)
            user_dict[field_name] = None

    return user_dict


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user(
    db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)
):
    """Delete current user's account (soft delete)."""
    auth0_id = extract_auth0_id(current_user)

    user = UserService.get_user_by_auth0_id(db, auth0_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Soft delete
    UserService.soft_delete_user(db, user)

    return None


# User Disease Management Endpoints


@router.get("/me/diseases", response_model=List[UserDiseaseResponse])
async def get_current_user_diseases(
    db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)
):
    """Get current user's diseases with detailed information."""
    auth0_id = extract_auth0_id(current_user)

    user = UserService.get_user_by_auth0_id(db, auth0_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Get user's diseases with detailed information
    user_diseases = UserService.get_all_user_diseases(db, user.id)

    return user_diseases


@router.post("/me/diseases/{disease_id}", status_code=status.HTTP_201_CREATED)
async def add_disease_to_current_user(
    disease_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Add a disease to current user's profile."""
    auth0_id = extract_auth0_id(current_user)

    user = UserService.get_user_by_auth0_id(db, auth0_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
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
    current_user: dict = Depends(get_current_user),
):
    """Remove a disease from current user's profile by UserDisease ID."""
    auth0_id = extract_auth0_id(current_user)

    user = UserService.get_user_by_auth0_id(db, auth0_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Remove disease from user by UserDisease ID
    UserService.remove_disease_from_user_by_id(db, user.id, user_disease_id)

    return None


# Extended User Disease Management Endpoints


@router.post(
    "/me/diseases",
    response_model=UserDiseaseResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_disease_to_user_detailed(
    disease_data: UserDiseaseCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
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
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Add disease with detailed information
    user_disease = UserService.add_disease_to_user_detailed(db, user.id, disease_data)

    return user_disease


@router.get("/me/diseases/{user_disease_id}", response_model=UserDiseaseResponse)
async def get_user_disease_detail(
    user_disease_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get detailed information about a specific disease in user's profile."""
    auth0_id = extract_auth0_id(current_user)

    user = UserService.get_user_by_auth0_id(db, auth0_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    user_disease = UserService.get_user_disease_by_id(db, user.id, user_disease_id)
    if not user_disease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disease not found in your profile",
        )

    return user_disease


@router.put("/me/diseases/{user_disease_id}", response_model=UserDiseaseResponse)
async def update_user_disease_detail(
    user_disease_id: int,
    disease_data: UserDiseaseUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
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
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Update disease information
    user_disease = UserService.update_user_disease_by_id(
        db, user.id, user_disease_id, disease_data
    )

    return user_disease


@router.delete("/me/diseases/{user_disease_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user_disease(
    user_disease_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Remove a disease from user's profile."""
    auth0_id = extract_auth0_id(current_user)

    user = UserService.get_user_by_auth0_id(db, auth0_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Delete the disease
    UserService.remove_disease_from_user(db, user.id, user_disease_id)

    return None


# Field Visibility Endpoints


@router.get(
    "/me/field-visibility",
    response_model=AllFieldVisibilityResponse,
    summary="Get all field visibility settings",
)
async def get_field_visibilities(
    db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)
):
    """Get all field visibility settings for the current user."""
    from app.utils.auth_utils import extract_auth0_id

    auth0_id = extract_auth0_id(current_user)
    user = UserService.get_user_by_auth0_id(db, auth0_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    field_visibilities = UserFieldVisibilityService.get_all_field_visibilities(
        db, user.id
    )

    return AllFieldVisibilityResponse(field_visibilities=field_visibilities)


@router.put(
    "/me/field-visibility/{field_name}",
    response_model=FieldVisibilityResponse,
    summary="Set field visibility",
)
async def set_field_visibility(
    field_name: str,
    visibility_data: FieldVisibilityUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Set visibility for a specific field."""
    from app.utils.auth_utils import extract_auth0_id

    auth0_id = extract_auth0_id(current_user)
    user = UserService.get_user_by_auth0_id(db, auth0_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Ensure field_name matches
    if field_name != visibility_data.field_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field name in URL must match field name in body",
        )

    try:
        visibility_setting = UserFieldVisibilityService.set_field_visibility(
            db, user.id, visibility_data.field_name, visibility_data.visibility
        )

        return FieldVisibilityResponse(
            field_name=visibility_setting.field_name,
            visibility=visibility_setting.visibility,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
