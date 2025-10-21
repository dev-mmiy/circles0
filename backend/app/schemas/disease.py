"""
Disease-related Pydantic schemas.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class DiseaseBase(BaseModel):
    """Base disease schema."""
    
    name: str = Field(..., min_length=1, max_length=100, description="Disease name")
    description: Optional[str] = Field(None, description="Disease description")
    category: Optional[str] = Field(None, max_length=50, description="Disease category")
    name_ja: Optional[str] = Field(None, max_length=100, description="Japanese disease name")
    description_ja: Optional[str] = Field(None, description="Japanese disease description")
    is_active: bool = Field(True, description="Whether the disease is active")


class DiseaseCreate(DiseaseBase):
    """Schema for creating a disease."""
    pass


class DiseaseUpdate(BaseModel):
    """Schema for updating a disease."""
    
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=50)
    name_ja: Optional[str] = Field(None, max_length=100)
    description_ja: Optional[str] = None
    is_active: Optional[bool] = None


class DiseaseResponse(DiseaseBase):
    """Schema for disease response."""
    
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DiseaseListResponse(BaseModel):
    """Schema for disease list response."""
    
    diseases: List[DiseaseResponse]
    total: int
    page: int
    size: int
    has_next: bool
    has_prev: bool


class DiseaseSearchRequest(BaseModel):
    """Schema for disease search request."""
    
    query: Optional[str] = Field(None, description="Search query")
    category: Optional[str] = Field(None, description="Filter by category")
    is_active: Optional[bool] = Field(None, description="Filter by active status")
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Page size")


class UserDiseaseBase(BaseModel):
    """Base user disease schema."""
    
    disease_id: int = Field(..., description="Disease ID")
    diagnosis_date: Optional[datetime] = Field(None, description="Diagnosis date")
    severity: Optional[str] = Field(None, max_length=20, description="Disease severity")
    notes: Optional[str] = Field(None, description="Additional notes")
    is_active: bool = Field(True, description="Whether the user disease is active")


class UserDiseaseCreate(UserDiseaseBase):
    """Schema for creating a user disease."""
    pass


class UserDiseaseUpdate(BaseModel):
    """Schema for updating a user disease."""
    
    diagnosis_date: Optional[datetime] = None
    severity: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class UserDiseaseResponse(UserDiseaseBase):
    """Schema for user disease response."""
    
    id: int
    user_id: str
    disease: DiseaseResponse
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserDiseaseListResponse(BaseModel):
    """Schema for user disease list response."""
    
    user_diseases: List[UserDiseaseResponse]
    total: int
    page: int
    size: int
    has_next: bool
    has_prev: bool


