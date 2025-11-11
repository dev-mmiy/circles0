"""
Notification service for managing user notifications.
"""

from typing import Optional
from uuid import UUID

from sqlalchemy import and_, desc, func
from sqlalchemy.orm import Session, joinedload

from app.models.notification import Notification, NotificationType
from app.models.post import Post, PostComment
from app.models.user import User


class NotificationService:
    """Service for notification operations."""

    @staticmethod
    def create_notification(
        db: Session,
        recipient_id: UUID,
        actor_id: UUID,
        notification_type: NotificationType,
        post_id: Optional[UUID] = None,
        comment_id: Optional[UUID] = None,
    ) -> Optional[Notification]:
        """
        Create a new notification.

        Args:
            db: Database session
            recipient_id: User receiving the notification
            actor_id: User who triggered the notification
            notification_type: Type of notification
            post_id: Related post ID (optional)
            comment_id: Related comment ID (optional)

        Returns:
            Created notification or None if recipient doesn't exist or is the same as actor
        """
        # Don't notify if actor is the same as recipient
        if recipient_id == actor_id:
            return None

        # Check if recipient exists
        recipient = db.query(User).filter(User.id == recipient_id).first()
        if not recipient:
            return None

        # Check for duplicate notifications (same type, actor, and target within last 24 hours)
        # This prevents spam notifications
        from datetime import datetime, timedelta

        recent_threshold = datetime.utcnow() - timedelta(hours=24)

        existing = (
            db.query(Notification)
            .filter(
                and_(
                    Notification.recipient_id == recipient_id,
                    Notification.actor_id == actor_id,
                    Notification.type == notification_type,
                    Notification.post_id == post_id if post_id else True,
                    Notification.comment_id == comment_id if comment_id else True,
                    Notification.created_at >= recent_threshold,
                )
            )
            .first()
        )

        if existing:
            return existing

        # Create notification
        notification = Notification(
            recipient_id=recipient_id,
            actor_id=actor_id,
            type=notification_type,
            post_id=post_id,
            comment_id=comment_id,
        )

        db.add(notification)
        db.commit()
        db.refresh(notification)

        return notification

    @staticmethod
    def get_notifications(
        db: Session,
        user_id: UUID,
        skip: int = 0,
        limit: int = 20,
        unread_only: bool = False,
    ) -> list[Notification]:
        """
        Get notifications for a user.

        Args:
            db: Database session
            user_id: User ID
            skip: Number of notifications to skip
            limit: Maximum number of notifications to return
            unread_only: If True, only return unread notifications

        Returns:
            List of notifications
        """
        query = (
            db.query(Notification)
            .filter(Notification.recipient_id == user_id)
            .options(
                joinedload(Notification.actor),
                joinedload(Notification.post),
                joinedload(Notification.comment),
            )
        )

        if unread_only:
            query = query.filter(Notification.is_read == False)

        query = query.order_by(desc(Notification.created_at))

        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_unread_count(db: Session, user_id: UUID) -> int:
        """
        Get count of unread notifications for a user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Count of unread notifications
        """
        return (
            db.query(func.count(Notification.id))
            .filter(
                and_(
                    Notification.recipient_id == user_id,
                    Notification.is_read == False,
                )
            )
            .scalar()
        )

    @staticmethod
    def mark_as_read(db: Session, notification_id: UUID, user_id: UUID) -> bool:
        """
        Mark a notification as read.

        Args:
            db: Database session
            notification_id: Notification ID
            user_id: User ID (to verify ownership)

        Returns:
            True if successful, False otherwise
        """
        notification = (
            db.query(Notification)
            .filter(
                and_(
                    Notification.id == notification_id,
                    Notification.recipient_id == user_id,
                )
            )
            .first()
        )

        if not notification:
            return False

        notification.is_read = True
        db.commit()

        return True

    @staticmethod
    def mark_all_as_read(db: Session, user_id: UUID) -> int:
        """
        Mark all notifications as read for a user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Number of notifications marked as read
        """
        count = (
            db.query(Notification)
            .filter(
                and_(
                    Notification.recipient_id == user_id,
                    Notification.is_read == False,
                )
            )
            .update({"is_read": True})
        )

        db.commit()

        return count

    @staticmethod
    def delete_notification(db: Session, notification_id: UUID, user_id: UUID) -> bool:
        """
        Delete a notification.

        Args:
            db: Database session
            notification_id: Notification ID
            user_id: User ID (to verify ownership)

        Returns:
            True if successful, False otherwise
        """
        notification = (
            db.query(Notification)
            .filter(
                and_(
                    Notification.id == notification_id,
                    Notification.recipient_id == user_id,
                )
            )
            .first()
        )

        if not notification:
            return False

        db.delete(notification)
        db.commit()

        return True

    @staticmethod
    def create_follow_notification(
        db: Session,
        follower_id: UUID,
        following_id: UUID,
    ) -> Optional[Notification]:
        """
        Create a notification when someone follows a user.

        Args:
            db: Database session
            follower_id: User who followed
            following_id: User who was followed

        Returns:
            Created notification or None
        """
        return NotificationService.create_notification(
            db=db,
            recipient_id=following_id,
            actor_id=follower_id,
            notification_type=NotificationType.FOLLOW,
        )

    @staticmethod
    def create_comment_notification(
        db: Session,
        commenter_id: UUID,
        post_id: UUID,
        comment_id: UUID,
    ) -> Optional[Notification]:
        """
        Create a notification when someone comments on a post.

        Args:
            db: Database session
            commenter_id: User who commented
            post_id: Post ID
            comment_id: Comment ID

        Returns:
            Created notification or None
        """
        # Get post owner
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            return None

        return NotificationService.create_notification(
            db=db,
            recipient_id=post.user_id,
            actor_id=commenter_id,
            notification_type=NotificationType.COMMENT,
            post_id=post_id,
            comment_id=comment_id,
        )

    @staticmethod
    def create_reply_notification(
        db: Session,
        replier_id: UUID,
        parent_comment_id: UUID,
        reply_comment_id: UUID,
    ) -> Optional[Notification]:
        """
        Create a notification when someone replies to a comment.

        Args:
            db: Database session
            replier_id: User who replied
            parent_comment_id: Parent comment ID
            reply_comment_id: Reply comment ID

        Returns:
            Created notification or None
        """
        # Get parent comment owner
        parent_comment = (
            db.query(PostComment).filter(PostComment.id == parent_comment_id).first()
        )
        if not parent_comment:
            return None

        return NotificationService.create_notification(
            db=db,
            recipient_id=parent_comment.user_id,
            actor_id=replier_id,
            notification_type=NotificationType.REPLY,
            post_id=parent_comment.post_id,
            comment_id=reply_comment_id,
        )

    @staticmethod
    def create_like_notification(
        db: Session,
        liker_id: UUID,
        post_id: UUID,
    ) -> Optional[Notification]:
        """
        Create a notification when someone likes a post.

        Args:
            db: Database session
            liker_id: User who liked
            post_id: Post ID

        Returns:
            Created notification or None
        """
        # Get post owner
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            return None

        return NotificationService.create_notification(
            db=db,
            recipient_id=post.user_id,
            actor_id=liker_id,
            notification_type=NotificationType.LIKE,
            post_id=post_id,
        )
