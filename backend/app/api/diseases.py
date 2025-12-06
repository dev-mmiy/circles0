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
async def search_diseases(
    q: Optional[str] = Query(
        None, description="Search query (name, code, or translation)"
    ),
    category_ids: Optional[str] = Query(
        None, description="Comma-separated category IDs"
    ),
    icd_code: Optional[str] = Query(
        None, description="ICD-10 code (exact, partial match, or range like 'E11-E15')"
    ),
    icd_code_from: Optional[str] = Query(
        None, description="ICD-10 code range start (for range search)"
    ),
    icd_code_to: Optional[str] = Query(
        None, description="ICD-10 code range end (for range search)"
    ),
    language: str = Query("en", description="Preferred language for search"),
    sort_by: str = Query(
        "name",
        pattern="^(name|disease_code|created_at)$",
        description="Sort field: name, disease_code, or created_at",
    ),
    sort_order: str = Query(
        "asc", pattern="^(asc|desc)$", description="Sort order: asc or desc"
    ),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results"),
    db: Session = Depends(get_db),
):
    """
    Advanced disease search with multiple filters.

    - Search by name (English or translated names)
    - Filter by category IDs
    - Search by ICD-10 code
    - Sort by name, disease_code, or created_at
    - Returns diseases with translations eager-loaded
    """
    from sqlalchemy import asc, desc, func, or_
    from sqlalchemy.orm import joinedload

    from app.models.disease import DiseaseCategoryMapping, DiseaseTranslation

    # Start with base query
    query = (
        db.query(Disease)
        .options(
            joinedload(Disease.translations), joinedload(Disease.category_mappings)
        )
        .filter(Disease.is_active == True)
    )

    # Search by query string (name, code, or translation)
    if q:
        # Create subquery for translation search
        translation_subquery = db.query(DiseaseTranslation.disease_id).filter(
            DiseaseTranslation.translated_name.ilike(f"%{q}%")
        )

        query = query.filter(
            or_(
                Disease.name.ilike(f"%{q}%"),
                Disease.disease_code.ilike(f"%{q}%"),
                Disease.id.in_(translation_subquery),
            )
        )

    # Filter by ICD-10 code (supports range search like "E11-E15")
    if icd_code:
        # Check if it's a range format (e.g., "E11-E15")
        if (
            "-" in icd_code
            and not icd_code.startswith("-")
            and not icd_code.endswith("-")
        ):
            parts = icd_code.split("-", 1)
            if len(parts) == 2:
                code_from = parts[0].strip()
                code_to = parts[1].strip()
                # Normalize codes (remove dots, uppercase)
                code_from_normalized = code_from.replace(".", "").upper()
                code_to_normalized = code_to.replace(".", "").upper()

                # For range search, we need to compare codes lexicographically
                # This works for ICD-10 codes which follow a pattern
                query = query.filter(
                    func.replace(func.upper(Disease.disease_code), ".", "")
                    >= code_from_normalized,
                    func.replace(func.upper(Disease.disease_code), ".", "")
                    <= code_to_normalized,
                )
            else:
                # Invalid range format, fall back to partial match
                query = query.filter(Disease.disease_code.ilike(f"%{icd_code}%"))
        else:
            # Regular partial match
            query = query.filter(Disease.disease_code.ilike(f"%{icd_code}%"))

    # Filter by ICD-10 code range (using separate from/to parameters)
    if icd_code_from or icd_code_to:
        if icd_code_from and icd_code_to:
            code_from_normalized = icd_code_from.replace(".", "").upper()
            code_to_normalized = icd_code_to.replace(".", "").upper()
            query = query.filter(
                func.replace(func.upper(Disease.disease_code), ".", "")
                >= code_from_normalized,
                func.replace(func.upper(Disease.disease_code), ".", "")
                <= code_to_normalized,
            )
        elif icd_code_from:
            code_from_normalized = icd_code_from.replace(".", "").upper()
            query = query.filter(
                func.replace(func.upper(Disease.disease_code), ".", "")
                >= code_from_normalized
            )
        elif icd_code_to:
            code_to_normalized = icd_code_to.replace(".", "").upper()
            query = query.filter(
                func.replace(func.upper(Disease.disease_code), ".", "")
                <= code_to_normalized
            )

    # Filter by category IDs
    if category_ids:
        try:
            cat_id_list = [int(cid.strip()) for cid in category_ids.split(",")]
            category_disease_ids = db.query(DiseaseCategoryMapping.disease_id).filter(
                DiseaseCategoryMapping.category_id.in_(cat_id_list)
            )
            query = query.filter(Disease.id.in_(category_disease_ids))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid category_ids format",
            )

    # Apply sorting
    sort_column = getattr(Disease, sort_by, Disease.name)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    # Execute query with limit
    diseases = query.limit(limit).all()

    # Format response with category information
    result = []
    for disease in diseases:
        # Get the first category mapping as primary category
        mapping = (
            db.query(DiseaseCategoryMapping)
            .filter(DiseaseCategoryMapping.disease_id == disease.id)
            .first()
        )

        disease_dict = {
            "id": disease.id,
            "name": disease.name,
            "disease_code": disease.disease_code,
            "description": disease.description,
            "category": str(mapping.category_id) if mapping else None,
            "severity_level": disease.severity_level,
            "is_active": disease.is_active,
            "created_at": disease.created_at,
            "updated_at": disease.updated_at,
            "translations": disease.translations,
        }
        result.append(disease_dict)

    return result


@router.get("/codes/autocomplete")
async def autocomplete_icd_codes(
    q: str = Query(..., description="Partial ICD-10 code for autocomplete"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of suggestions"),
    db: Session = Depends(get_db),
):
    """
    Autocomplete ICD-10 codes.

    Returns a list of unique ICD-10 codes matching the query prefix.
    Useful for providing autocomplete suggestions in the UI.
    """
    from sqlalchemy import distinct, func

    # Search for codes that start with the query (case-insensitive)
    codes = (
        db.query(distinct(Disease.disease_code))
        .filter(
            Disease.is_active == True,
            Disease.disease_code.isnot(None),
            func.upper(Disease.disease_code).like(f"{q.upper()}%"),
        )
        .order_by(Disease.disease_code)
        .limit(limit)
        .all()
    )

    # Extract code strings from tuples
    result = [code[0] for code in codes if code[0]]

    return {"codes": result}


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
