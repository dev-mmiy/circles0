"""
User model for authentication and profile management with Auth0 integration.
"""

import random
from datetime import date, datetime, timezone
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Column, Date, DateTime, Enum, String, Text
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


def generate_member_id() -> str:
    """Generate a unique 12-digit member ID."""
    return "".join([str(random.randint(0, 9)) for _ in range(12)])


class User(Base):
    """
    User model for authentication and profile management.

    Integrates with Auth0 for authentication and provides comprehensive
    user profile information including privacy settings.
    """

    __tablename__ = "users"

    # 基本識別情報
    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    member_id = Column(
        String(12), unique=True, nullable=False, index=True, default=generate_member_id
    )  # 12桁の会員ID（ユーザーに表示される）

    # IDP（Identity Provider）情報
    auth0_id = Column(
        String(255), unique=True, nullable=True, index=True
    )  # Nullable for migration compatibility
    idp_id = Column(
        String(255), unique=True, nullable=True, index=True
    )  # Generic IDP ID for future flexibility
    idp_provider = Column(
        String(50), default="auth0", nullable=False
    )  # 'auth0', 'okta', 'azure_ad', etc.

    # 基本情報
    email = Column(String(255), unique=True, nullable=False, index=True)
    email_verified = Column(Boolean, default=False)

    # 本名（プライベート情報 - プロフィールページとサポートページでのみ表示）
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)

    # プロフィール情報（公開情報）
    nickname = Column(
        String(50), unique=True, nullable=False, index=True
    )  # 公開用ニックネーム（他ユーザーとのやり取りで使用）
    username = Column(
        String(50), nullable=True, index=True
    )  # ユーザー名（オプション、ユニークではない - 他ユーザーと重複可能）
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(
        Enum("male", "female", "other", "prefer_not_to_say", name="gender_enum"),
        default="prefer_not_to_say",
    )
    preferred_language = Column(
        String(5), default="ja", nullable=False
    )  # User's preferred language

    # 地域・言語設定
    country = Column(String(2), default="jp")
    language = Column(String(5), default="ja")
    timezone = Column(String(50), default="Asia/Tokyo")

    # プライバシー設定
    profile_visibility = Column(
        Enum("public", "limited", "private", name="visibility_enum"), default="limited"
    )
    show_email = Column(Boolean, default=False)
    show_online_status = Column(Boolean, default=False)

    # アカウント情報
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # リレーション
    # Note: Use 'user_diseases' relationship defined in disease.py to avoid conflicts
    posts = relationship("Post", back_populates="user", cascade="all, delete-orphan")
    post_likes = relationship(
        "PostLike", back_populates="user", cascade="all, delete-orphan"
    )
    post_comments = relationship(
        "PostComment", back_populates="user", cascade="all, delete-orphan"
    )
    post_comment_likes = relationship(
        "PostCommentLike", back_populates="user", cascade="all, delete-orphan"
    )
    saved_posts = relationship(
        "SavedPost", back_populates="user", cascade="all, delete-orphan"
    )
    meal_records = relationship(
        "MealRecord", back_populates="user", cascade="all, delete-orphan"
    )
    foods = relationship(
        "Food", back_populates="user", cascade="all, delete-orphan"
    )
    menus = relationship(
        "Menu", back_populates="user", cascade="all, delete-orphan"
    )
    blood_pressure_records = relationship(
        "BloodPressureRecord", back_populates="user", cascade="all, delete-orphan"
    )
    heart_rate_records = relationship(
        "HeartRateRecord", back_populates="user", cascade="all, delete-orphan"
    )
    temperature_records = relationship(
        "TemperatureRecord", back_populates="user", cascade="all, delete-orphan"
    )
    weight_records = relationship(
        "WeightRecord", back_populates="user", cascade="all, delete-orphan"
    )
    body_fat_records = relationship(
        "BodyFatRecord", back_populates="user", cascade="all, delete-orphan"
    )
    blood_glucose_records = relationship(
        "BloodGlucoseRecord", back_populates="user", cascade="all, delete-orphan"
    )
    spo2_records = relationship(
        "SpO2Record", back_populates="user", cascade="all, delete-orphan"
    )

    # Follow relationships
    # Users that this user is following
    following_relationships = relationship(
        "Follow",
        foreign_keys="Follow.follower_id",
        back_populates="follower",
        cascade="all, delete-orphan",
    )
    # Users that follow this user
    follower_relationships = relationship(
        "Follow",
        foreign_keys="Follow.following_id",
        back_populates="following",
        cascade="all, delete-orphan",
    )

    # Notification relationships
    notifications_received = relationship(
        "Notification",
        foreign_keys="Notification.recipient_id",
        back_populates="recipient",
        cascade="all, delete-orphan",
    )

    # Block relationships
    # Users that this user is blocking
    blocking_relationships = relationship(
        "Block",
        foreign_keys="Block.blocker_id",
        back_populates="blocker",
        cascade="all, delete-orphan",
    )
    # Users that have blocked this user
    blocked_relationships = relationship(
        "Block",
        foreign_keys="Block.blocked_id",
        back_populates="blocked",
        cascade="all, delete-orphan",
    )

    # Message relationships
    # Conversations where this user is user1
    conversations_as_user1 = relationship(
        "Conversation",
        foreign_keys="Conversation.user1_id",
        back_populates="user1",
        cascade="all, delete-orphan",
    )
    # Conversations where this user is user2
    conversations_as_user2 = relationship(
        "Conversation",
        foreign_keys="Conversation.user2_id",
        back_populates="user2",
        cascade="all, delete-orphan",
    )
    # Messages sent by this user
    messages_sent = relationship(
        "Message",
        foreign_keys="Message.sender_id",
        back_populates="sender",
        cascade="all, delete-orphan",
    )
    # Message reactions by this user
    message_reactions = relationship(
        "MessageReaction", back_populates="user", cascade="all, delete-orphan"
    )

    # Group relationships
    # Groups created by this user
    groups_created = relationship(
        "Group",
        foreign_keys="Group.creator_id",
        back_populates="creator",
        cascade="all, delete-orphan",
    )
    # Group memberships
    group_memberships = relationship(
        "GroupMember",
        foreign_keys="GroupMember.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    # Group messages sent by this user
    group_messages_sent = relationship(
        "GroupMessage",
        foreign_keys="GroupMessage.sender_id",
        back_populates="sender",
        cascade="all, delete-orphan",
    )
    # Group message reactions by this user
    group_message_reactions = relationship(
        "GroupMessageReaction", back_populates="user", cascade="all, delete-orphan"
    )

    # Push subscriptions for Web Push notifications
    push_subscriptions = relationship(
        "PushSubscription",
        foreign_keys="PushSubscription.user_id",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, member_id={self.member_id}, email={self.email}, nickname={self.nickname})>"
