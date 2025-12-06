"""
Post service for business logic related to posts, likes, and comments.
"""

from datetime import datetime
import logging
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import and_, desc, func, or_
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session, joinedload

from app.models.disease import UserDisease

logger = logging.getLogger(__name__)
from app.models.hashtag import Hashtag, PostHashtag
from app.models.mention import PostMention
from app.models.post import Post, PostComment, PostCommentImage, PostCommentLike, PostImage, PostLike, SavedPost
from app.models.user import User
from app.schemas.post import (
    PostCommentCreate,
    PostCommentLikeCreate,
    PostCommentUpdate,
    PostCreate,
    PostLikeCreate,
    PostUpdate,
)
from app.services.notification_service import NotificationService


class PostService:
    """Service for post-related operations."""

    @staticmethod
    def create_post(db: Session, user_id: UUID, post_data: PostCreate) -> Post:
        """Create a new post."""
        post = Post(
            user_id=user_id,
            content=post_data.content,
            visibility=post_data.visibility,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(post)
        db.commit()
        db.refresh(post)

        # Create post images if provided
        if post_data.image_urls:
            for index, image_url in enumerate(post_data.image_urls[:10]):  # Max 10 images
                post_image = PostImage(
                    post_id=post.id,
                    image_url=image_url,
                    display_order=index,
                    created_at=datetime.utcnow(),
                )
                db.add(post_image)
            db.commit()

        return post

    @staticmethod
    def get_post_by_id(
        db: Session, post_id: UUID, current_user_id: Optional[UUID] = None
    ) -> Optional[Post]:
        """
        Get a post by ID with author information.

        Respects visibility settings:
        - Public posts: visible to everyone
        - Followers_only: visible to followers (follow relationship check implemented)
        - Private: visible only to author
        """
        query = (
            db.query(Post)
            .options(
                joinedload(Post.user),
                joinedload(Post.likes).joinedload(PostLike.user),
                joinedload(Post.comments).joinedload(PostComment.user),
                joinedload(Post.mentions).joinedload(PostMention.mentioned_user),
                joinedload(Post.images),
            )
            .filter(Post.id == post_id, Post.is_active == True)
        )

        post = query.first()

        if not post:
            return None

        # Check visibility permissions
        if post.visibility == "private" and post.user_id != current_user_id:
            return None

        # Check followers_only visibility
        if post.visibility == "followers_only":
            if current_user_id is None:
                # Unauthenticated users cannot see followers_only posts
                return None
            elif post.user_id == current_user_id:
                # Users can always see their own posts
                pass
            else:
                # Check if current user is following the post author
                from app.services.follow_service import FollowService
                if not FollowService.is_following(db, current_user_id, post.user_id):
                    return None

        return post

    @staticmethod
    def get_user_posts(
        db: Session,
        user_id: UUID,
        current_user_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> List[Post]:
        """Get posts by a specific user, respecting visibility settings."""
        # Optimize: Only load user and images (likes/comments counts are fetched separately)
        query = (
            db.query(Post)
            .options(
                joinedload(Post.user),
                joinedload(Post.images),
            )
            .filter(Post.user_id == user_id, Post.is_active == True)
        )

        # Visibility filtering
        if current_user_id == user_id:
            # User viewing their own posts - show all
            pass
        elif current_user_id:
            # Authenticated user viewing another user's posts
            # Check if current user is following the post author
            from app.services.follow_service import FollowService
            is_following = FollowService.is_following(db, current_user_id, user_id)
            
            if is_following:
                # Show public and followers_only posts
                query = query.filter(
                    or_(
                        Post.visibility == "public",
                        Post.visibility == "followers_only",
                    )
                )
            else:
                # Only show public posts if not following
                query = query.filter(Post.visibility == "public")
        else:
            # Unauthenticated user - only public posts
            query = query.filter(Post.visibility == "public")

        posts = query.order_by(desc(Post.created_at)).offset(skip).limit(limit).all()

        # Optimize: Filter out blocked users in a single query instead of N+1
        if current_user_id and current_user_id != user_id and posts:
            from app.models.block import Block

            # Get all blocked user IDs (both directions) in one query
            blocked_user_ids = set()
            blocked_relationships = (
                db.query(Block)
                .filter(
                    or_(
                        Block.blocker_id == current_user_id,
                        Block.blocked_id == current_user_id,
                    ),
                    Block.is_active == True,
                )
                .all()
            )
            for block in blocked_relationships:
                if block.blocker_id == current_user_id:
                    blocked_user_ids.add(block.blocked_id)
                else:
                    blocked_user_ids.add(block.blocker_id)

            # Filter posts in memory (much faster than N queries)
            posts = [post for post in posts if post.user_id not in blocked_user_ids]

        return posts

    @staticmethod
    def get_feed(
        db: Session,
        current_user_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 20,
        filter_type: str = "all",
        disease_id: Optional[int] = None,
    ) -> List[Post]:
        """
        Get feed of posts for the current user.

        Args:
            filter_type: "all" for all posts, "following" for posts from followed users only, "following_and_my_posts" for posts from followed users and current user, "not_following" for posts from users not being followed, "disease" for posts from users with specific disease, "my_posts" for current user's posts only
            disease_id: Disease ID to filter by (required when filter_type="disease")

        If authenticated:
            - filter_type="all": public posts + followers_only posts from followed users
            - filter_type="following": posts from followed users only (public + followers_only)
            - filter_type="following_and_my_posts": posts from followed users and current user (public + followers_only)
            - filter_type="not_following": posts from users not being followed (excludes followed users and current user)
            - filter_type="disease": posts from users who have the specified disease (public + followers_only from followed users)
            - filter_type="my_posts": posts from current user only (all visibility levels)
        If not authenticated: only public posts
        """
        from app.models.follow import Follow

        # Optimize: Only load user and images (likes/comments counts are fetched separately)
        query = (
            db.query(Post)
            .options(
                joinedload(Post.user),
                joinedload(Post.images),
            )
            .filter(Post.is_active == True)
        )

        # Step 1: Filter by disease if specified
        # When disease_id is provided, we only show posts from users who have that disease
        # and have made it public and searchable (or current user's own disease)
        if disease_id is not None:
            # Get user IDs that have this disease (public and searchable)
            # This query is executed once and cached in disease_user_ids list
            # Include current user's disease even if not public/searchable
            user_diseases_query = (
                db.query(UserDisease.user_id)
                .filter(
                    UserDisease.disease_id == disease_id,
                    UserDisease.is_active == True,
                )
            )
            
            # If current_user_id is set, include their disease even if not public/searchable
            if current_user_id:
                user_diseases_query = user_diseases_query.filter(
                    or_(
                        and_(
                            UserDisease.is_public == True,
                            UserDisease.is_searchable == True,
                        ),
                        UserDisease.user_id == current_user_id,
                    )
                )
            else:
                # For unauthenticated users, only show public and searchable diseases
                user_diseases_query = user_diseases_query.filter(
                    UserDisease.is_public == True,
                    UserDisease.is_searchable == True,
                )
            
            user_diseases = user_diseases_query.all()
            disease_user_ids = [ud[0] for ud in user_diseases]

            if not disease_user_ids:
                # No users have this disease, return empty result early
                return []

            # Filter posts to only those from users with this disease
            query = query.filter(Post.user_id.in_(disease_user_ids))

        # Step 2: Get following user IDs once if needed (optimization to avoid repeated queries)
        # This list is used to determine which users' followers_only posts should be shown
        following_user_ids = []
        if current_user_id:
            if filter_type in ("following", "all", "disease", "following_and_my_posts", "not_following"):
                # Get list of user IDs that current user is following (executed once)
                # This avoids querying the follow relationship multiple times
                following_ids = (
                    db.query(Follow.following_id)
                    .filter(
                        Follow.follower_id == current_user_id,
                        Follow.is_active == True,
                    )
                    .all()
                )
                following_user_ids = [f[0] for f in following_ids]

        # Step 3: Apply visibility and filter_type filters
        if current_user_id:
            if filter_type == "my_posts":
                # Show only posts from current user (all visibility levels)
                query = query.filter(Post.user_id == current_user_id)
            elif filter_type == "following":
                if following_user_ids:
                    # Show posts from followed users only (public + followers_only)
                    # Users can see public posts and followers_only posts from users they follow
                    query = query.filter(
                        Post.user_id.in_(following_user_ids),
                        or_(
                            Post.visibility == "public",
                            Post.visibility == "followers_only",
                        ),
                    )
                else:
                    # User is not following anyone, return empty result early
                    return []
            elif filter_type == "following_and_my_posts":
                # Show posts from followed users and current user (public + followers_only)
                user_ids_to_show = following_user_ids.copy()
                user_ids_to_show.append(current_user_id)
                if user_ids_to_show:
                    query = query.filter(
                        Post.user_id.in_(user_ids_to_show),
                        or_(
                            Post.visibility == "public",
                            Post.visibility == "followers_only",
                            Post.user_id == current_user_id,  # Show all visibility levels for own posts
                        ),
                    )
                else:
                    # User is not following anyone and has no posts, return empty result early
                    return []
            elif filter_type == "not_following":
                # Show posts from users not being followed (excludes followed users and current user)
                # Visibility logic: public posts only (since we don't follow these users)
                excluded_user_ids = list(following_user_ids)
                excluded_user_ids.append(current_user_id)
                query = query.filter(
                    ~Post.user_id.in_(excluded_user_ids),
                    Post.visibility == "public",
                )
            else:
                # filter_type="all" or "disease": show public posts + followers_only posts from followed users
                # Visibility logic:
                # - Public posts: visible to everyone
                # - Followers_only posts: only visible if current user follows the post author
                query = query.filter(
                    or_(
                        Post.visibility == "public",
                        and_(
                            Post.visibility == "followers_only",
                            Post.user_id.in_(following_user_ids),
                        ),
                    )
                )
        else:
            # Unauthenticated user - only public posts are visible
            query = query.filter(Post.visibility == "public")

        # Step 4: Execute query with pagination
        posts = query.order_by(desc(Post.created_at)).offset(skip).limit(limit).all()

        # Step 5: Filter out blocked users (optimization to avoid N+1 queries)
        # 
        # Performance Optimization: Instead of checking block status for each post individually,
        # we use a bulk approach:
        # 1. Query all block relationships for current user in one query (both directions)
        # 2. Build a set of blocked user IDs for O(1) lookup
        # 3. Filter posts in memory using set lookup (O(1) per post, O(n) total)
        #
        # Without this optimization:
        # - For 20 posts, we would execute 20 queries (one per post to check block status)
        # - This results in 20+ database queries for a single feed request
        #
        # With this optimization:
        # - We execute only 1 query to get all block relationships
        # - We filter posts in memory using set lookup (much faster than database queries)
        #
        # Block relationships are bidirectional:
        # - If user A blocks user B, user B's posts won't appear in user A's feed
        # - If user B blocks user A, user A's posts won't appear in user B's feed
        # - We check both directions to ensure proper filtering
        if current_user_id and posts:
            from app.models.block import Block

            # Get all blocked user IDs (both directions) in one query
            # This includes both users that current_user blocked and users that blocked current_user
            blocked_user_ids = set()
            blocked_relationships = (
                db.query(Block)
                .filter(
                    or_(
                        Block.blocker_id == current_user_id,
                        Block.blocked_id == current_user_id,
                    ),
                    Block.is_active == True,
                )
                .all()
            )
            # Build set of blocked user IDs (the "other" user in each block relationship)
            for block in blocked_relationships:
                if block.blocker_id == current_user_id:
                    # Current user blocked this user
                    blocked_user_ids.add(block.blocked_id)
                else:
                    # This user blocked current user
                    blocked_user_ids.add(block.blocker_id)

            # Filter posts in memory (much faster than N queries)
            # Set lookup is O(1), so this is O(n) where n is number of posts
            posts = [post for post in posts if post.user_id not in blocked_user_ids]

        return posts

    @staticmethod
    def get_posts_by_hashtag(
        db: Session,
        hashtag_name: str,
        current_user_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> List[Post]:
        """
        Get posts by hashtag name.

        Args:
            db: Database session
            hashtag_name: Hashtag name (without #)
            current_user_id: Current user ID for visibility filtering
            skip: Number of posts to skip
            limit: Maximum number of posts to return

        Returns:
            List of posts that contain the specified hashtag
        """
        from app.models.follow import Follow
        from app.utils.hashtag import normalize_hashtag

        # Normalize hashtag name
        normalized_name = normalize_hashtag(hashtag_name)

        # Find hashtag
        hashtag = (
            db.query(Hashtag)
            .filter(func.lower(Hashtag.name) == normalized_name)
            .first()
        )

        if not hashtag:
            return []

        # Get post IDs that have this hashtag
        post_ids = [
            ph.post_id
            for ph in db.query(PostHashtag)
            .filter(PostHashtag.hashtag_id == hashtag.id)
            .all()
        ]

        if not post_ids:
            return []

        # Build query with visibility filtering
        query = (
            db.query(Post)
            .options(
                joinedload(Post.user),
                joinedload(Post.likes),
                joinedload(Post.comments),
                joinedload(Post.images),
            )
            .filter(Post.id.in_(post_ids), Post.is_active == True)
        )

        # Apply visibility filtering (similar to get_feed)
        if current_user_id:
            # Get list of user IDs that current user is following
            following_ids = (
                db.query(Follow.following_id)
                .filter(
                    Follow.follower_id == current_user_id,
                    Follow.is_active == True,
                )
                .all()
            )
            following_user_ids = [f[0] for f in following_ids]

            # Show public posts OR followers_only posts from followed users
            query = query.filter(
                or_(
                    Post.visibility == "public",
                    and_(
                        Post.visibility == "followers_only",
                        Post.user_id.in_(following_user_ids),
                    ),
                )
            )
        else:
            # Unauthenticated user - only public posts
            query = query.filter(Post.visibility == "public")

        posts = query.order_by(desc(Post.created_at)).offset(skip).limit(limit).all()

        # Filter out posts from blocked users if current_user_id exists
        if current_user_id:
            from app.services.block_service import BlockService

            filtered_posts = []
            for post in posts:
                # Check if current user has blocked the post author or vice versa
                if not BlockService.are_blocked(db, current_user_id, post.user_id):
                    filtered_posts.append(post)
            posts = filtered_posts

        return posts

    @staticmethod
    def update_post(
        db: Session, post_id: UUID, user_id: UUID, post_data: PostUpdate
    ) -> Optional[Post]:
        """Update a post. Only the author can update their post."""
        post = (
            db.query(Post).filter(Post.id == post_id, Post.user_id == user_id).first()
        )

        if not post:
            return None

        # Update fields if provided
        if post_data.content is not None:
            post.content = post_data.content
        if post_data.visibility is not None:
            post.visibility = post_data.visibility
        if post_data.is_active is not None:
            post.is_active = post_data.is_active

        # Update images if provided
        if post_data.image_urls is not None:
            # Delete existing images
            db.query(PostImage).filter(PostImage.post_id == post_id).delete()

            # Create new images
            for index, image_url in enumerate(post_data.image_urls[:10]):  # Max 10 images
                post_image = PostImage(
                    post_id=post.id,
                    image_url=image_url,
                    display_order=index,
                    created_at=datetime.utcnow(),
                )
                db.add(post_image)

        post.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(post)
        return post

    @staticmethod
    def delete_post(db: Session, post_id: UUID, user_id: UUID) -> bool:
        """
        Soft delete a post. Only the author can delete their post.

        Returns True if successful, False otherwise.
        """
        post = (
            db.query(Post).filter(Post.id == post_id, Post.user_id == user_id).first()
        )

        if not post:
            return False

        post.is_active = False
        post.updated_at = datetime.utcnow()

        db.commit()
        return True

    # ========== Post Likes ==========

    @staticmethod
    def like_post(
        db: Session, post_id: UUID, user_id: UUID, like_data: PostLikeCreate
    ) -> Optional[PostLike]:
        """
        Like a post. If already liked, update the reaction type.
        Returns None if post doesn't exist or is not accessible.
        """
        # Check if post exists and is accessible
        post = PostService.get_post_by_id(db, post_id, user_id)
        if not post:
            return None

        # Check if already liked
        existing_like = (
            db.query(PostLike)
            .filter(PostLike.post_id == post_id, PostLike.user_id == user_id)
            .first()
        )

        if existing_like:
            # Update reaction type
            existing_like.reaction_type = like_data.reaction_type
            db.commit()
            db.refresh(existing_like)
            return existing_like

        # Create new like
        like = PostLike(
            post_id=post_id,
            user_id=user_id,
            reaction_type=like_data.reaction_type,
            created_at=datetime.utcnow(),
        )
        db.add(like)
        db.commit()
        db.refresh(like)

        # Create notification for the post author
        NotificationService.create_like_notification(
            db=db,
            liker_id=user_id,
            post_id=post_id,
        )

        return like

    @staticmethod
    def unlike_post(db: Session, post_id: UUID, user_id: UUID) -> bool:
        """
        Remove like from a post.
        Returns True if successful, False if like didn't exist.
        """
        like = (
            db.query(PostLike)
            .filter(PostLike.post_id == post_id, PostLike.user_id == user_id)
            .first()
        )

        if not like:
            return False

        db.delete(like)
        db.commit()
        return True

    @staticmethod
    def get_post_likes(
        db: Session, post_id: UUID, skip: int = 0, limit: int = 50
    ) -> List[PostLike]:
        """Get all likes for a post with user information."""
        return (
            db.query(PostLike)
            .options(joinedload(PostLike.user))
            .filter(PostLike.post_id == post_id)
            .order_by(desc(PostLike.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    # ========== Post Comments ==========

    @staticmethod
    def create_comment(
        db: Session, post_id: UUID, user_id: UUID, comment_data: PostCommentCreate
    ) -> Optional[PostComment]:
        """
        Create a comment on a post.
        Returns None if post doesn't exist or is not accessible.
        """
        # Check if post exists and is accessible
        post = PostService.get_post_by_id(db, post_id, user_id)
        if not post:
            return None

        # If parent_comment_id is provided, verify it exists and belongs to the same post
        if comment_data.parent_comment_id:
            parent_comment = (
                db.query(PostComment)
                .filter(
                    PostComment.id == comment_data.parent_comment_id,
                    PostComment.post_id == post_id,
                    PostComment.is_active == True,
                )
                .first()
            )
            if not parent_comment:
                return None

        comment = PostComment(
            post_id=post_id,
            user_id=user_id,
            parent_comment_id=comment_data.parent_comment_id,
            content=comment_data.content,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(comment)
        db.commit()
        db.refresh(comment)

        # Create comment images if provided
        if comment_data.image_urls:
            for index, image_url in enumerate(comment_data.image_urls[:5]):  # Max 5 images
                comment_image = PostCommentImage(
                    comment_id=comment.id,
                    image_url=image_url,
                    display_order=index,
                    created_at=datetime.utcnow(),
                )
                db.add(comment_image)
            db.commit()

        # Create notification
        if comment_data.parent_comment_id:
            # This is a reply to a comment - notify the parent comment author
            NotificationService.create_reply_notification(
                db=db,
                replier_id=user_id,
                parent_comment_id=comment_data.parent_comment_id,
                reply_comment_id=comment.id,
            )
        else:
            # This is a top-level comment - notify the post author
            NotificationService.create_comment_notification(
                db=db,
                commenter_id=user_id,
                post_id=post_id,
                comment_id=comment.id,
            )

        return comment

    @staticmethod
    def get_post_comments(
        db: Session, post_id: UUID, skip: int = 0, limit: int = 50
    ) -> List[PostComment]:
        """
        Get top-level comments for a post with author information.
        Does not include nested replies - those are fetched separately or via relationships.
        """
        return (
            db.query(PostComment)
            .options(
                joinedload(PostComment.user),
                joinedload(PostComment.replies),
                joinedload(PostComment.images),
            )
            .filter(
                PostComment.post_id == post_id,
                PostComment.parent_comment_id.is_(None),
                PostComment.is_active == True,
            )
            .order_by(desc(PostComment.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_comment_replies(
        db: Session, comment_id: UUID, skip: int = 0, limit: int = 20
    ) -> List[PostComment]:
        """Get replies to a specific comment."""
        return (
            db.query(PostComment)
            .options(
                joinedload(PostComment.user),
                joinedload(PostComment.images),
            )
            .filter(
                PostComment.parent_comment_id == comment_id,
                PostComment.is_active == True,
            )
            .order_by(PostComment.created_at)
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def update_comment(
        db: Session, comment_id: UUID, user_id: UUID, comment_data: PostCommentUpdate
    ) -> Optional[PostComment]:
        """Update a comment. Only the author can update their comment."""
        comment = (
            db.query(PostComment)
            .filter(PostComment.id == comment_id, PostComment.user_id == user_id)
            .first()
        )

        if not comment:
            return None

        # Update fields if provided
        if comment_data.content is not None:
            comment.content = comment_data.content
        if comment_data.is_active is not None:
            comment.is_active = comment_data.is_active

        comment.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(comment)
        return comment

    @staticmethod
    def delete_comment(db: Session, comment_id: UUID, user_id: UUID) -> bool:
        """
        Soft delete a comment. Only the author can delete their comment.
        Returns True if successful, False otherwise.
        """
        comment = (
            db.query(PostComment)
            .filter(PostComment.id == comment_id, PostComment.user_id == user_id)
            .first()
        )

        if not comment:
            return False

        comment.is_active = False
        comment.updated_at = datetime.utcnow()

        db.commit()
        return True

    # ========== Helper Methods ==========

    @staticmethod
    def get_like_count(db: Session, post_id: UUID) -> int:
        """Get the number of likes for a post."""
        return (
            db.query(func.count(PostLike.id))
            .filter(PostLike.post_id == post_id)
            .scalar()
        )

    @staticmethod
    def get_comment_count(db: Session, post_id: UUID) -> int:
        """Get the number of comments for a post."""
        return (
            db.query(func.count(PostComment.id))
            .filter(PostComment.post_id == post_id, PostComment.is_active == True)
            .scalar()
        )

    @staticmethod
    def is_liked_by_user(db: Session, post_id: UUID, user_id: UUID) -> bool:
        """Check if a post is liked by a specific user."""
        return (
            db.query(PostLike)
            .filter(PostLike.post_id == post_id, PostLike.user_id == user_id)
            .first()
            is not None
        )

    @staticmethod
    def get_reply_count(db: Session, comment_id: UUID) -> int:
        """Get the number of replies to a comment."""
        return (
            db.query(func.count(PostComment.id))
            .filter(
                PostComment.parent_comment_id == comment_id,
                PostComment.is_active == True,
            )
            .scalar()
        )

    # ========== Post Comment Likes ==========

    @staticmethod
    def like_comment(
        db: Session, comment_id: UUID, user_id: UUID, like_data: PostCommentLikeCreate
    ) -> Optional[PostCommentLike]:
        """
        Like a comment. If already liked, update the reaction type.
        Returns None if comment doesn't exist or is not accessible.
        """
        # Check if comment exists and is active
        comment = (
            db.query(PostComment)
            .filter(PostComment.id == comment_id, PostComment.is_active == True)
            .first()
        )
        if not comment:
            return None

        # Check if already liked
        existing_like = (
            db.query(PostCommentLike)
            .filter(PostCommentLike.comment_id == comment_id, PostCommentLike.user_id == user_id)
            .first()
        )

        if existing_like:
            # Update reaction type
            existing_like.reaction_type = like_data.reaction_type
            db.commit()
            db.refresh(existing_like)
            return existing_like

        # Create new like
        like = PostCommentLike(
            comment_id=comment_id,
            user_id=user_id,
            reaction_type=like_data.reaction_type,
            created_at=datetime.utcnow(),
        )
        db.add(like)
        db.commit()
        db.refresh(like)

        # Create notification for the comment author
        NotificationService.create_comment_like_notification(
            db=db,
            liker_id=user_id,
            comment_id=comment_id,
        )

        return like

    @staticmethod
    def unlike_comment(db: Session, comment_id: UUID, user_id: UUID) -> bool:
        """
        Remove like from a comment.
        Returns True if successful, False if like didn't exist.
        """
        like = (
            db.query(PostCommentLike)
            .filter(PostCommentLike.comment_id == comment_id, PostCommentLike.user_id == user_id)
            .first()
        )

        if not like:
            return False

        db.delete(like)
        db.commit()
        return True

    @staticmethod
    def get_comment_likes(
        db: Session, comment_id: UUID, skip: int = 0, limit: int = 50
    ) -> List[PostCommentLike]:
        """Get all likes for a comment with user information."""
        return (
            db.query(PostCommentLike)
            .options(joinedload(PostCommentLike.user))
            .filter(PostCommentLike.comment_id == comment_id)
            .order_by(desc(PostCommentLike.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_comment_like_count(db: Session, comment_id: UUID) -> int:
        """Get the number of likes for a comment."""
        return (
            db.query(func.count(PostCommentLike.id))
            .filter(PostCommentLike.comment_id == comment_id)
            .scalar()
        )

    @staticmethod
    def is_comment_liked_by_user(db: Session, comment_id: UUID, user_id: UUID) -> bool:
        """Check if a comment is liked by a specific user."""
        return (
            db.query(PostCommentLike)
            .filter(PostCommentLike.comment_id == comment_id, PostCommentLike.user_id == user_id)
            .first()
            is not None
        )


class SavedPostService:
    """Service for saved post operations."""
    
    @staticmethod
    def save_post(db: Session, user_id: UUID, post_id: UUID) -> SavedPost:
        """
        Save a post for a user.
        
        Args:
            db: Database session
            user_id: User ID
            post_id: Post ID to save
            
        Returns:
            SavedPost instance
            
        Raises:
            ValueError: If post doesn't exist or is already saved
            ProgrammingError: If saved_posts table doesn't exist (migration not run)
        """
        # Check if post exists and is active
        post = db.query(Post).filter(
            Post.id == post_id,
            Post.is_active == True
        ).first()
        
        if not post:
            raise ValueError("Post not found or inactive")
        
        try:
            # Check if already saved
            existing = db.query(SavedPost).filter(
                SavedPost.user_id == user_id,
                SavedPost.post_id == post_id
            ).first()
            
            if existing:
                raise ValueError("Post already saved")
            
            # Create saved post
            saved_post = SavedPost(
                user_id=user_id,
                post_id=post_id
            )
            db.add(saved_post)
            db.commit()
            db.refresh(saved_post)
            
            return saved_post
        except ProgrammingError as e:
            # Handle case where saved_posts table doesn't exist (migration not run)
            db.rollback()
            if "does not exist" in str(e) or "relation" in str(e).lower():
                logger.error(
                    "saved_posts table does not exist. "
                    "Please run database migrations to enable this feature."
                )
                raise ValueError(
                    "Saved posts feature is not available. "
                    "Database migrations need to be run."
                )
            raise
    
    @staticmethod
    def unsave_post(db: Session, user_id: UUID, post_id: UUID) -> bool:
        """
        Unsave a post for a user.
        
        Args:
            db: Database session
            user_id: User ID
            post_id: Post ID to unsave
            
        Returns:
            True if unsaved, False if not found
            
        Raises:
            ValueError: If saved_posts table doesn't exist (migration not run)
        """
        try:
            saved_post = db.query(SavedPost).filter(
                SavedPost.user_id == user_id,
                SavedPost.post_id == post_id
            ).first()
            
            if not saved_post:
                return False
            
            db.delete(saved_post)
            db.commit()
            return True
        except ProgrammingError as e:
            # Handle case where saved_posts table doesn't exist (migration not run)
            db.rollback()
            if "does not exist" in str(e) or "relation" in str(e).lower():
                logger.error(
                    "saved_posts table does not exist. "
                    "Please run database migrations to enable this feature."
                )
                raise ValueError(
                    "Saved posts feature is not available. "
                    "Database migrations need to be run."
                )
            raise
    
    @staticmethod
    def get_saved_posts(
        db: Session,
        user_id: UUID,
        current_user_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 20,
        sort_by: str = "created_at",  # "created_at" or "post_created_at"
        sort_order: str = "desc"  # "asc" or "desc"
    ) -> Tuple[List[Post], int]:
        """
        Get saved posts for a user.
        
        Args:
            db: Database session
            user_id: User ID to get saved posts for
            current_user_id: Current user ID (for visibility checks)
            skip: Number of posts to skip
            limit: Maximum number of posts to return
            sort_by: Sort by "created_at" (save date) or "post_created_at" (post date)
            sort_order: Sort order "asc" or "desc"
            
        Returns:
            Tuple of (list of posts, total count)
        """
        # Base query
        query = (
            db.query(SavedPost)
            .filter(SavedPost.user_id == user_id)
            .join(Post, SavedPost.post_id == Post.id)
            .filter(Post.is_active == True)
        )
        
        # Get total count
        total = query.count()
        
        # Apply sorting
        if sort_by == "created_at":
            order_column = SavedPost.created_at
        else:  # sort_by == "post_created_at"
            order_column = Post.created_at
        
        if sort_order == "desc":
            query = query.order_by(order_column.desc())
        else:
            query = query.order_by(order_column.asc())
        
        # Apply pagination
        saved_posts = query.offset(skip).limit(limit).all()
        
        # Get post IDs
        post_ids = [sp.post_id for sp in saved_posts]
        
        # Fetch posts with relationships
        posts = (
            db.query(Post)
            .options(
                joinedload(Post.user),
                joinedload(Post.likes).joinedload(PostLike.user),
                joinedload(Post.comments).joinedload(PostComment.user),
                joinedload(Post.images),
            )
            .filter(Post.id.in_(post_ids))
            .all()
        )
        
        # Sort posts to match saved_posts order
        post_dict = {post.id: post for post in posts}
        ordered_posts = [post_dict[post_id] for post_id in post_ids if post_id in post_dict]
        
        # Filter by visibility (same logic as get_feed)
        visible_posts = []
        for post in ordered_posts:
            if post.visibility == "private" and post.user_id != current_user_id:
                continue
            if post.visibility == "followers_only":
                if current_user_id is None:
                    continue
                if post.user_id != current_user_id:
                    from app.services.follow_service import FollowService
                    if not FollowService.is_following(db, current_user_id, post.user_id):
                        continue
            visible_posts.append(post)
        
        # Note: 'total' represents the total number of saved posts (before visibility filtering)
        # The actual number of visible posts may be less than 'total' due to visibility restrictions.
        # This is by design - 'total' helps with pagination of saved posts, while visibility
        # filtering ensures users only see posts they have permission to view.
        return visible_posts, total
    
    @staticmethod
    def is_post_saved(db: Session, user_id: UUID, post_id: UUID) -> bool:
        """
        Check if a post is saved by a user.
        
        Args:
            db: Database session
            user_id: User ID
            post_id: Post ID
            
        Returns:
            True if saved, False otherwise
        """
        try:
            saved_post = db.query(SavedPost).filter(
                SavedPost.user_id == user_id,
                SavedPost.post_id == post_id
            ).first()
            
            return saved_post is not None
        except ProgrammingError as e:
            # Handle case where saved_posts table doesn't exist (migration not run)
            # IMPORTANT: Rollback the transaction to avoid InFailedSqlTransaction errors
            db.rollback()
            if "does not exist" in str(e) or "relation" in str(e).lower():
                logger.debug(
                    "saved_posts table does not exist, returning False. "
                    "This is expected if migrations have not been run yet."
                )
                return False
            raise
    
    @staticmethod
    def get_saved_post_ids(
        db: Session,
        user_id: UUID,
        post_ids: List[UUID]
    ) -> List[UUID]:
        """
        Get list of post IDs that are saved by the user.
        
        Args:
            db: Database session
            user_id: User ID
            post_ids: List of post IDs to check
            
        Returns:
            List of post IDs that are saved
        """
        saved_posts = (
            db.query(SavedPost.post_id)
            .filter(
                SavedPost.user_id == user_id,
                SavedPost.post_id.in_(post_ids)
            )
            .all()
        )
        
        return [sp.post_id for sp in saved_posts]
