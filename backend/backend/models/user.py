"""
User-related SQLAlchemy models.
"""
# from datetime import datetime  # Unused import
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()


class User(Base):
    """User model with internationalization support."""

    __tablename__ = "users"

    # Primary key and identifiers
    id = Column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    member_id = Column(String(12), unique=True, nullable=False, index=True)
    idp_id = Column(String(255), unique=True, nullable=False)
    idp_provider = Column(String(50), default="auth0")

    # Personal information (private)
    first_name = Column(String(100))
    middle_name = Column(String(100))
    last_name = Column(String(100))

    # Name display order settings
    name_display_order = Column(String(20), default="western")
    custom_name_format = Column(String(50))

    # Basic information
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20))
    birth_date = Column(DateTime)

    # Address information
    country_code = Column(String(2))  # ISO 3166-1 alpha-2
    timezone = Column(String(50), default="Asia/Tokyo")

    # Public information (profile)
    nickname = Column(String(50), unique=True, nullable=False, index=True)
    display_name = Column(String(100))
    bio = Column(Text)
    avatar_url = Column(String(500))

    # Public settings
    is_profile_public = Column(Boolean, default=True)
    show_age_range = Column(Boolean, default=False)

    # Account status and permissions
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_email_verified = Column(Boolean, default=False)
    is_phone_verified = Column(Boolean, default=False)

    account_type = Column(String(20), default="regular")
    is_suspended = Column(Boolean, default=False)
    suspension_reason = Column(Text)
    suspension_until = Column(DateTime)

    # Settings and environment
    preferred_language = Column(String(5), default="ja")
    preferred_locale = Column(String(10), default="ja-jp")

    # Notification settings
    email_notifications = Column(Boolean, default=True)
    push_notifications = Column(Boolean, default=True)
    marketing_emails = Column(Boolean, default=False)

    # Privacy settings
    allow_direct_messages = Column(Boolean, default=True)
    allow_friend_requests = Column(Boolean, default=True)
    show_online_status = Column(Boolean, default=True)

    # Statistics and analytics
    last_active_at = Column(DateTime)
    login_count = Column(Integer, default=0)
    posts_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    likes_received = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(
        DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp()
    )
    last_login_at = Column(DateTime)
    email_verified_at = Column(DateTime)
    phone_verified_at = Column(DateTime)

    # Relationships
    preferences = relationship(
        "UserPreference", back_populates="user", cascade="all, delete-orphan"
    )
    sessions = relationship(
        "UserSession", back_populates="user", cascade="all, delete-orphan"
    )
    activity_logs = relationship(
        "UserActivityLog", back_populates="user", cascade="all, delete-orphan"
    )
    # user_diseases = relationship(
    #     "UserDisease", back_populates="user",
    #     cascade="all, delete-orphan"
    # )  # To be implemented later

    def get_full_name(self, locale: Optional[str] = None) -> str:
        """Get formatted full name based on user's display order preference."""
        if not locale:
            locale = self.preferred_locale or "ja-jp"

        # Get format template
        if self.name_display_order == "custom" and self.custom_name_format:
            template = self.custom_name_format
        else:
            template = self._get_format_template(self.name_display_order, locale)

        # Format the name
        return self._format_name_template(
            template,
            first_name=self.first_name or "",
            middle_name=self.middle_name or "",
            last_name=self.last_name or "",
        )

    def _get_format_template(self, display_order: str, locale: str) -> str:
        """Get format template based on display order and locale."""
        templates = {
            "western": "{first} {middle} {last}",
            "eastern": "{last} {first} {middle}",
            "japanese": "{last} {first}",
            "korean": "{last} {first} {middle}",
            "chinese": "{last} {first} {middle}",
        }

        # Locale-specific defaults
        locale_defaults = {
            "ja-jp": "japanese",
            "en-us": "western",
            "ko-kr": "korean",
            "zh-cn": "chinese",
        }

        order = display_order or locale_defaults.get(locale, "western")
        return templates.get(order, "{first} {last}")

    def _format_name_template(
        self, template: str, first_name: str, middle_name: str, last_name: str
    ) -> str:
        """Format name using template."""
        return template.format(
            first=first_name, middle=middle_name, last=last_name
        ).strip()


class NameDisplayOrder(Base):
    """Name display order master table."""

    __tablename__ = "name_display_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_code = Column(String(20), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    format_template = Column(String(100), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.current_timestamp())


class LocaleNameFormat(Base):
    """Locale-specific name format settings."""

    __tablename__ = "locale_name_formats"

    id = Column(Integer, primary_key=True, index=True)
    locale = Column(String(10), unique=True, nullable=False)
    default_order_code = Column(
        String(20), ForeignKey("name_display_orders.order_code")
    )
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.current_timestamp())

    # Relationships
    name_display_order = relationship("NameDisplayOrder")


class UserPreference(Base):
    """User preferences table."""

    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    preference_key = Column(String(100), nullable=False)
    preference_value = Column(Text)
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(
        DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp()
    )

    # Constraints
    __table_args__ = (UniqueConstraint("user_id", "preference_key"),)

    # Relationships
    user = relationship("User", back_populates="preferences")


class UserSession(Base):
    """User sessions table."""

    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    session_token = Column(String(255), unique=True, nullable=False)
    device_info = Column(Text)  # JSON string
    ip_address = Column(String(45))  # IPv6 support
    user_agent = Column(Text)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=func.current_timestamp())
    last_accessed_at = Column(DateTime, default=func.current_timestamp())

    # Relationships
    user = relationship("User", back_populates="sessions")


class UserActivityLog(Base):
    """User activity logs table."""

    __tablename__ = "user_activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    activity_type = Column(String(50), nullable=False)
    activity_data = Column(Text)  # JSON string
    ip_address = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(DateTime, default=func.current_timestamp())

    # Relationships
    user = relationship("User", back_populates="activity_logs")
