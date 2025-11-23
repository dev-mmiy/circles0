"""
Posts API endpoints for community posts, likes, and comments.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_current_user_optional
from app.database import get_db
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
from app.services.hashtag_service import HashtagService
from app.services.post_service import PostService
from app.services.user_service import UserService
from app.utils.auth_utils import extract_auth0_id

router = APIRouter(prefix="/posts", tags=["posts"])


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

    auth0_id = extract_auth0_id(current_user)
    user = UserService.get_user_by_auth0_id(db, auth0_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. Please complete registration first.",
        )

    return user.id


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
    user_id = get_user_id_from_token(db, current_user)

    post = PostService.create_post(db, user_id, post_data)

    # Extract and create hashtags from post content
    HashtagService.extract_and_create_hashtags(db, post.id, post_data.content)

    # Extract and create mentions from post content
    from app.services.mention_service import MentionService

    MentionService.extract_and_create_mentions(
        db, post.id, post_data.content, exclude_user_id=user_id
    )

    db.commit()

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
    limit: int = Query(
        20, ge=1, le=100, description="Maximum number of posts to return"
    ),
    filter_type: str = Query(
        "all",
        regex="^(all|following|disease|my_posts)$",
        description="Filter type: 'all' for all posts, 'following' for posts from followed users only, 'disease' for posts from users with specific disease, 'my_posts' for current user's posts only",
    ),
    disease_id: Optional[int] = Query(
        None,
        description="Disease ID to filter by (required when filter_type='disease')",
    ),
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Get a feed of posts.

    - Public posts are visible to everyone
    - Followers-only posts are visible to authenticated users who follow the author
    - Private posts are not included in feed

    Filter types:
    - "all": Show all public posts + followers_only posts from followed users
    - "following": Show only posts from users you follow (public + followers_only)
    - "disease": Show posts from users who have the specified disease (requires disease_id parameter)
    - "my_posts": Show only posts from the current user (requires authentication)
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"[get_feed] Request received: skip={skip}, limit={limit}, filter_type={filter_type}, disease_id={disease_id}")
    print(f"[get_feed] Request received: skip={skip}, limit={limit}, filter_type={filter_type}, disease_id={disease_id}")  # Force print
    
    user_id = get_user_id_from_token(db, current_user)
    logger.info(f"[get_feed] User ID: {user_id}")
    print(f"[get_feed] User ID: {user_id}")  # Force print

    # If filter_type is "following" but user is not authenticated, return empty
    if filter_type == "following" and not user_id:
        return []

    # If filter_type is "my_posts" but user is not authenticated, return empty
    if filter_type == "my_posts" and not user_id:
        return []

    # If filter_type is "disease" but disease_id is not provided, return empty
    if filter_type == "disease" and disease_id is None:
        logger.info("[get_feed] Disease filter selected but no disease_id provided, returning empty")
        print("[get_feed] Disease filter selected but no disease_id provided, returning empty")  # Force print
        return []

    logger.info(f"[get_feed] Calling PostService.get_feed")
    print(f"[get_feed] Calling PostService.get_feed")  # Force print
    posts = PostService.get_feed(db, user_id, skip, limit, filter_type, disease_id)
    logger.info(f"[get_feed] Posts retrieved: count={len(posts)}")
    print(f"[get_feed] Posts retrieved: count={len(posts)}")  # Force print

    logger.info(f"[get_feed] Building response for {len(posts)} posts")
    print(f"[get_feed] Building response for {len(posts)} posts")  # Force print
    response = [_build_post_response(db, post, user_id) for post in posts]
    logger.info(f"[get_feed] Response built successfully, returning {len(response)} posts")
    print(f"[get_feed] Response built successfully, returning {len(response)} posts")  # Force print
    
    return response


@router.get(
    "/hashtag/{hashtag_name}",
    response_model=List[PostResponse],
    summary="Get posts by hashtag",
)
async def get_posts_by_hashtag(
    hashtag_name: str,
    skip: int = Query(0, ge=0, description="Number of posts to skip"),
    limit: int = Query(
        20, ge=1, le=100, description="Maximum number of posts to return"
    ),
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Get posts that contain a specific hashtag.

    Respects visibility settings:
    - Public posts are visible to everyone
    - Followers-only posts are visible to authenticated users who follow the author
    - Private posts are not included
    """
    user_id = get_user_id_from_token(db, current_user)

    posts = PostService.get_posts_by_hashtag(db, hashtag_name, user_id, skip, limit)

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
    user_id = get_user_id_from_token(db, current_user) if current_user else None

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
    limit: int = Query(
        20, ge=1, le=100, description="Maximum number of posts to return"
    ),
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
    current_user_id = get_user_id_from_token(db, current_user) if current_user else None

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
    user_id = get_user_id_from_token(db, current_user)

    post = PostService.update_post(db, post_id, user_id, post_data)

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found or you don't have permission to update it",
        )

    # Update hashtags and mentions if content was updated
    if post_data.content is not None:
        from app.services.mention_service import MentionService

        # Delete old hashtags
        HashtagService.delete_post_hashtags(db, post.id)
        # Extract and create new hashtags
        HashtagService.extract_and_create_hashtags(db, post.id, post_data.content)

        # Delete old mentions
        MentionService.delete_post_mentions(db, post.id)
        # Extract and create new mentions
        MentionService.extract_and_create_mentions(
            db, post.id, post_data.content, exclude_user_id=user_id
        )

        db.commit()

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
    user_id = get_user_id_from_token(db, current_user)

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
    user_id = get_user_id_from_token(db, current_user)

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
        user=(
            PostAuthor(
                id=like.user.id,
                nickname=like.user.nickname,
                username=like.user.username,
                avatar_url=like.user.avatar_url,
            )
            if like.user
            else None
        ),
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
    user_id = get_user_id_from_token(db, current_user)

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
    limit: int = Query(
        50, ge=1, le=100, description="Maximum number of likes to return"
    ),
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
            user=(
                PostAuthor(
                    id=like.user.id,
                    nickname=like.user.nickname,
                    username=like.user.username,
                    avatar_url=like.user.avatar_url,
                )
                if like.user
                else None
            ),
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
    user_id = get_user_id_from_token(db, current_user)

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
    limit: int = Query(
        50, ge=1, le=100, description="Maximum number of comments to return"
    ),
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
    limit: int = Query(
        20, ge=1, le=100, description="Maximum number of replies to return"
    ),
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
    user_id = get_user_id_from_token(db, current_user)

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
    user_id = get_user_id_from_token(db, current_user)

    success = PostService.delete_comment(db, comment_id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found or you don't have permission to delete it",
        )

    return None


# ========== Helper Functions ==========


def _build_post_response(
    db: Session, post, current_user_id: Optional[UUID]
) -> PostResponse:
    """Build PostResponse with calculated fields."""
    from app.schemas.post import (
        HashtagResponse,
        MentionResponse,
        PostAuthor,
        PostImageResponse,
    )
    from app.services.mention_service import MentionService

    like_count = PostService.get_like_count(db, post.id)
    comment_count = PostService.get_comment_count(db, post.id)
    is_liked = (
        PostService.is_liked_by_user(db, post.id, current_user_id)
        if current_user_id
        else False
    )

    # Get hashtags for the post
    hashtags = HashtagService.get_hashtags_for_post(db, post.id)
    hashtag_responses = [
        HashtagResponse(
            id=hashtag.id,
            name=hashtag.name,
            created_at=hashtag.created_at,
        )
        for hashtag in hashtags
    ]

    # Get mentions for the post
    mentioned_users = MentionService.get_mentions_for_post(db, post.id)
    mention_responses = [
        MentionResponse(
            id=user.id,
            nickname=user.nickname,
            username=user.username,
            avatar_url=user.avatar_url,
        )
        for user in mentioned_users
    ]

    # Get images for the post
    image_responses = [
        PostImageResponse(
            id=image.id,
            image_url=image.image_url,
            display_order=image.display_order,
            created_at=image.created_at,
        )
        for image in (post.images if hasattr(post, "images") and post.images else [])
    ]

    return PostResponse(
        id=post.id,
        user_id=post.user_id,
        content=post.content,
        visibility=post.visibility,
        is_active=post.is_active,
        created_at=post.created_at,
        updated_at=post.updated_at,
        author=(
            PostAuthor(
                id=post.user.id,
                nickname=post.user.nickname,
                username=post.user.username,
                avatar_url=post.user.avatar_url,
            )
            if post.user
            else None
        ),
        like_count=like_count,
        comment_count=comment_count,
        is_liked_by_current_user=is_liked,
        hashtags=hashtag_responses,
        mentions=mention_responses,
        images=image_responses,
    )


def _build_post_detail_response(
    db: Session, post, current_user_id: Optional[UUID]
) -> PostDetailResponse:
    """Build PostDetailResponse with comments and likes."""
    from app.schemas.post import HashtagResponse, PostAuthor, PostImageResponse
    from app.services.mention_service import MentionService

    like_count = PostService.get_like_count(db, post.id)
    comment_count = PostService.get_comment_count(db, post.id)
    is_liked = (
        PostService.is_liked_by_user(db, post.id, current_user_id)
        if current_user_id
        else False
    )

    # Get hashtags for the post
    hashtags = HashtagService.get_hashtags_for_post(db, post.id)
    hashtag_responses = [
        HashtagResponse(
            id=hashtag.id,
            name=hashtag.name,
            created_at=hashtag.created_at,
        )
        for hashtag in hashtags
    ]

    # Get mentions for the post
    mentioned_users = MentionService.get_mentions_for_post(db, post.id)
    mention_responses = [
        MentionResponse(
            id=user.id,
            nickname=user.nickname,
            username=user.username,
            avatar_url=user.avatar_url,
        )
        for user in mentioned_users
    ]

    # Get images for the post
    image_responses = [
        PostImageResponse(
            id=image.id,
            image_url=image.image_url,
            display_order=image.display_order,
            created_at=image.created_at,
        )
        for image in (post.images if hasattr(post, "images") and post.images else [])
    ]

    # Build comments
    comments = [
        _build_comment_response(db, comment)
        for comment in post.comments
        if comment.is_active
    ]

    # Build likes
    likes = [
        PostLikeResponse(
            id=like.id,
            post_id=like.post_id,
            user_id=like.user_id,
            reaction_type=like.reaction_type,
            created_at=like.created_at,
            user=(
                PostAuthor(
                    id=like.user.id,
                    nickname=like.user.nickname,
                    username=like.user.username,
                    avatar_url=like.user.avatar_url,
                )
                if like.user
                else None
            ),
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
        author=(
            PostAuthor(
                id=post.user.id,
                nickname=post.user.nickname,
                username=post.user.username,
                avatar_url=post.user.avatar_url,
            )
            if post.user
            else None
        ),
        like_count=like_count,
        comment_count=comment_count,
        is_liked_by_current_user=is_liked,
        hashtags=hashtag_responses,
        mentions=mention_responses,
        images=image_responses,
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
        author=(
            PostAuthor(
                id=comment.user.id,
                nickname=comment.user.nickname,
                username=comment.user.username,
                avatar_url=comment.user.avatar_url,
            )
            if comment.user
            else None
        ),
        reply_count=reply_count,
    )
