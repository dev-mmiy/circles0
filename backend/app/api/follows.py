"""
Follow/Follower API endpoints.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_current_user_optional
from app.database import get_db
from app.schemas.follow import (
    FollowerResponse,
    FollowingResponse,
    FollowResponse,
    FollowStats,
    UserFollowSummary,
)
from app.services.follow_service import FollowService
from app.services.user_service import UserService
from app.utils.auth_utils import extract_auth0_id
from typing import Optional

router = APIRouter(prefix="/follows", tags=["follows"])


def get_user_id_from_token(db: Session, current_user: Optional[dict]) -> Optional[UUID]:
    """
    Get database user ID from Auth0 token.

    Args:
        db: Database session
        current_user: Decoded Auth0 token

    Returns:
        User UUID from database, or None if not authenticated

    Raises:
        HTTPException: If user is authenticated but not found
    """
    if not current_user:
        return None

    auth0_id = extract_auth0_id(current_user)
    user = UserService.get_user_by_auth0_id(db, auth0_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. Please complete registration first."
        )

    return user.id


# ========== Follow/Unfollow Actions ==========


@router.post(
    "/users/{user_id}",
    response_model=FollowResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Follow a user",
)
async def follow_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Follow a user.

    Requires authentication.
    Cannot follow yourself.
    """
    current_user_id = get_user_id_from_token(db, current_user)

    follow = FollowService.follow_user(db, current_user_id, user_id)

    if not follow:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot follow this user (user doesn't exist or you're trying to follow yourself)",
        )

    return follow


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unfollow a user",
)
async def unfollow_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Unfollow a user.

    Requires authentication.
    """
    current_user_id = get_user_id_from_token(db, current_user)

    success = FollowService.unfollow_user(db, current_user_id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not following this user",
        )

    return None


# ========== Get Followers/Following Lists ==========


@router.get(
    "/users/{user_id}/followers",
    response_model=List[FollowerResponse],
    summary="Get user's followers",
)
async def get_user_followers(
    user_id: UUID,
    skip: int = Query(0, ge=0, description="Number of followers to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of followers to return"),
    db: Session = Depends(get_db),
):
    """
    Get list of users who follow the specified user.
    """
    followers = FollowService.get_followers(db, user_id, skip, limit)

    return [
        FollowerResponse(
            id=follow.id,
            follower_id=follow.follower_id,
            created_at=follow.created_at,
            follower=UserFollowSummary(
                id=follow.follower.id,
                member_id=follow.follower.member_id,
                nickname=follow.follower.nickname,
                username=follow.follower.username,
                avatar_url=follow.follower.avatar_url,
                bio=follow.follower.bio,
            )
            if follow.follower
            else None,
        )
        for follow in followers
    ]


@router.get(
    "/users/{user_id}/following",
    response_model=List[FollowingResponse],
    summary="Get users that this user follows",
)
async def get_user_following(
    user_id: UUID,
    skip: int = Query(0, ge=0, description="Number to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number to return"),
    db: Session = Depends(get_db),
):
    """
    Get list of users that the specified user is following.
    """
    following = FollowService.get_following(db, user_id, skip, limit)

    return [
        FollowingResponse(
            id=follow.id,
            following_id=follow.following_id,
            created_at=follow.created_at,
            following=UserFollowSummary(
                id=follow.following.id,
                member_id=follow.following.member_id,
                nickname=follow.following.nickname,
                username=follow.following.username,
                avatar_url=follow.following.avatar_url,
                bio=follow.following.bio,
            )
            if follow.following
            else None,
        )
        for follow in following
    ]


# ========== Follow Statistics ==========


@router.get(
    "/users/{user_id}/stats",
    response_model=FollowStats,
    summary="Get follow statistics for a user",
)
async def get_follow_stats(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict | None = Depends(get_current_user_optional),
):
    """
    Get follow statistics for a user.

    Returns:
    - follower_count: Number of followers
    - following_count: Number of users following
    - is_following: Whether current user follows this user (if authenticated)
    - is_followed_by: Whether this user follows current user (if authenticated)
    """
    current_user_id = get_user_id_from_token(db, current_user)

    stats = FollowService.get_follow_stats(db, user_id, current_user_id)

    return FollowStats(**stats)


# ========== Check Follow Status ==========


@router.get(
    "/users/{user_id}/is-following",
    response_model=dict,
    summary="Check if current user is following a user",
)
async def check_is_following(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Check if the current user is following the specified user.

    Requires authentication.
    """
    current_user_id = get_user_id_from_token(db, current_user)

    is_following = FollowService.is_following(db, current_user_id, user_id)

    return {"is_following": is_following}
