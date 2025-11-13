"""
Notification API endpoints.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.schemas.notification import (
    NotificationListResponse,
    NotificationResponse,
    UnreadCountResponse,
    UserSummary,
    PostSummary,
    CommentSummary,
)
from app.services.notification_service import NotificationService
from app.services.user_service import UserService
from app.utils.auth_utils import extract_auth0_id

router = APIRouter(prefix="/notifications", tags=["notifications"])


def get_user_id_from_token(db: Session, current_user: dict) -> UUID:
    """
    Get database user ID from Auth0 token.

    Args:
        db: Database session
        current_user: Decoded Auth0 token

    Returns:
        User UUID from database

    Raises:
        HTTPException: If user not found
    """
    auth0_id = extract_auth0_id(current_user)
    user = UserService.get_user_by_auth0_id(db, auth0_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. Please complete registration first."
        )

    return user.id


def _format_notification_response(notification) -> NotificationResponse:
    """Format notification with related data."""
    # Format actor
    actor_data = None
    if notification.actor:
        actor_data = UserSummary(
            id=notification.actor.id,
            member_id=notification.actor.member_id,
            nickname=notification.actor.nickname,
            username=notification.actor.username,
            avatar_url=notification.actor.avatar_url,
        )

    # Format post (truncate content for preview)
    post_data = None
    if notification.post:
        content = notification.post.content
        if len(content) > 100:
            content = content[:100] + "..."
        post_data = PostSummary(
            id=notification.post.id,
            content=content,
        )

    # Format comment (truncate content for preview)
    comment_data = None
    if notification.comment:
        content = notification.comment.content
        if len(content) > 100:
            content = content[:100] + "..."
        comment_data = CommentSummary(
            id=notification.comment.id,
            content=content,
            post_id=notification.comment.post_id,
        )

    return NotificationResponse(
        id=notification.id,
        recipient_id=notification.recipient_id,
        actor_id=notification.actor_id,
        type=notification.type,
        post_id=notification.post_id,
        comment_id=notification.comment_id,
        is_read=notification.is_read,
        created_at=notification.created_at,
        actor=actor_data,
        post=post_data,
        comment=comment_data,
    )


# ========== Get Notifications ==========


@router.get(
    "",
    response_model=NotificationListResponse,
    summary="Get user notifications",
)
async def get_notifications(
    skip: int = Query(0, ge=0, description="Number of notifications to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of notifications to return"),
    unread_only: bool = Query(False, description="Only return unread notifications"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get notifications for the current user.

    Requires authentication.
    """
    current_user_id = get_user_id_from_token(db, current_user)

    notifications = NotificationService.get_notifications(
        db, current_user_id, skip, limit, unread_only
    )

    unread_count = NotificationService.get_unread_count(db, current_user_id)

    # Format notifications
    formatted_notifications = [
        _format_notification_response(notif) for notif in notifications
    ]

    return NotificationListResponse(
        notifications=formatted_notifications,
        total=len(formatted_notifications),
        unread_count=unread_count,
    )


@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    summary="Get unread notification count",
)
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get count of unread notifications for the current user.

    Requires authentication.
    """
    current_user_id = get_user_id_from_token(db, current_user)

    unread_count = NotificationService.get_unread_count(db, current_user_id)

    return UnreadCountResponse(unread_count=unread_count)


# ========== Mark as Read ==========


@router.put(
    "/{notification_id}/read",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Mark notification as read",
)
async def mark_notification_as_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Mark a notification as read.

    Requires authentication.
    """
    current_user_id = get_user_id_from_token(db, current_user)

    success = NotificationService.mark_as_read(db, notification_id, current_user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    return None


@router.put(
    "/mark-all-read",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Mark all notifications as read",
)
async def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Mark all notifications as read for the current user.

    Requires authentication.
    """
    current_user_id = get_user_id_from_token(db, current_user)

    NotificationService.mark_all_as_read(db, current_user_id)

    return None


# ========== Delete Notification ==========


@router.delete(
    "/{notification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete notification",
)
async def delete_notification(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a notification.

    Requires authentication.
    """
    current_user_id = get_user_id_from_token(db, current_user)

    success = NotificationService.delete_notification(db, notification_id, current_user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    return None
