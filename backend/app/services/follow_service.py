"""
Follow service for business logic related to follow/follower relationships.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import and_, func
from sqlalchemy.orm import Session, joinedload

from app.models.follow import Follow
from app.models.user import User
from app.services.notification_service import NotificationService


class FollowService:
    """Service for follow/follower operations."""

    @staticmethod
    def follow_user(
        db: Session, follower_id: UUID, following_id: UUID
    ) -> Optional[Follow]:
        """
        Create a follow relationship.

        Returns None if:
        - Trying to follow yourself
        - Already following
        - User doesn't exist
        """
        # Check if trying to follow yourself
        if follower_id == following_id:
            return None

        # Check if following user exists
        following_user = db.query(User).filter(User.id == following_id).first()
        if not following_user:
            return None

        # Check if already following
        existing_follow = (
            db.query(Follow)
            .filter(
                Follow.follower_id == follower_id,
                Follow.following_id == following_id,
            )
            .first()
        )

        if existing_follow:
            # If inactive, reactivate
            if not existing_follow.is_active:
                existing_follow.is_active = True
                existing_follow.created_at = datetime.utcnow()
                db.commit()
                db.refresh(existing_follow)

                # Create notification for reactivated follow
                NotificationService.create_follow_notification(
                    db=db,
                    follower_id=follower_id,
                    following_id=following_id,
                )

                return existing_follow
            # Already following
            return existing_follow

        # Create new follow relationship
        follow = Follow(
            follower_id=follower_id,
            following_id=following_id,
            is_active=True,
            created_at=datetime.utcnow(),
        )
        db.add(follow)
        db.commit()
        db.refresh(follow)

        # Create notification for new follow
        NotificationService.create_follow_notification(
            db=db,
            follower_id=follower_id,
            following_id=following_id,
        )

        return follow

    @staticmethod
    def unfollow_user(db: Session, follower_id: UUID, following_id: UUID) -> bool:
        """
        Remove a follow relationship (soft delete).

        Returns True if successful, False if not following.
        """
        follow = (
            db.query(Follow)
            .filter(
                Follow.follower_id == follower_id,
                Follow.following_id == following_id,
                Follow.is_active == True,
            )
            .first()
        )

        if not follow:
            return False

        # Soft delete
        follow.is_active = False
        db.commit()
        return True

    @staticmethod
    def is_following(db: Session, follower_id: UUID, following_id: UUID) -> bool:
        """Check if follower_id is following following_id."""
        return (
            db.query(Follow)
            .filter(
                Follow.follower_id == follower_id,
                Follow.following_id == following_id,
                Follow.is_active == True,
            )
            .first()
            is not None
        )

    @staticmethod
    def get_followers(
        db: Session, user_id: UUID, skip: int = 0, limit: int = 50
    ) -> List[Follow]:
        """
        Get all users who follow the specified user.

        Returns Follow objects with follower user information loaded.
        """
        return (
            db.query(Follow)
            .options(joinedload(Follow.follower))
            .filter(Follow.following_id == user_id, Follow.is_active == True)
            .order_by(Follow.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_following(
        db: Session, user_id: UUID, skip: int = 0, limit: int = 50
    ) -> List[Follow]:
        """
        Get all users that the specified user is following.

        Returns Follow objects with following user information loaded.
        """
        return (
            db.query(Follow)
            .options(joinedload(Follow.following))
            .filter(Follow.follower_id == user_id, Follow.is_active == True)
            .order_by(Follow.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_follower_count(db: Session, user_id: UUID) -> int:
        """Get the number of followers for a user."""
        return (
            db.query(func.count(Follow.id))
            .filter(Follow.following_id == user_id, Follow.is_active == True)
            .scalar()
        )

    @staticmethod
    def get_following_count(db: Session, user_id: UUID) -> int:
        """Get the number of users a user is following."""
        return (
            db.query(func.count(Follow.id))
            .filter(Follow.follower_id == user_id, Follow.is_active == True)
            .scalar()
        )

    @staticmethod
    def get_follow_stats(
        db: Session, user_id: UUID, current_user_id: Optional[UUID] = None
    ) -> dict:
        """
        Get follow statistics for a user.

        Returns:
        - follower_count: Number of followers
        - following_count: Number of users following
        - is_following: Whether current user follows this user
        - is_followed_by: Whether this user follows current user
        """
        follower_count = FollowService.get_follower_count(db, user_id)
        following_count = FollowService.get_following_count(db, user_id)

        stats = {
            "follower_count": follower_count,
            "following_count": following_count,
            "is_following": False,
            "is_followed_by": False,
        }

        if current_user_id and current_user_id != user_id:
            stats["is_following"] = FollowService.is_following(
                db, current_user_id, user_id
            )
            stats["is_followed_by"] = FollowService.is_following(
                db, user_id, current_user_id
            )

        return stats

    @staticmethod
    def get_mutual_follows(db: Session, user_id: UUID) -> List[UUID]:
        """
        Get list of user IDs who mutually follow each other with the specified user.
        (Users who both follow and are followed by the specified user)
        """
        # Get users that user_id follows
        following = (
            db.query(Follow.following_id)
            .filter(Follow.follower_id == user_id, Follow.is_active == True)
            .all()
        )
        following_ids = [f[0] for f in following]

        # Get users that follow user_id
        followers = (
            db.query(Follow.follower_id)
            .filter(Follow.following_id == user_id, Follow.is_active == True)
            .all()
        )
        follower_ids = [f[0] for f in followers]

        # Intersection = mutual follows
        mutual_ids = set(following_ids) & set(follower_ids)
        return list(mutual_ids)
