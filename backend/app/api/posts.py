"""
Posts API endpoints for community posts, likes, and comments.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_current_user_optional, get_db
from app.schemas.post import (
    PostCommentCreate,
    PostCommentResponse,
    PostCommentUpdate,
    PostCreate,
    PostDetailResponse,
    PostLikeCreate,
    PostLikeResponse,
    PostResponse,
    PostUpdate,
)
from app.services.post_service import PostService

router = APIRouter(prefix="/posts", tags=["posts"])


# ========== Post Endpoints ==========


@router.post(
    "",
    response_model=PostResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new post",
)
async def create_post(
    post_data: PostCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Create a new community post.

    Requires authentication.
    """
    user_id = UUID(current_user["sub"])

    post = PostService.create_post(db, user_id, post_data)

    # Fetch post with relationships for response
    post_with_data = PostService.get_post_by_id(db, post.id, user_id)

    return _build_post_response(db, post_with_data, user_id)


@router.get(
    "",
    response_model=List[PostResponse],
    summary="Get feed of posts",
)
async def get_feed(
    skip: int = Query(0, ge=0, description="Number of posts to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of posts to return"),
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Get a feed of posts.

    - Public posts are visible to everyone
    - Followers-only posts are visible to authenticated users (TODO: filter by following)
    - Private posts are not included in feed
    """
    user_id = UUID(current_user["sub"]) if current_user else None

    posts = PostService.get_feed(db, user_id, skip, limit)

    return [_build_post_response(db, post, user_id) for post in posts]


@router.get(
    "/{post_id}",
    response_model=PostDetailResponse,
    summary="Get a post by ID",
)
async def get_post(
    post_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Get a specific post by ID with all comments and likes.

    Respects visibility settings:
    - Public: visible to everyone
    - Followers only: visible to followers (TODO: implement follow check)
    - Private: visible only to author
    """
    user_id = UUID(current_user["sub"]) if current_user else None

    post = PostService.get_post_by_id(db, post_id, user_id)

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found or not accessible",
        )

    return _build_post_detail_response(db, post, user_id)


@router.get(
    "/user/{user_id}",
    response_model=List[PostResponse],
    summary="Get posts by a specific user",
)
async def get_user_posts(
    user_id: UUID,
    skip: int = Query(0, ge=0, description="Number of posts to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of posts to return"),
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Get all posts by a specific user.

    Respects visibility settings:
    - User viewing their own posts: all posts visible
    - Authenticated user: public and followers-only posts
    - Unauthenticated user: only public posts
    """
    current_user_id = UUID(current_user["sub"]) if current_user else None

    posts = PostService.get_user_posts(db, user_id, current_user_id, skip, limit)

    return [_build_post_response(db, post, current_user_id) for post in posts]


@router.put(
    "/{post_id}",
    response_model=PostResponse,
    summary="Update a post",
)
async def update_post(
    post_id: UUID,
    post_data: PostUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Update a post.

    Only the author can update their post.
    """
    user_id = UUID(current_user["sub"])

    post = PostService.update_post(db, post_id, user_id, post_data)

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found or you don't have permission to update it",
        )

    # Fetch post with relationships for response
    post_with_data = PostService.get_post_by_id(db, post.id, user_id)

    return _build_post_response(db, post_with_data, user_id)


@router.delete(
    "/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a post",
)
async def delete_post(
    post_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Soft delete a post.

    Only the author can delete their post.
    """
    user_id = UUID(current_user["sub"])

    success = PostService.delete_post(db, post_id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found or you don't have permission to delete it",
        )

    return None


# ========== Post Like Endpoints ==========


@router.post(
    "/{post_id}/like",
    response_model=PostLikeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Like a post",
)
async def like_post(
    post_id: UUID,
    like_data: PostLikeCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Like a post or update existing reaction type.

    If the user has already liked the post, the reaction type will be updated.
    """
    user_id = UUID(current_user["sub"])

    like = PostService.like_post(db, post_id, user_id, like_data)

    if not like:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found or not accessible",
        )

    # Build response with user info
    from app.schemas.post import PostAuthor

    return PostLikeResponse(
        id=like.id,
        post_id=like.post_id,
        user_id=like.user_id,
        reaction_type=like.reaction_type,
        created_at=like.created_at,
        user=PostAuthor(
            id=like.user.id,
            nickname=like.user.nickname,
            username=like.user.username,
            avatar_url=like.user.avatar_url,
        )
        if like.user
        else None,
    )


@router.delete(
    "/{post_id}/like",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unlike a post",
)
async def unlike_post(
    post_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Remove like from a post.
    """
    user_id = UUID(current_user["sub"])

    success = PostService.unlike_post(db, post_id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Like not found",
        )

    return None


@router.get(
    "/{post_id}/likes",
    response_model=List[PostLikeResponse],
    summary="Get all likes for a post",
)
async def get_post_likes(
    post_id: UUID,
    skip: int = Query(0, ge=0, description="Number of likes to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of likes to return"),
    db: Session = Depends(get_db),
):
    """
    Get all users who liked a post.
    """
    likes = PostService.get_post_likes(db, post_id, skip, limit)

    from app.schemas.post import PostAuthor

    return [
        PostLikeResponse(
            id=like.id,
            post_id=like.post_id,
            user_id=like.user_id,
            reaction_type=like.reaction_type,
            created_at=like.created_at,
            user=PostAuthor(
                id=like.user.id,
                nickname=like.user.nickname,
                username=like.user.username,
                avatar_url=like.user.avatar_url,
            )
            if like.user
            else None,
        )
        for like in likes
    ]


# ========== Post Comment Endpoints ==========


@router.post(
    "/{post_id}/comments",
    response_model=PostCommentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a comment on a post",
)
async def create_comment(
    post_id: UUID,
    comment_data: PostCommentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Create a comment on a post.

    Can be a top-level comment or a reply to another comment (nested).
    """
    user_id = UUID(current_user["sub"])

    comment = PostService.create_comment(db, post_id, user_id, comment_data)

    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found, not accessible, or parent comment invalid",
        )

    return _build_comment_response(db, comment)


@router.get(
    "/{post_id}/comments",
    response_model=List[PostCommentResponse],
    summary="Get top-level comments for a post",
)
async def get_post_comments(
    post_id: UUID,
    skip: int = Query(0, ge=0, description="Number of comments to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of comments to return"),
    db: Session = Depends(get_db),
):
    """
    Get top-level comments for a post (not including nested replies).

    Use the `/comments/{comment_id}/replies` endpoint to get replies to a specific comment.
    """
    comments = PostService.get_post_comments(db, post_id, skip, limit)

    return [_build_comment_response(db, comment) for comment in comments]


@router.get(
    "/comments/{comment_id}/replies",
    response_model=List[PostCommentResponse],
    summary="Get replies to a comment",
)
async def get_comment_replies(
    comment_id: UUID,
    skip: int = Query(0, ge=0, description="Number of replies to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of replies to return"),
    db: Session = Depends(get_db),
):
    """
    Get all replies to a specific comment.
    """
    replies = PostService.get_comment_replies(db, comment_id, skip, limit)

    return [_build_comment_response(db, reply) for reply in replies]


@router.put(
    "/comments/{comment_id}",
    response_model=PostCommentResponse,
    summary="Update a comment",
)
async def update_comment(
    comment_id: UUID,
    comment_data: PostCommentUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Update a comment.

    Only the author can update their comment.
    """
    user_id = UUID(current_user["sub"])

    comment = PostService.update_comment(db, comment_id, user_id, comment_data)

    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found or you don't have permission to update it",
        )

    return _build_comment_response(db, comment)


@router.delete(
    "/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a comment",
)
async def delete_comment(
    comment_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Soft delete a comment.

    Only the author can delete their comment.
    """
    user_id = UUID(current_user["sub"])

    success = PostService.delete_comment(db, comment_id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found or you don't have permission to delete it",
        )

    return None


# ========== Helper Functions ==========


def _build_post_response(db: Session, post, current_user_id: Optional[UUID]) -> PostResponse:
    """Build PostResponse with calculated fields."""
    from app.schemas.post import PostAuthor

    like_count = PostService.get_like_count(db, post.id)
    comment_count = PostService.get_comment_count(db, post.id)
    is_liked = (
        PostService.is_liked_by_user(db, post.id, current_user_id)
        if current_user_id
        else False
    )

    return PostResponse(
        id=post.id,
        user_id=post.user_id,
        content=post.content,
        visibility=post.visibility,
        is_active=post.is_active,
        created_at=post.created_at,
        updated_at=post.updated_at,
        author=PostAuthor(
            id=post.user.id,
            nickname=post.user.nickname,
            username=post.user.username,
            avatar_url=post.user.avatar_url,
        )
        if post.user
        else None,
        like_count=like_count,
        comment_count=comment_count,
        is_liked_by_current_user=is_liked,
    )


def _build_post_detail_response(
    db: Session, post, current_user_id: Optional[UUID]
) -> PostDetailResponse:
    """Build PostDetailResponse with comments and likes."""
    from app.schemas.post import PostAuthor

    like_count = PostService.get_like_count(db, post.id)
    comment_count = PostService.get_comment_count(db, post.id)
    is_liked = (
        PostService.is_liked_by_user(db, post.id, current_user_id)
        if current_user_id
        else False
    )

    # Build comments
    comments = [_build_comment_response(db, comment) for comment in post.comments if comment.is_active]

    # Build likes
    likes = [
        PostLikeResponse(
            id=like.id,
            post_id=like.post_id,
            user_id=like.user_id,
            reaction_type=like.reaction_type,
            created_at=like.created_at,
            user=PostAuthor(
                id=like.user.id,
                nickname=like.user.nickname,
                username=like.user.username,
                avatar_url=like.user.avatar_url,
            )
            if like.user
            else None,
        )
        for like in post.likes
    ]

    return PostDetailResponse(
        id=post.id,
        user_id=post.user_id,
        content=post.content,
        visibility=post.visibility,
        is_active=post.is_active,
        created_at=post.created_at,
        updated_at=post.updated_at,
        author=PostAuthor(
            id=post.user.id,
            nickname=post.user.nickname,
            username=post.user.username,
            avatar_url=post.user.avatar_url,
        )
        if post.user
        else None,
        like_count=like_count,
        comment_count=comment_count,
        is_liked_by_current_user=is_liked,
        comments=comments,
        likes=likes,
    )


def _build_comment_response(db: Session, comment) -> PostCommentResponse:
    """Build PostCommentResponse with calculated fields."""
    from app.schemas.post import PostAuthor

    reply_count = PostService.get_reply_count(db, comment.id)

    return PostCommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        parent_comment_id=comment.parent_comment_id,
        content=comment.content,
        is_active=comment.is_active,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        author=PostAuthor(
            id=comment.user.id,
            nickname=comment.user.nickname,
            username=comment.user.username,
            avatar_url=comment.user.avatar_url,
        )
        if comment.user
        else None,
        reply_count=reply_count,
    )
