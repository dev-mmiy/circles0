"""
SQLAlchemy models package.
"""

from app.database import Base

from .block import Block
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
from .group import Group, GroupMember, GroupMessage, GroupMessageRead, GroupMessageReaction
from .hashtag import Hashtag, PostHashtag
from .mention import CommentMention, PostMention
from .message import Conversation, Message, MessageRead, MessageReaction
from .notification import Notification, NotificationType
from .post import Post, PostComment, PostCommentImage, PostCommentLike, PostImage, PostLike
from .push_subscription import PushSubscription
from .user import User
from .user_field_visibility import UserFieldVisibility
from .meal_record import MealRecord
from .food import Food, FoodNutrition
from .menu import Menu, MenuIngredient, MenuNutrition
from .blood_pressure_record import BloodPressureRecord
from .heart_rate_record import HeartRateRecord
from .temperature_record import TemperatureRecord
from .weight_record import WeightRecord
from .body_fat_record import BodyFatRecord
from .blood_glucose_record import BloodGlucoseRecord
from .spo2_record import SpO2Record

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
    "PostCommentImage",
    "PostCommentLike",
    "PostImage",
    "Hashtag",
    "PostHashtag",
    "PostMention",
    "CommentMention",
    "Follow",
    "Block",
    "Notification",
    "NotificationType",
    "UserFieldVisibility",
    "Conversation",
    "Message",
    "MessageRead",
    "MessageReaction",
    "Group",
    "GroupMember",
    "GroupMessage",
    "GroupMessageRead",
    "GroupMessageReaction",
    "PushSubscription",
    "MealRecord",
    "Food",
    "FoodNutrition",
    "Menu",
    "MenuIngredient",
    "MenuNutrition",
    "BloodPressureRecord",
    "HeartRateRecord",
    "TemperatureRecord",
    "WeightRecord",
    "BodyFatRecord",
    "BloodGlucoseRecord",
    "SpO2Record",
]
