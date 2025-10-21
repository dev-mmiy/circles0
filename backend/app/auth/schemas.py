"""
Authentication Schemas

This module defines Pydantic schemas for authentication requests and responses.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[datetime] = None


class UserCreate(UserBase):
    """Schema for user creation."""
    password: str


class UserUpdate(BaseModel):
    """Schema for user updates."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[datetime] = None


class UserRead(UserBase):
    """Schema for user read operations."""
    id: UUID
    is_active: bool
    is_verified: bool
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user API responses."""
    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: Optional[str] = None
    last_login: Optional[str] = None


class LoginResponse(BaseModel):
    """Schema for login response."""
    user: UserResponse
    message: str = "Login successful"


class RegisterResponse(BaseModel):
    """Schema for registration response."""
    user: UserResponse
    message: str = "Registration successful"


class LogoutResponse(BaseModel):
    """Schema for logout response."""
    message: str = "Logout successful"
