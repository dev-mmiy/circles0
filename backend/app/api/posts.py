"""
Posts API endpoints for community posts, likes, and comments.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_current_user_optional
from app.database import get_db
from app.schemas.post import (
    PostCommentCreate,
    PostCommentLikeCreate,
    PostCommentLikeResponse,
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
    user_id = get_user_id_from_token(db, current_user)
    logger.debug(f"[get_feed] User ID: {user_id}")

    # If filter_type is "following" but user is not authenticated, return empty
    if filter_type == "following" and not user_id:
        return []

    # If filter_type is "my_posts" but user is not authenticated, return empty
    if filter_type == "my_posts" and not user_id:
        return []

    # If filter_type is "disease" but disease_id is not provided, return empty
    if filter_type == "disease" and disease_id is None:
        logger.info("[get_feed] Disease filter selected but no disease_id provided, returning empty")
        return []

    import time
    feed_start_time = time.time()
    posts = PostService.get_feed(db, user_id, skip, limit, filter_type, disease_id)
    feed_elapsed = time.time() - feed_start_time
    logger.debug(f"[get_feed] Posts retrieved: count={len(posts)} (took {feed_elapsed:.3f}s)")

    # Performance Optimization: Pre-fetch all counts, likes, hashtags, and mentions in bulk
    # This avoids N+1 query problems by fetching all related data in a few queries
    # instead of querying for each post individually.
    # 
    # Without this optimization:
    # - For 20 posts, we would execute 20+ queries (one per post for likes, comments, etc.)
    # - This results in 100+ database queries for a single feed request
    #
    # With this optimization:
    # - We execute only 6 queries total (likes, comments, liked status, hashtags, mentions, images)
    # - This reduces database load and improves response time significantly
    post_ids = [post.id for post in posts]
    bulk_fetch_start_time = time.time()
    
    # Step 1: Get like counts for all posts in a single query using GROUP BY
    # This replaces N queries (one per post) with a single aggregated query.
    # Example: Instead of 20 queries like "SELECT COUNT(*) FROM post_likes WHERE post_id = ?",
    # we execute one query: "SELECT post_id, COUNT(*) FROM post_likes WHERE post_id IN (...) GROUP BY post_id"
    from app.models.post import PostLike
    like_counts_query = (
        db.query(PostLike.post_id, func.count(PostLike.id).label('count'))
        .filter(PostLike.post_id.in_(post_ids))
        .group_by(PostLike.post_id)
        .all()
    )
    like_counts = {post_id: count for post_id, count in like_counts_query}
    
    # Step 2: Get comment counts for all posts in a single query using GROUP BY
    # Only count active comments (is_active == True)
    from app.models.post import PostComment
    comment_counts_query = (
        db.query(PostComment.post_id, func.count(PostComment.id).label('count'))
        .filter(
            PostComment.post_id.in_(post_ids),
            PostComment.is_active == True
        )
        .group_by(PostComment.post_id)
        .all()
    )
    comment_counts = {post_id: count for post_id, count in comment_counts_query}
    
    # Step 3: Get liked posts for current user in a single query
    # This determines which posts the current user has liked (for UI state)
    liked_post_ids = set()
    if user_id and post_ids:
        liked_posts = (
            db.query(PostLike.post_id)
            .filter(
                PostLike.post_id.in_(post_ids),
                PostLike.user_id == user_id
            )
            .all()
        )
        liked_post_ids = {row[0] for row in liked_posts}
    
    # Step 4: Get hashtags for all posts in a single query
    # JOIN PostHashtag with Hashtag to get full hashtag objects
    from app.models.hashtag import PostHashtag
    from app.models.hashtag import Hashtag
    post_hashtags_query = (
        db.query(PostHashtag.post_id, Hashtag)
        .join(Hashtag, PostHashtag.hashtag_id == Hashtag.id)
        .filter(PostHashtag.post_id.in_(post_ids))
        .all()
    )
    # Build dictionary mapping post_id to list of hashtags
    hashtags_by_post = {}
    for post_id, hashtag in post_hashtags_query:
        if post_id not in hashtags_by_post:
            hashtags_by_post[post_id] = []
        hashtags_by_post[post_id].append(hashtag)
    
    # Step 5: Get mentions for all posts in a single query
    # JOIN PostMention with User to get full user objects for mentioned users
    from app.models.mention import PostMention
    from app.models.user import User
    post_mentions_query = (
        db.query(PostMention.post_id, User)
        .join(User, PostMention.mentioned_user_id == User.id)
        .filter(PostMention.post_id.in_(post_ids))
        .all()
    )
    # Build dictionary mapping post_id to list of mentioned users
    mentions_by_post = {}
    for post_id, user in post_mentions_query:
        if post_id not in mentions_by_post:
            mentions_by_post[post_id] = []
        mentions_by_post[post_id].append(user)
    
    bulk_fetch_elapsed = time.time() - bulk_fetch_start_time
    logger.debug(f"[get_feed] Pre-fetched data: like_counts={len(like_counts)}, comment_counts={len(comment_counts)}, liked_posts={len(liked_post_ids)}, hashtags={len(hashtags_by_post)}, mentions={len(mentions_by_post)} (took {bulk_fetch_elapsed:.3f}s)")
    
    # Get viewer's disease IDs for field visibility checks
    from app.models.disease import UserDisease
    viewer_disease_ids = None
    if user_id:
        viewer_disease_ids = [
            ud.disease_id
            for ud in db.query(UserDisease)
            .filter(
                UserDisease.user_id == user_id,
                UserDisease.is_active == True,
            )
            .all()
        ]
    
    # Build responses with pre-fetched data
    response_build_start_time = time.time()
    response = [
        _build_post_response_optimized(
            db, post, user_id,
            like_counts.get(post.id, 0),
            comment_counts.get(post.id, 0),
            post.id in liked_post_ids,
            hashtags_by_post.get(post.id, []),
            mentions_by_post.get(post.id, []),
            viewer_disease_ids
        )
        for post in posts
    ]
    response_build_elapsed = time.time() - response_build_start_time
    total_elapsed = time.time() - feed_start_time
    logger.info(
        f"[get_feed] Response built successfully: {len(response)} posts "
        f"(feed: {feed_elapsed:.3f}s, bulk_fetch: {bulk_fetch_elapsed:.3f}s, "
        f"response_build: {response_build_elapsed:.3f}s, total: {total_elapsed:.3f}s)"
    )
    
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

    # Optimize: Pre-fetch all counts, likes, hashtags, and mentions in bulk
    post_ids = [post.id for post in posts]
    
    if post_ids:
        # Get like counts for all posts in a single query
        from app.models.post import PostLike
        like_counts_query = (
            db.query(PostLike.post_id, func.count(PostLike.id).label('count'))
            .filter(PostLike.post_id.in_(post_ids))
            .group_by(PostLike.post_id)
            .all()
        )
        like_counts = {post_id: count for post_id, count in like_counts_query}
        
        # Get comment counts for all posts in a single query
        from app.models.post import PostComment
        comment_counts_query = (
            db.query(PostComment.post_id, func.count(PostComment.id).label('count'))
            .filter(
                PostComment.post_id.in_(post_ids),
                PostComment.is_active == True
            )
            .group_by(PostComment.post_id)
            .all()
        )
        comment_counts = {post_id: count for post_id, count in comment_counts_query}
        
        # Get liked posts for current user in a single query
        liked_post_ids = set()
        if user_id:
            liked_posts = (
                db.query(PostLike.post_id)
                .filter(
                    PostLike.post_id.in_(post_ids),
                    PostLike.user_id == user_id
                )
                .all()
            )
            liked_post_ids = {row[0] for row in liked_posts}
        
        # Get hashtags for all posts in a single query
        from app.models.hashtag import PostHashtag
        from app.models.hashtag import Hashtag
        post_hashtags_query = (
            db.query(PostHashtag.post_id, Hashtag)
            .join(Hashtag, PostHashtag.hashtag_id == Hashtag.id)
            .filter(PostHashtag.post_id.in_(post_ids))
            .all()
        )
        hashtags_by_post = {}
        for post_id, hashtag in post_hashtags_query:
            if post_id not in hashtags_by_post:
                hashtags_by_post[post_id] = []
            hashtags_by_post[post_id].append(hashtag)
        
        # Get mentions for all posts in a single query
        from app.models.mention import PostMention
        from app.models.user import User
        post_mentions_query = (
            db.query(PostMention.post_id, User)
            .join(User, PostMention.mentioned_user_id == User.id)
            .filter(PostMention.post_id.in_(post_ids))
            .all()
        )
        mentions_by_post = {}
        for post_id, user in post_mentions_query:
            if post_id not in mentions_by_post:
                mentions_by_post[post_id] = []
            mentions_by_post[post_id].append(user)
        
        # Build responses with pre-fetched data
        return [
            _build_post_response_optimized(
                db, post, user_id,
                like_counts.get(post.id, 0),
                comment_counts.get(post.id, 0),
                post.id in liked_post_ids,
                hashtags_by_post.get(post.id, []),
                mentions_by_post.get(post.id, [])
            )
            for post in posts
        ]
    else:
        return []


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
    - Followers only: visible to followers (follow check implemented)
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

    # Optimize: Pre-fetch all counts, likes, hashtags, and mentions in bulk
    post_ids = [post.id for post in posts]
    
    if post_ids:
        # Get like counts for all posts in a single query
        from app.models.post import PostLike
        like_counts_query = (
            db.query(PostLike.post_id, func.count(PostLike.id).label('count'))
            .filter(PostLike.post_id.in_(post_ids))
            .group_by(PostLike.post_id)
            .all()
        )
        like_counts = {post_id: count for post_id, count in like_counts_query}
        
        # Get comment counts for all posts in a single query
        from app.models.post import PostComment
        comment_counts_query = (
            db.query(PostComment.post_id, func.count(PostComment.id).label('count'))
            .filter(
                PostComment.post_id.in_(post_ids),
                PostComment.is_active == True
            )
            .group_by(PostComment.post_id)
            .all()
        )
        comment_counts = {post_id: count for post_id, count in comment_counts_query}
        
        # Get liked posts for current user in a single query
        liked_post_ids = set()
        if current_user_id:
            liked_posts = (
                db.query(PostLike.post_id)
                .filter(
                    PostLike.post_id.in_(post_ids),
                    PostLike.user_id == current_user_id
                )
                .all()
            )
            liked_post_ids = {row[0] for row in liked_posts}
        
        # Get hashtags for all posts in a single query
        from app.models.hashtag import PostHashtag
        from app.models.hashtag import Hashtag
        post_hashtags_query = (
            db.query(PostHashtag.post_id, Hashtag)
            .join(Hashtag, PostHashtag.hashtag_id == Hashtag.id)
            .filter(PostHashtag.post_id.in_(post_ids))
            .all()
        )
        hashtags_by_post = {}
        for post_id, hashtag in post_hashtags_query:
            if post_id not in hashtags_by_post:
                hashtags_by_post[post_id] = []
            hashtags_by_post[post_id].append(hashtag)
        
        # Get mentions for all posts in a single query
        from app.models.mention import PostMention
        from app.models.user import User
        post_mentions_query = (
            db.query(PostMention.post_id, User)
            .join(User, PostMention.mentioned_user_id == User.id)
            .filter(PostMention.post_id.in_(post_ids))
            .all()
        )
        mentions_by_post = {}
        for post_id, user in post_mentions_query:
            if post_id not in mentions_by_post:
                mentions_by_post[post_id] = []
            mentions_by_post[post_id].append(user)
        
        # Build responses with pre-fetched data
        return [
            _build_post_response_optimized(
                db, post, current_user_id,
                like_counts.get(post.id, 0),
                comment_counts.get(post.id, 0),
                post.id in liked_post_ids,
                hashtags_by_post.get(post.id, []),
                mentions_by_post.get(post.id, [])
            )
            for post in posts
        ]
    else:
        return []


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
    from app.services.user_field_visibility_service import UserFieldVisibilityService
    from app.models.disease import UserDisease

    # Get viewer's disease IDs for field visibility checks
    viewer_disease_ids = None
    if user_id:
        viewer_disease_ids = [
            ud.disease_id
            for ud in db.query(UserDisease)
            .filter(
                UserDisease.user_id == user_id,
                UserDisease.is_active == True,
            )
            .all()
        ]

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
                username=(
                    like.user.username
                    if UserFieldVisibilityService.can_view_field(
                        db, like.user.id, "username", user_id, viewer_disease_ids
                    )
                    else None
                ),
                avatar_url=(
                    like.user.avatar_url
                    if UserFieldVisibilityService.can_view_field(
                        db, like.user.id, "avatar_url", user_id, viewer_disease_ids
                    )
                    else None
                ),
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
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Get all users who liked a post.
    """
    likes = PostService.get_post_likes(db, post_id, skip, limit)
    current_user_id = get_user_id_from_token(db, current_user)

    from app.schemas.post import PostAuthor
    from app.services.user_field_visibility_service import UserFieldVisibilityService
    from app.models.disease import UserDisease

    # Get viewer's disease IDs for field visibility checks
    viewer_disease_ids = None
    if current_user_id:
        viewer_disease_ids = [
            ud.disease_id
            for ud in db.query(UserDisease)
            .filter(
                UserDisease.user_id == current_user_id,
                UserDisease.is_active == True,
            )
            .all()
        ]

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
                    username=(
                        like.user.username
                        if UserFieldVisibilityService.can_view_field(
                            db, like.user.id, "username", current_user_id, viewer_disease_ids
                        )
                        else None
                    ),
                    avatar_url=(
                        like.user.avatar_url
                        if UserFieldVisibilityService.can_view_field(
                            db, like.user.id, "avatar_url", current_user_id, viewer_disease_ids
                        )
                        else None
                    ),
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

    # Get viewer's disease IDs for field visibility checks
    from app.models.disease import UserDisease
    viewer_disease_ids = None
    if user_id:
        viewer_disease_ids = [
            ud.disease_id
            for ud in db.query(UserDisease)
            .filter(
                UserDisease.user_id == user_id,
                UserDisease.is_active == True,
            )
            .all()
        ]

    return _build_comment_response(db, comment, user_id, viewer_disease_ids)


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
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Get top-level comments for a post (not including nested replies).

    Use the `/comments/{comment_id}/replies` endpoint to get replies to a specific comment.
    """
    comments = PostService.get_post_comments(db, post_id, skip, limit)
    current_user_id = get_user_id_from_token(db, current_user)

    # Get viewer's disease IDs for field visibility checks
    from app.models.disease import UserDisease
    viewer_disease_ids = None
    if current_user_id:
        viewer_disease_ids = [
            ud.disease_id
            for ud in db.query(UserDisease)
            .filter(
                UserDisease.user_id == current_user_id,
                UserDisease.is_active == True,
            )
            .all()
        ]

    return [_build_comment_response(db, comment, current_user_id, viewer_disease_ids) for comment in comments]


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
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Get all replies to a specific comment.
    """
    replies = PostService.get_comment_replies(db, comment_id, skip, limit)
    current_user_id = get_user_id_from_token(db, current_user)

    # Get viewer's disease IDs for field visibility checks
    from app.models.disease import UserDisease
    viewer_disease_ids = None
    if current_user_id:
        viewer_disease_ids = [
            ud.disease_id
            for ud in db.query(UserDisease)
            .filter(
                UserDisease.user_id == current_user_id,
                UserDisease.is_active == True,
            )
            .all()
        ]

    return [_build_comment_response(db, reply, current_user_id, viewer_disease_ids) for reply in replies]


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

    # Get viewer's disease IDs for field visibility checks
    from app.models.disease import UserDisease
    viewer_disease_ids = None
    if user_id:
        viewer_disease_ids = [
            ud.disease_id
            for ud in db.query(UserDisease)
            .filter(
                UserDisease.user_id == user_id,
                UserDisease.is_active == True,
            )
            .all()
        ]

    return _build_comment_response(db, comment, user_id, viewer_disease_ids)


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


# ========== Post Comment Like Endpoints ==========


@router.post(
    "/comments/{comment_id}/like",
    response_model=PostCommentLikeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Like a comment",
)
async def like_comment(
    comment_id: UUID,
    like_data: PostCommentLikeCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Like a comment or update existing reaction type.

    If the user has already liked the comment, the reaction type will be updated.
    """
    user_id = get_user_id_from_token(db, current_user)

    like = PostService.like_comment(db, comment_id, user_id, like_data)

    if not like:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found or not accessible",
        )

    # Build response with user info
    from app.schemas.post import PostAuthor
    from app.services.user_field_visibility_service import UserFieldVisibilityService
    from app.models.disease import UserDisease

    # Get viewer's disease IDs for field visibility checks
    viewer_disease_ids = None
    if user_id:
        viewer_disease_ids = [
            ud.disease_id
            for ud in db.query(UserDisease)
            .filter(
                UserDisease.user_id == user_id,
                UserDisease.is_active == True,
            )
            .all()
        ]

    return PostCommentLikeResponse(
        id=like.id,
        comment_id=like.comment_id,
        user_id=like.user_id,
        reaction_type=like.reaction_type,
        created_at=like.created_at,
        user=(
            PostAuthor(
                id=like.user.id,
                nickname=like.user.nickname,
                username=(
                    like.user.username
                    if UserFieldVisibilityService.can_view_field(
                        db, like.user.id, "username", user_id, viewer_disease_ids
                    )
                    else None
                ),
                avatar_url=(
                    like.user.avatar_url
                    if UserFieldVisibilityService.can_view_field(
                        db, like.user.id, "avatar_url", user_id, viewer_disease_ids
                    )
                    else None
                ),
            )
            if like.user
            else None
        ),
    )


@router.delete(
    "/comments/{comment_id}/like",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unlike a comment",
)
async def unlike_comment(
    comment_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Remove like from a comment.
    """
    user_id = get_user_id_from_token(db, current_user)

    success = PostService.unlike_comment(db, comment_id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Like not found",
        )

    return None


@router.get(
    "/comments/{comment_id}/likes",
    response_model=List[PostCommentLikeResponse],
    summary="Get all likes for a comment",
)
async def get_comment_likes(
    comment_id: UUID,
    skip: int = Query(0, ge=0, description="Number of likes to skip"),
    limit: int = Query(
        50, ge=1, le=100, description="Maximum number of likes to return"
    ),
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Get all likes for a comment.
    """
    likes = PostService.get_comment_likes(db, comment_id, skip, limit)
    current_user_id = get_user_id_from_token(db, current_user)

    # Get viewer's disease IDs for field visibility checks
    from app.schemas.post import PostAuthor
    from app.services.user_field_visibility_service import UserFieldVisibilityService
    from app.models.disease import UserDisease

    viewer_disease_ids = None
    if current_user_id:
        viewer_disease_ids = [
            ud.disease_id
            for ud in db.query(UserDisease)
            .filter(
                UserDisease.user_id == current_user_id,
                UserDisease.is_active == True,
            )
            .all()
        ]

    return [
        PostCommentLikeResponse(
            id=like.id,
            comment_id=like.comment_id,
            user_id=like.user_id,
            reaction_type=like.reaction_type,
            created_at=like.created_at,
            user=(
                PostAuthor(
                    id=like.user.id,
                    nickname=like.user.nickname,
                    username=(
                        like.user.username
                        if UserFieldVisibilityService.can_view_field(
                            db, like.user.id, "username", current_user_id, viewer_disease_ids
                        )
                        else None
                    ),
                    avatar_url=(
                        like.user.avatar_url
                        if UserFieldVisibilityService.can_view_field(
                            db, like.user.id, "avatar_url", current_user_id, viewer_disease_ids
                        )
                        else None
                    ),
                )
                if like.user
                else None
            ),
        )
        for like in likes
    ]


# ========== Helper Functions ==========


def _build_post_response(
    db: Session, post, current_user_id: Optional[UUID]
) -> PostResponse:
    """Build PostResponse with calculated fields (non-optimized version for single post)."""
    from app.schemas.post import (
        HashtagResponse,
        MentionResponse,
        PostAuthor,
        PostImageResponse,
    )
    from app.services.mention_service import MentionService
    from app.services.user_field_visibility_service import UserFieldVisibilityService
    from app.models.disease import UserDisease

    like_count = PostService.get_like_count(db, post.id)
    comment_count = PostService.get_comment_count(db, post.id)
    is_liked = (
        PostService.is_liked_by_user(db, post.id, current_user_id)
        if current_user_id
        else False
    )

    # Get viewer's disease IDs for field visibility checks
    viewer_disease_ids = None
    if current_user_id:
        viewer_disease_ids = [
            ud.disease_id
            for ud in db.query(UserDisease)
            .filter(
                UserDisease.user_id == current_user_id,
                UserDisease.is_active == True,
            )
            .all()
        ]

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
            username=(
                user.username
                if UserFieldVisibilityService.can_view_field(
                    db, user.id, "username", current_user_id, viewer_disease_ids
                )
                else None
            ),
            avatar_url=(
                user.avatar_url
                if UserFieldVisibilityService.can_view_field(
                    db, user.id, "avatar_url", current_user_id, viewer_disease_ids
                )
                else None
            ),
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

    # Build author with field visibility checks
    author = None
    if post.user:
        author = PostAuthor(
            id=post.user.id,
            nickname=post.user.nickname,
            username=(
                post.user.username
                if UserFieldVisibilityService.can_view_field(
                    db, post.user.id, "username", current_user_id, viewer_disease_ids
                )
                else None
            ),
            avatar_url=(
                post.user.avatar_url
                if UserFieldVisibilityService.can_view_field(
                    db, post.user.id, "avatar_url", current_user_id, viewer_disease_ids
                )
                else None
            ),
        )

    return PostResponse(
        id=post.id,
        user_id=post.user_id,
        content=post.content,
        visibility=post.visibility,
        is_active=post.is_active,
        created_at=post.created_at,
        updated_at=post.updated_at,
        author=author,
        like_count=like_count,
        comment_count=comment_count,
        is_liked_by_current_user=is_liked,
        hashtags=hashtag_responses,
        mentions=mention_responses,
        images=image_responses,
    )


def _build_post_response_optimized(
    db: Session,
    post,
    current_user_id: Optional[UUID],
    like_count: int,
    comment_count: int,
    is_liked: bool,
    hashtags: list,
    mentioned_users: list,
    viewer_disease_ids: Optional[List[int]] = None,
) -> PostResponse:
    """
    Build PostResponse with pre-fetched data (optimized version for bulk operations).
    
    This function is optimized for building multiple post responses efficiently by:
    1. Accepting pre-fetched data (like_count, comment_count, hashtags, mentions) to avoid N+1 queries
    2. Using field visibility service to conditionally include username and avatar_url based on privacy settings
    3. Building response objects without additional database queries
    
    Args:
        db: Database session (used for field visibility checks)
        post: Post model instance
        current_user_id: ID of the user viewing the post (None if unauthenticated)
        like_count: Pre-fetched like count for this post
        comment_count: Pre-fetched comment count for this post
        is_liked: Whether the current user has liked this post (pre-fetched)
        hashtags: Pre-fetched list of hashtag objects for this post
        mentioned_users: Pre-fetched list of mentioned user objects
        viewer_disease_ids: List of disease IDs the viewer has (for same_disease_only visibility checks)
    
    Returns:
        PostResponse object with all related data included
    """
    from app.schemas.post import (
        HashtagResponse,
        MentionResponse,
        PostAuthor,
        PostImageResponse,
    )
    from app.services.user_field_visibility_service import UserFieldVisibilityService

    hashtag_responses = [
        HashtagResponse(
            id=hashtag.id,
            name=hashtag.name,
            created_at=hashtag.created_at,
        )
        for hashtag in hashtags
    ]

    mention_responses = [
        MentionResponse(
            id=user.id,
            nickname=user.nickname,
            username=(
                user.username
                if UserFieldVisibilityService.can_view_field(
                    db, user.id, "username", current_user_id, viewer_disease_ids
                )
                else None
            ),
            avatar_url=(
                user.avatar_url
                if UserFieldVisibilityService.can_view_field(
                    db, user.id, "avatar_url", current_user_id, viewer_disease_ids
                )
                else None
            ),
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

    # Build author with field visibility checks
    author = None
    if post.user:
        # Check if viewer can see username
        can_view_username = UserFieldVisibilityService.can_view_field(
            db, post.user.id, "username", current_user_id, viewer_disease_ids
        )
        # Check if viewer can see avatar_url
        can_view_avatar = UserFieldVisibilityService.can_view_field(
            db, post.user.id, "avatar_url", current_user_id, viewer_disease_ids
        )
        
        import logging
        logger = logging.getLogger(__name__)
        logger.debug(
            f"[_build_post_response_optimized] Field visibility check: "
            f"post.user.id={post.user.id}, current_user_id={current_user_id}, "
            f"can_view_username={can_view_username}, can_view_avatar={can_view_avatar}, "
            f"post.user.username={post.user.username}"
        )
        
        author = PostAuthor(
            id=post.user.id,
            nickname=post.user.nickname,
            username=post.user.username if can_view_username else None,
            avatar_url=post.user.avatar_url if can_view_avatar else None,
        )

    return PostResponse(
        id=post.id,
        user_id=post.user_id,
        content=post.content,
        visibility=post.visibility,
        is_active=post.is_active,
        created_at=post.created_at,
        updated_at=post.updated_at,
        author=author,
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
    from app.services.user_field_visibility_service import UserFieldVisibilityService
    from app.models.disease import UserDisease

    like_count = PostService.get_like_count(db, post.id)
    comment_count = PostService.get_comment_count(db, post.id)
    is_liked = (
        PostService.is_liked_by_user(db, post.id, current_user_id)
        if current_user_id
        else False
    )

    # Get viewer's disease IDs for field visibility checks
    viewer_disease_ids = None
    if current_user_id:
        viewer_disease_ids = [
            ud.disease_id
            for ud in db.query(UserDisease)
            .filter(
                UserDisease.user_id == current_user_id,
                UserDisease.is_active == True,
            )
            .all()
        ]

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
            username=(
                user.username
                if UserFieldVisibilityService.can_view_field(
                    db, user.id, "username", current_user_id, viewer_disease_ids
                )
                else None
            ),
            avatar_url=(
                user.avatar_url
                if UserFieldVisibilityService.can_view_field(
                    db, user.id, "avatar_url", current_user_id, viewer_disease_ids
                )
                else None
            ),
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
        _build_comment_response(db, comment, current_user_id, viewer_disease_ids)
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
                username=(
                    post.user.username
                    if UserFieldVisibilityService.can_view_field(
                        db, post.user.id, "username", current_user_id, viewer_disease_ids
                    )
                    else None
                ),
                avatar_url=(
                    post.user.avatar_url
                    if UserFieldVisibilityService.can_view_field(
                        db, post.user.id, "avatar_url", current_user_id, viewer_disease_ids
                    )
                    else None
                ),
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


def _build_comment_response(
    db: Session, comment, current_user_id: Optional[UUID] = None, viewer_disease_ids: Optional[List[int]] = None
) -> PostCommentResponse:
    """Build PostCommentResponse with calculated fields."""
    from app.schemas.post import PostAuthor
    from app.services.user_field_visibility_service import UserFieldVisibilityService

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
                username=(
                    comment.user.username
                    if UserFieldVisibilityService.can_view_field(
                        db, comment.user.id, "username", current_user_id, viewer_disease_ids
                    )
                    else None
                ),
                avatar_url=(
                    comment.user.avatar_url
                    if UserFieldVisibilityService.can_view_field(
                        db, comment.user.id, "avatar_url", current_user_id, viewer_disease_ids
                    )
                    else None
                ),
            )
            if comment.user
            else None
        ),
        reply_count=reply_count,
    )
