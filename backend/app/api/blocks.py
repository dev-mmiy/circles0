"""
Block/Unblock API endpoints.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.schemas.block import BlockResponse, BlockStats, BlockedUserSummary
from app.services.block_service import BlockService
from app.services.user_service import UserService
from app.utils.auth_utils import extract_auth0_id

router = APIRouter(prefix="/blocks", tags=["blocks"])


def get_user_id_from_token(db: Session, current_user: dict) -> UUID:
    """
    Get database user ID from Auth0 token.

    Args:
        db: Database session
        current_user: Decoded Auth0 token

    Returns:
        User UUID from database

    Raises:
        HTTPException: If user is authenticated but not found
    """
    auth0_id = extract_auth0_id(current_user)
    user = UserService.get_user_by_auth0_id(db, auth0_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. Please complete registration first.",
        )

    return user.id


# ========== Block/Unblock Actions ==========


@router.post(
    "/users/{user_id}",
    response_model=BlockResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Block a user",
)
async def block_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Block a user.

    Requires authentication.
    Cannot block yourself.
    When blocking, any existing follow relationships are automatically removed.
    """
    current_user_id = get_user_id_from_token(db, current_user)

    block = BlockService.block_user(db, current_user_id, user_id)

    if not block:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot block this user (user doesn't exist or you're trying to block yourself)",
        )

    return block


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unblock a user",
)
async def unblock_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Unblock a user.

    Requires authentication.
    """
    current_user_id = get_user_id_from_token(db, current_user)

    success = BlockService.unblock_user(db, current_user_id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not blocked",
        )

    return None


# ========== Block Status Checks ==========


@router.get(
    "/users/{user_id}/status",
    response_model=dict,
    summary="Check if a user is blocked",
)
async def check_block_status(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Check if current user has blocked the specified user.

    Returns:
        {
            "is_blocked": bool,
            "is_blocked_by": bool,
            "are_blocked": bool
        }
    """
    current_user_id = get_user_id_from_token(db, current_user)

    is_blocked = BlockService.is_blocked(db, current_user_id, user_id)
    is_blocked_by = BlockService.is_blocked_by(db, current_user_id, user_id)
    are_blocked = BlockService.are_blocked(db, current_user_id, user_id)

    return {
        "is_blocked": is_blocked,
        "is_blocked_by": is_blocked_by,
        "are_blocked": are_blocked,
    }


# ========== Blocked Users List ==========


@router.get(
    "/me/blocked",
    response_model=List[BlockedUserSummary],
    summary="Get list of blocked users",
)
async def get_blocked_users(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get list of users blocked by the current user.

    Requires authentication.
    """
    current_user_id = get_user_id_from_token(db, current_user)

    blocks = BlockService.get_blocked_users(db, current_user_id, skip=skip, limit=limit)

    # Convert to summary format
    result = []
    for block in blocks:
        blocked_user = UserService.get_user_by_id(db, block.blocked_id)
        if blocked_user:
            result.append(
                BlockedUserSummary(
                    id=blocked_user.id,
                    member_id=blocked_user.member_id,
                    nickname=blocked_user.nickname,
                    avatar_url=blocked_user.avatar_url,
                    blocked_at=block.created_at,
                )
            )

    return result


# ========== Block Statistics ==========


@router.get(
    "/me/stats",
    response_model=BlockStats,
    summary="Get blocking statistics",
)
async def get_block_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get blocking statistics for the current user.

    Requires authentication.
    """
    current_user_id = get_user_id_from_token(db, current_user)

    blocked_count = BlockService.get_blocked_users_count(db, current_user_id)

    return BlockStats(blocked_count=blocked_count)


