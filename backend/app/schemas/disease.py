"""
Simple Disease schemas.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DiseaseBase(BaseModel):
    """Base disease schema."""
    name: str
    description: Optional[str] = None
    category: Optional[str] = None


class DiseaseCreate(DiseaseBase):
    """Schema for creating a disease."""
    pass


class DiseaseUpdate(BaseModel):
    """Schema for updating a disease."""
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


class DiseaseResponse(DiseaseBase):
    """Schema for disease responses."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True