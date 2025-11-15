"""
SQLAlchemy models package.
"""

from app.database import Base

from .disease import (
    Disease,
    DiseaseCategory,
    DiseaseCategoryMapping,
    DiseaseCategoryTranslation,
    DiseaseStatus,
    DiseaseStatusTranslation,
    DiseaseTranslation,
    UserDisease,
)
from .follow import Follow
from .hashtag import Hashtag, PostHashtag
from .mention import CommentMention, PostMention
from .notification import Notification, NotificationType
from .post import Post, PostComment, PostImage, PostLike
from .user import User
from .user_field_visibility import UserFieldVisibility

__all__ = [
    "Base",
    "User",
    "Disease",
    "DiseaseTranslation",
    "DiseaseCategory",
    "DiseaseCategoryTranslation",
    "DiseaseCategoryMapping",
    "DiseaseStatus",
    "DiseaseStatusTranslation",
    "UserDisease",
    "Post",
    "PostLike",
    "PostComment",
    "PostImage",
    "Hashtag",
    "PostHashtag",
    "PostMention",
    "CommentMention",
    "Follow",
    "Notification",
    "NotificationType",
    "UserFieldVisibility",
]
