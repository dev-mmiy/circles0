"""
Admin user service: list, get, update, status, logical delete.
Excludes deleted users by default; include_deleted to show them.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.blood_glucose_record import BloodGlucoseRecord
from app.models.blood_pressure_record import BloodPressureRecord
from app.models.body_fat_record import BodyFatRecord
from app.models.heart_rate_record import HeartRateRecord
from app.models.meal_record import MealRecord
from app.models.post import Post, PostComment
from app.models.follow import Follow
from app.models.spo2_record import SpO2Record
from app.models.temperature_record import TemperatureRecord
from app.models.user import User
from app.models.weight_record import WeightRecord
from app.schemas.admin.user import AdminUserStats, AdminUserUpdate


def _user_stats(db: Session, user_id: UUID) -> AdminUserStats:
    posts = db.query(Post).filter(Post.user_id == user_id).count()
    followers = db.query(Follow).filter(Follow.following_id == user_id).count()
    following = db.query(Follow).filter(Follow.follower_id == user_id).count()
    comments = db.query(PostComment).filter(PostComment.user_id == user_id).count()
    meals = db.query(MealRecord).filter(MealRecord.user_id == user_id).count()
    vital = (
        db.query(BloodPressureRecord).filter(BloodPressureRecord.user_id == user_id).count()
        + db.query(HeartRateRecord).filter(HeartRateRecord.user_id == user_id).count()
        + db.query(TemperatureRecord).filter(TemperatureRecord.user_id == user_id).count()
        + db.query(WeightRecord).filter(WeightRecord.user_id == user_id).count()
        + db.query(BodyFatRecord).filter(BodyFatRecord.user_id == user_id).count()
        + db.query(BloodGlucoseRecord).filter(BloodGlucoseRecord.user_id == user_id).count()
        + db.query(SpO2Record).filter(SpO2Record.user_id == user_id).count()
    )
    return AdminUserStats(
        posts_count=posts,
        followers_count=followers,
        following_count=following,
        comments_count=comments,
        meal_records_count=meals,
        vital_records_count=vital,
    )


class AdminUserService:
    @staticmethod
    def list_users(
        db: Session,
        *,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        include_deleted: bool = False,
        sort: str = "created_at",
        order: str = "desc",
    ) -> tuple[list[User], int]:
        q = db.query(User)
        if not include_deleted:
            q = q.filter(User.deleted_at.is_(None))
        if search and search.strip():
            s = f"%{search.strip()}%"
            q = q.filter(
                or_(
                    User.email.ilike(s),
                    User.nickname.ilike(s),
                    User.member_id.ilike(s),
                )
            )
        if is_active is not None:
            q = q.filter(User.is_active == is_active)
        total = q.count()
        _SORT_WHITELIST = ("created_at", "updated_at", "last_login_at", "email", "nickname", "member_id")
        sort_key = sort if sort in _SORT_WHITELIST else "created_at"
        order_col = getattr(User, sort_key, User.created_at)
        if order == "asc":
            q = q.order_by(order_col.asc())
        else:
            q = q.order_by(order_col.desc())
        items = q.offset((page - 1) * per_page).limit(per_page).all()
        return items, total

    @staticmethod
    def get_user(db: Session, user_id: UUID, include_deleted: bool = True) -> Optional[User]:
        q = db.query(User).filter(User.id == user_id)
        if not include_deleted:
            q = q.filter(User.deleted_at.is_(None))
        return q.first()

    @staticmethod
    def update_user(db: Session, user: User, body: AdminUserUpdate) -> User:
        if user.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot update a deleted user",
            )
        data = body.model_dump(exclude_unset=True)
        for k, v in data.items():
            setattr(user, k, v)
        return user

    @staticmethod
    def set_status(db: Session, user: User, is_active: bool) -> User:
        if user.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change status of a deleted user",
            )
        user.is_active = is_active
        return user

    @staticmethod
    def delete_user(db: Session, user: User) -> User:
        if user.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already deleted",
            )
        user.deleted_at = datetime.now(timezone.utc)
        user.is_active = False
        return user

    @staticmethod
    def stats(db: Session, user_id: UUID) -> AdminUserStats:
        return _user_stats(db, user_id)

    @staticmethod
    def dashboard_stats(db: Session) -> dict:
        now = datetime.now(timezone.utc)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        total = db.query(User).filter(User.deleted_at.is_(None)).count()
        active = db.query(User).filter(User.deleted_at.is_(None), User.is_active == True).count()
        new_this_month = (
            db.query(User)
            .filter(User.deleted_at.is_(None), User.created_at >= start_of_month)
            .count()
        )
        deleted_count = db.query(User).filter(User.deleted_at.isnot(None)).count()
        return {
            "total_users": total,
            "active_users": active,
            "new_users_this_month": new_this_month,
            "deleted_users": deleted_count,
        }
