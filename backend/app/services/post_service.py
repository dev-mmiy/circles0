"""
Post service for business logic related to posts, likes, and comments.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import and_, desc, func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.post import Post, PostComment, PostLike
from app.models.user import User
from app.schemas.post import (
    PostCommentCreate,
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
        return post

    @staticmethod
    def get_post_by_id(
        db: Session, post_id: UUID, current_user_id: Optional[UUID] = None
    ) -> Optional[Post]:
        """
        Get a post by ID with author information.

        Respects visibility settings:
        - Public posts: visible to everyone
        - Followers_only: visible to followers (TODO: implement follow relationship)
        - Private: visible only to author
        """
        query = (
            db.query(Post)
            .options(
                joinedload(Post.user),
                joinedload(Post.likes).joinedload(PostLike.user),
                joinedload(Post.comments).joinedload(PostComment.user),
            )
            .filter(Post.id == post_id, Post.is_active == True)
        )

        post = query.first()

        if not post:
            return None

        # Check visibility permissions
        if post.visibility == "private" and post.user_id != current_user_id:
            return None

        # TODO: Implement followers_only check when follow feature is implemented
        if post.visibility == "followers_only" and current_user_id is None:
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
        query = (
            db.query(Post)
            .options(
                joinedload(Post.user),
                joinedload(Post.likes),
                joinedload(Post.comments),
            )
            .filter(Post.user_id == user_id, Post.is_active == True)
        )

        # Visibility filtering
        if current_user_id == user_id:
            # User viewing their own posts - show all
            pass
        elif current_user_id:
            # Authenticated user viewing another user's posts
            query = query.filter(
                or_(
                    Post.visibility == "public",
                    Post.visibility == "followers_only",  # TODO: Add follower check
                )
            )
        else:
            # Unauthenticated user - only public posts
            query = query.filter(Post.visibility == "public")

        return query.order_by(desc(Post.created_at)).offset(skip).limit(limit).all()

    @staticmethod
    def get_feed(
        db: Session,
        current_user_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> List[Post]:
        """
        Get feed of posts for the current user.

        If authenticated: public posts + followers_only posts (TODO: from followed users)
        If not authenticated: only public posts
        """
        query = (
            db.query(Post)
            .options(
                joinedload(Post.user),
                joinedload(Post.likes),
                joinedload(Post.comments),
            )
            .filter(Post.is_active == True)
        )

        if current_user_id:
            # Authenticated user - show public and followers_only posts
            # TODO: Filter followers_only to only show from followed users
            query = query.filter(
                or_(
                    Post.visibility == "public",
                    Post.visibility == "followers_only",
                )
            )
        else:
            # Unauthenticated user - only public posts
            query = query.filter(Post.visibility == "public")

        return query.order_by(desc(Post.created_at)).offset(skip).limit(limit).all()

    @staticmethod
    def update_post(
        db: Session, post_id: UUID, user_id: UUID, post_data: PostUpdate
    ) -> Optional[Post]:
        """Update a post. Only the author can update their post."""
        post = db.query(Post).filter(Post.id == post_id, Post.user_id == user_id).first()

        if not post:
            return None

        # Update fields if provided
        if post_data.content is not None:
            post.content = post_data.content
        if post_data.visibility is not None:
            post.visibility = post_data.visibility
        if post_data.is_active is not None:
            post.is_active = post_data.is_active

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
        post = db.query(Post).filter(Post.id == post_id, Post.user_id == user_id).first()

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
            .options(joinedload(PostComment.user), joinedload(PostComment.replies))
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
            .options(joinedload(PostComment.user))
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
        return db.query(func.count(PostLike.id)).filter(PostLike.post_id == post_id).scalar()

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
