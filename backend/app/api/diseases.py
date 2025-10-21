"""
Simple Disease API endpoints.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.disease import Disease, UserDisease
from app.models.user import User
from app.schemas.disease import DiseaseCreate, DiseaseResponse, DiseaseUpdate

router = APIRouter()


@router.get("/", response_model=List[DiseaseResponse])
async def get_diseases(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get list of diseases."""
    diseases = db.query(Disease).filter(Disease.is_active == True).offset(skip).limit(limit).all()
    return diseases


@router.get("/{disease_id}", response_model=DiseaseResponse)
async def get_disease(
    disease_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific disease by ID."""
    disease = db.query(Disease).filter(Disease.id == disease_id).first()
    if not disease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disease not found"
        )
    return disease


@router.post("/", response_model=DiseaseResponse, status_code=status.HTTP_201_CREATED)
async def create_disease(
    disease_data: DiseaseCreate,
    db: Session = Depends(get_db)
):
    """Create a new disease."""
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


@router.put("/{disease_id}", response_model=DiseaseResponse)
async def update_disease(
    disease_id: int,
    disease_data: DiseaseUpdate,
    db: Session = Depends(get_db)
):
    """Update a disease."""
    disease = db.query(Disease).filter(Disease.id == disease_id).first()
    if not disease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disease not found"
        )
    
    # Update disease
    for field, value in disease_data.dict(exclude_unset=True).items():
        setattr(disease, field, value)
    
    db.commit()
    db.refresh(disease)
    
    return disease


@router.delete("/{disease_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_disease(
    disease_id: int,
    db: Session = Depends(get_db)
):
    """Delete a disease (soft delete)."""
    disease = db.query(Disease).filter(Disease.id == disease_id).first()
    if not disease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disease not found"
        )
    
    # Soft delete
    disease.is_active = False
    db.commit()
    
    return None