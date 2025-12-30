"""
API endpoints for unified timeline.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user_optional
from app.database import get_db
from app.services.timeline_service import TimelineService
from app.utils.auth_utils import extract_auth0_id

router = APIRouter(prefix="/timeline", tags=["timeline"])


def get_user_id_from_token(db: Session, current_user: Optional[dict]) -> Optional[UUID]:
    """
    Get database user ID from Auth0 token.
    
    Args:
        db: Database session
        current_user: Decoded Auth0 token
    
    Returns:
        User UUID from database, or None if user not found or not authenticated
    """
    if not current_user:
        return None

    try:
        auth0_id = current_user.get("sub")
        if not auth0_id:
            return None

        from app.models.user import User
        user = db.query(User).filter(User.auth0_id == auth0_id).first()
        return user.id if user else None
    except Exception:
        return None


@router.get(
    "",
    summary="Get unified timeline of posts, vital records, and meal records",
)
async def get_timeline(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of items to return"),
    filter_type: str = Query(
        "all",
        pattern="^(all|following|my_posts)$",
        description=(
            "Filter type: 'all' for all items, 'following' for items from "
            "followed users only, 'my_posts' for current user's items only"
        ),
    ),
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Get a unified timeline of posts, vital records, and meal records.
    
    - Public items are visible to everyone
    - Followers-only items are visible to authenticated users who follow the author
    - Private items are not included in timeline
    
    Filter types:
    - "all": Show all public items + followers_only items from followed users
    - "following": Show only items from users you follow (public + followers_only)
    - "my_posts": Show only items from the current user (requires authentication)
    """
    user_id = get_user_id_from_token(db, current_user)
    
    # If filter_type requires authentication but user is not authenticated, return empty
    auth_required_filters = ("following", "my_posts")
    if filter_type in auth_required_filters and not user_id:
        return {
            "items": [],
            "total": 0,
            "skip": skip,
            "limit": limit,
        }

    result = TimelineService.get_timeline(
        db=db,
        current_user_id=user_id,
        skip=skip,
        limit=limit,
        filter_type=filter_type,
    )
    
    return result

