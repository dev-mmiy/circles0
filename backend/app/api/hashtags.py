"""
Hashtags API endpoints for hashtag search and management.
"""

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.post import HashtagResponse
from app.services.hashtag_service import HashtagService

router = APIRouter(prefix="/hashtags", tags=["hashtags"])


@router.get(
    "",
    response_model=List[HashtagResponse],
    summary="Search hashtags",
)
async def search_hashtags(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results"),
    db: Session = Depends(get_db),
):
    """
    Search hashtags by name.

    Returns hashtags that match the search query (case-insensitive partial match).
    """
    hashtags = HashtagService.search_hashtags(db, q, limit)

    return [
        HashtagResponse(
            id=hashtag.id,
            name=hashtag.name,
            created_at=hashtag.created_at,
        )
        for hashtag in hashtags
    ]


@router.get(
    "/popular",
    response_model=List[HashtagResponse],
    summary="Get popular hashtags",
)
async def get_popular_hashtags(
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results"),
    db: Session = Depends(get_db),
):
    """
    Get most popular hashtags (by number of posts).

    Returns hashtags ordered by the number of posts that use them.
    """
    hashtags = HashtagService.get_popular_hashtags(db, limit)

    return [
        HashtagResponse(
            id=hashtag.id,
            name=hashtag.name,
            created_at=hashtag.created_at,
        )
        for hashtag in hashtags
    ]

