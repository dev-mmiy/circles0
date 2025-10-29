"""
User model for authentication and profile management with Auth0 integration.
"""

from datetime import date, datetime, timezone
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Column, Date, DateTime, Enum, String, Text
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    """
    User model for authentication and profile management.
    
    Integrates with Auth0 for authentication and provides comprehensive
    user profile information including privacy settings.
    """

    __tablename__ = "users"

    # 基本情報
    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    auth0_id = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    email_verified = Column(Boolean, default=False)
    
    # プロフィール情報
    display_name = Column(String(100), nullable=False)
    username = Column(String(50), unique=True, nullable=True, index=True)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(
        Enum('male', 'female', 'other', 'prefer_not_to_say', name='gender_enum'),
        default='prefer_not_to_say'
    )
    
    # 地域・言語設定
    country = Column(String(2), default='jp')
    language = Column(String(5), default='ja')
    timezone = Column(String(50), default='Asia/Tokyo')
    
    # プライバシー設定
    profile_visibility = Column(
        Enum('public', 'limited', 'private', name='visibility_enum'),
        default='limited'
    )
    show_email = Column(Boolean, default=False)
    show_online_status = Column(Boolean, default=False)
    
    # アカウント情報
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # リレーション
    # Note: Use 'user_diseases' relationship defined in disease.py to avoid conflicts

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, display_name={self.display_name})>"
