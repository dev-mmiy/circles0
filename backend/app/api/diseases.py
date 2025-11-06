"""
Disease API endpoints for browsing diseases, categories, and statuses.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.disease import Disease, UserDisease
from app.models.user import User
from app.schemas.disease import (
    DiseaseCategoryResponse,
    DiseaseCategoryTranslationResponse,
    DiseaseCreate,
    DiseaseResponse,
    DiseaseStatusResponse,
    DiseaseStatusTranslationResponse,
    DiseaseTranslationResponse,
    DiseaseUpdate,
)
from app.services.disease_category_service import DiseaseCategoryService
from app.services.disease_service import DiseaseService
from app.services.disease_status_service import DiseaseStatusService

router = APIRouter()


@router.get("/", response_model=List[DiseaseResponse])
async def get_diseases(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get list of diseases with their primary category."""
    from sqlalchemy.orm import joinedload

    from app.models.disease import DiseaseCategoryMapping

    diseases = (
        db.query(Disease)
        .options(joinedload(Disease.category_mappings))
        .filter(Disease.is_active == True)
        .offset(skip)
        .limit(limit)
        .all()
    )

    # Add primary category_id to each disease for the response
    result = []
    for disease in diseases:
        # Get the first category mapping as primary category
        mapping = (
            db.query(DiseaseCategoryMapping)
            .filter(DiseaseCategoryMapping.disease_id == disease.id)
            .first()
        )

        # Create a dict from the disease object
        disease_dict = {
            "id": disease.id,
            "name": disease.name,
            "disease_code": disease.disease_code,
            "description": disease.description,
            "category": (
                str(mapping.category_id) if mapping else None
            ),  # Use category field for category_id
            "severity_level": disease.severity_level,
            "is_active": disease.is_active,
            "created_at": disease.created_at,
            "updated_at": disease.updated_at,
            "translations": disease.translations,
        }
        result.append(disease_dict)

    return result


@router.get("/search", response_model=List[DiseaseResponse])
async def search_diseases(q: str, limit: int = 10, db: Session = Depends(get_db)):
    """Search diseases by name."""
    diseases = (
        db.query(Disease)
        .filter(Disease.is_active == True)
        .filter(Disease.name.ilike(f"%{q}%"))
        .limit(limit)
        .all()
    )
    return diseases


@router.get("/{disease_id}", response_model=DiseaseResponse)
async def get_disease(disease_id: int, db: Session = Depends(get_db)):
    """Get a specific disease by ID."""
    disease = db.query(Disease).filter(Disease.id == disease_id).first()
    if not disease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Disease not found"
        )
    return disease


@router.post("/", response_model=DiseaseResponse, status_code=status.HTTP_201_CREATED)
async def create_disease(disease_data: DiseaseCreate, db: Session = Depends(get_db)):
    """Create a new disease."""
    # Check if disease already exists
    existing_disease = (
        db.query(Disease).filter(Disease.name == disease_data.name).first()
    )

    if existing_disease:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Disease with this name already exists",
        )

    # Create disease
    disease = Disease(**disease_data.dict())
    db.add(disease)
    db.commit()
    db.refresh(disease)

    return disease


@router.put("/{disease_id}", response_model=DiseaseResponse)
async def update_disease(
    disease_id: int, disease_data: DiseaseUpdate, db: Session = Depends(get_db)
):
    """Update a disease."""
    disease = db.query(Disease).filter(Disease.id == disease_id).first()
    if not disease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Disease not found"
        )

    # Update disease
    for field, value in disease_data.dict(exclude_unset=True).items():
        setattr(disease, field, value)

    db.commit()
    db.refresh(disease)

    return disease


@router.delete("/{disease_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_disease(disease_id: int, db: Session = Depends(get_db)):
    """Delete a disease (soft delete)."""
    disease = db.query(Disease).filter(Disease.id == disease_id).first()
    if not disease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Disease not found"
        )

    # Soft delete
    disease.is_active = False
    db.commit()

    return None


# Disease Translation Endpoints


@router.get(
    "/{disease_id}/translations", response_model=List[DiseaseTranslationResponse]
)
async def get_disease_translations(disease_id: int, db: Session = Depends(get_db)):
    """Get all translations for a disease."""
    disease = DiseaseService.get_disease_by_id(db, disease_id)
    if not disease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Disease not found"
        )

    translations = DiseaseService.get_disease_translations(db, disease_id)
    return translations


@router.get(
    "/{disease_id}/translations/{language_code}",
    response_model=DiseaseTranslationResponse,
)
async def get_disease_translation(
    disease_id: int, language_code: str, db: Session = Depends(get_db)
):
    """Get specific translation for a disease."""
    disease = DiseaseService.get_disease_by_id(db, disease_id)
    if not disease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Disease not found"
        )

    translation = DiseaseService.get_disease_translation(db, disease_id, language_code)
    if not translation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Translation not found for language: {language_code}",
        )

    return translation


@router.get("/{disease_id}/categories", response_model=List[DiseaseCategoryResponse])
async def get_disease_categories_for_disease(
    disease_id: int, db: Session = Depends(get_db)
):
    """Get all categories for a disease."""
    disease = DiseaseService.get_disease_by_id(db, disease_id)
    if not disease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Disease not found"
        )

    categories = DiseaseService.get_disease_categories(db, disease_id)
    return categories


# Disease Category Endpoints


@router.get("/categories/", response_model=List[DiseaseCategoryResponse])
async def get_disease_categories_list(
    root_only: bool = Query(False, description="Only return root categories"),
    db: Session = Depends(get_db),
):
    """Get all disease categories."""
    if root_only:
        categories = DiseaseCategoryService.get_root_categories(db)
    else:
        categories = DiseaseCategoryService.get_all_categories(db)

    return categories


@router.get("/categories/{category_id}", response_model=DiseaseCategoryResponse)
async def get_disease_category(category_id: int, db: Session = Depends(get_db)):
    """Get disease category by ID."""
    category = DiseaseCategoryService.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )

    return category


@router.get(
    "/categories/{category_id}/children", response_model=List[DiseaseCategoryResponse]
)
async def get_category_children(category_id: int, db: Session = Depends(get_db)):
    """Get child categories of a category."""
    category = DiseaseCategoryService.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )

    children = DiseaseCategoryService.get_child_categories(db, category_id)
    return children


@router.get(
    "/categories/{category_id}/hierarchy", response_model=List[DiseaseCategoryResponse]
)
async def get_category_hierarchy(category_id: int, db: Session = Depends(get_db)):
    """Get category hierarchy from root to specified category."""
    category = DiseaseCategoryService.get_category_by_id(
        db, category_id, active_only=False
    )
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )

    hierarchy = DiseaseCategoryService.get_category_hierarchy(db, category_id)
    return hierarchy


@router.get(
    "/categories/{category_id}/translations",
    response_model=List[DiseaseCategoryTranslationResponse],
)
async def get_category_translations(category_id: int, db: Session = Depends(get_db)):
    """Get all translations for a category."""
    category = DiseaseCategoryService.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )

    translations = DiseaseCategoryService.get_category_translations(db, category_id)
    return translations


@router.get(
    "/categories/{category_id}/translations/{language_code}",
    response_model=DiseaseCategoryTranslationResponse,
)
async def get_category_translation(
    category_id: int, language_code: str, db: Session = Depends(get_db)
):
    """Get specific translation for a category."""
    category = DiseaseCategoryService.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )

    translation = DiseaseCategoryService.get_category_translation(
        db, category_id, language_code
    )
    if not translation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Translation not found for language: {language_code}",
        )

    return translation


@router.get("/categories/{category_id}/diseases", response_model=List[DiseaseResponse])
async def get_diseases_by_category(
    category_id: int,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of records"),
    db: Session = Depends(get_db),
):
    """Get diseases in a category."""
    category = DiseaseCategoryService.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )

    diseases = DiseaseService.get_diseases_by_category(
        db, category_id=category_id, skip=skip, limit=limit
    )
    return diseases


# Disease Status Endpoints


@router.get("/statuses/", response_model=List[DiseaseStatusResponse])
async def get_disease_statuses(db: Session = Depends(get_db)):
    """Get all disease statuses."""
    statuses = DiseaseStatusService.get_all_statuses(db)
    return statuses


@router.get("/statuses/{status_id}", response_model=DiseaseStatusResponse)
async def get_disease_status(status_id: int, db: Session = Depends(get_db)):
    """Get disease status by ID."""
    disease_status = DiseaseStatusService.get_status_by_id(db, status_id)
    if not disease_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Status not found"
        )

    return disease_status


@router.get(
    "/statuses/{status_id}/translations",
    response_model=List[DiseaseStatusTranslationResponse],
)
async def get_status_translations(status_id: int, db: Session = Depends(get_db)):
    """Get all translations for a status."""
    disease_status = DiseaseStatusService.get_status_by_id(db, status_id)
    if not disease_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Status not found"
        )

    translations = DiseaseStatusService.get_status_translations(db, status_id)
    return translations


@router.get(
    "/statuses/{status_id}/translations/{language_code}",
    response_model=DiseaseStatusTranslationResponse,
)
async def get_status_translation(
    status_id: int, language_code: str, db: Session = Depends(get_db)
):
    """Get specific translation for a status."""
    disease_status = DiseaseStatusService.get_status_by_id(db, status_id)
    if not disease_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Status not found"
        )

    translation = DiseaseStatusService.get_status_translation(
        db, status_id, language_code
    )
    if not translation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Translation not found for language: {language_code}",
        )

    return translation
