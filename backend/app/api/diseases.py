"""
Disease management API endpoints.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.database import get_db
from app.models.disease import Disease, UserDisease
from app.models.user import User
from app.schemas.disease import (
    DiseaseCreate,
    DiseaseListResponse,
    DiseaseResponse,
    DiseaseUpdate,
    UserDiseaseCreate,
    UserDiseaseListResponse,
    UserDiseaseResponse,
    UserDiseaseUpdate,
)
from app.utils.auth import get_current_user, require_permission

router = APIRouter()


# Disease CRUD endpoints
@router.post("/", response_model=DiseaseResponse, status_code=status.HTTP_201_CREATED)
async def create_disease(
    disease_data: DiseaseCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("manage:diseases"))
):
    """Create a new disease (admin only)."""
    # Check if disease already exists
    existing_disease = db.query(Disease).filter(Disease.name == disease_data.name).first()
    
    if existing_disease:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Disease with this name already exists"
        )
    
    # Create disease
    disease = Disease(**disease_data.dict())
    db.add(disease)
    db.commit()
    db.refresh(disease)
    
    return disease


@router.get("/", response_model=DiseaseListResponse)
async def get_diseases(
    query: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db)
):
    """Get list of diseases with filtering and pagination."""
    # Build query
    q = db.query(Disease)
    
    # Apply filters
    if query:
        q = q.filter(
            or_(
                Disease.name.ilike(f"%{query}%"),
                Disease.description.ilike(f"%{query}%"),
                Disease.name_ja.ilike(f"%{query}%"),
                Disease.description_ja.ilike(f"%{query}%")
            )
        )
    
    if category:
        q = q.filter(Disease.category == category)
    
    if is_active is not None:
        q = q.filter(Disease.is_active == is_active)
    
    # Get total count
    total = q.count()
    
    # Apply pagination
    offset = (page - 1) * size
    diseases = q.offset(offset).limit(size).all()
    
    # Calculate pagination info
    has_next = offset + size < total
    has_prev = page > 1
    
    return DiseaseListResponse(
        diseases=diseases,
        total=total,
        page=page,
        size=size,
        has_next=has_next,
        has_prev=has_prev
    )


@router.get("/{disease_id}", response_model=DiseaseResponse)
async def get_disease(disease_id: int, db: Session = Depends(get_db)):
    """Get disease by ID."""
    disease = db.query(Disease).filter(Disease.id == disease_id).first()
    
    if not disease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disease not found"
        )
    
    return disease


@router.put("/{disease_id}", response_model=DiseaseResponse)
async def update_disease(
    disease_id: int,
    disease_data: DiseaseUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("manage:diseases"))
):
    """Update disease (admin only)."""
    disease = db.query(Disease).filter(Disease.id == disease_id).first()
    
    if not disease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disease not found"
        )
    
    # Update fields
    update_data = disease_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(disease, field, value)
    
    db.commit()
    db.refresh(disease)
    
    return disease


@router.delete("/{disease_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_disease(
    disease_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("manage:diseases"))
):
    """Delete disease (admin only)."""
    disease = db.query(Disease).filter(Disease.id == disease_id).first()
    
    if not disease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disease not found"
        )
    
    # Check if disease is associated with any users
    user_diseases_count = db.query(UserDisease).filter(UserDisease.disease_id == disease_id).count()
    if user_diseases_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete disease that is associated with users"
        )
    
    db.delete(disease)
    db.commit()


# User Disease endpoints
@router.post("/users/{user_id}/diseases", response_model=UserDiseaseResponse, status_code=status.HTTP_201_CREATED)
async def add_user_disease(
    user_id: UUID,
    user_disease_data: UserDiseaseCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add disease to user."""
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if disease exists
    disease = db.query(Disease).filter(Disease.id == user_disease_data.disease_id).first()
    if not disease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disease not found"
        )
    
    # Check if user already has this disease
    existing_user_disease = db.query(UserDisease).filter(
        and_(
            UserDisease.user_id == user_id,
            UserDisease.disease_id == user_disease_data.disease_id
        )
    ).first()
    
    if existing_user_disease:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has this disease"
        )
    
    # Create user disease
    user_disease = UserDisease(
        user_id=user_id,
        **user_disease_data.dict()
    )
    db.add(user_disease)
    db.commit()
    db.refresh(user_disease)
    
    # Load disease data for response
    user_disease.disease = disease
    
    return user_disease


@router.get("/users/{user_id}/diseases", response_model=UserDiseaseListResponse)
async def get_user_diseases(
    user_id: UUID,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db)
):
    """Get user's diseases."""
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get user diseases with disease data
    q = db.query(UserDisease).filter(UserDisease.user_id == user_id)
    total = q.count()
    
    offset = (page - 1) * size
    user_diseases = q.offset(offset).limit(size).all()
    
    # Load disease data for each user disease
    for user_disease in user_diseases:
        user_disease.disease = db.query(Disease).filter(Disease.id == user_disease.disease_id).first()
    
    has_next = offset + size < total
    has_prev = page > 1
    
    return UserDiseaseListResponse(
        user_diseases=user_diseases,
        total=total,
        page=page,
        size=size,
        has_next=has_next,
        has_prev=has_prev
    )


@router.put("/users/{user_id}/diseases/{user_disease_id}", response_model=UserDiseaseResponse)
async def update_user_disease(
    user_id: UUID,
    user_disease_id: int,
    user_disease_data: UserDiseaseUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update user disease."""
    user_disease = db.query(UserDisease).filter(
        and_(
            UserDisease.id == user_disease_id,
            UserDisease.user_id == user_id
        )
    ).first()
    
    if not user_disease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User disease not found"
        )
    
    # Update fields
    update_data = user_disease_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user_disease, field, value)
    
    db.commit()
    db.refresh(user_disease)
    
    # Load disease data for response
    user_disease.disease = db.query(Disease).filter(Disease.id == user_disease.disease_id).first()
    
    return user_disease


@router.delete("/users/{user_id}/diseases/{user_disease_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user_disease(
    user_id: UUID,
    user_disease_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Remove disease from user."""
    user_disease = db.query(UserDisease).filter(
        and_(
            UserDisease.id == user_disease_id,
            UserDisease.user_id == user_id
        )
    ).first()
    
    if not user_disease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User disease not found"
        )
    
    db.delete(user_disease)
    db.commit()


# Category endpoints
@router.get("/categories/list")
async def get_disease_categories(db: Session = Depends(get_db)):
    """Get list of disease categories."""
    categories = db.query(Disease.category).filter(
        Disease.category.isnot(None),
        Disease.is_active == True
    ).distinct().all()
    
    return [category[0] for category in categories if category[0]]

