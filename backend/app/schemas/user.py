"""
User schemas for profile management with Auth0 integration.
"""

from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserBase(BaseModel):
    """Base user schema with common fields."""
    
    email: EmailStr
    display_name: str = Field(..., min_length=1, max_length=100)
    username: Optional[str] = Field(None, min_length=3, max_length=50, pattern="^[a-z0-9_]+$")
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: str = Field(default="prefer_not_to_say", pattern="^(male|female|other|prefer_not_to_say)$")
    country: str = Field(default="jp", min_length=2, max_length=2)
    language: str = Field(default="ja", min_length=2, max_length=5)
    timezone: str = Field(default="Asia/Tokyo", max_length=50)


class UserCreate(BaseModel):
    """Schema for creating a user from Auth0 data."""
    
    auth0_id: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    email_verified: bool = False
    display_name: str = Field(..., min_length=1, max_length=100)
    avatar_url: Optional[str] = None
    profile_visibility: Optional[str] = Field(None, pattern="^(public|limited|private)$")


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    username: Optional[str] = Field(None, min_length=3, max_length=50, pattern="^[a-z0-9_]+$")
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, pattern="^(male|female|other|prefer_not_to_say)$")
    country: Optional[str] = Field(None, min_length=2, max_length=2)
    language: Optional[str] = Field(None, min_length=2, max_length=5)
    timezone: Optional[str] = Field(None, max_length=50)
    profile_visibility: Optional[str] = Field(None, pattern="^(public|limited|private)$")
    show_email: Optional[bool] = None
    show_online_status: Optional[bool] = None


class UserDiseaseResponse(BaseModel):
    """Schema for user's disease information."""
    
    disease_id: UUID
    disease_name: str
    
    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    """Schema for user profile responses."""
    
    id: UUID
    auth0_id: str
    email: EmailStr
    email_verified: bool
    display_name: str
    username: Optional[str]
    bio: Optional[str]
    avatar_url: Optional[str]
    date_of_birth: Optional[date]
    gender: str
    country: str
    language: str
    timezone: str
    profile_visibility: str
    show_email: bool
    show_online_status: bool
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime]
    is_active: bool
    diseases: List[UserDiseaseResponse] = []
    
    model_config = {"from_attributes": True}


class UserPublicResponse(BaseModel):
    """Schema for public user profile (limited information)."""
    
    id: UUID
    display_name: str
    username: Optional[str]
    bio: Optional[str]
    avatar_url: Optional[str]
    country: str
    created_at: datetime
    diseases: List[UserDiseaseResponse] = []
    
    model_config = {"from_attributes": True}
