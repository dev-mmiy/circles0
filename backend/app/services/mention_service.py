"""
Mention service for business logic related to mentions.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.mention import CommentMention, PostMention
from app.models.user import User
from app.utils.mention import extract_mentions, normalize_mention


class MentionService:
    """Service for mention-related operations."""

    @staticmethod
    def find_user_by_nickname(db: Session, nickname: str) -> Optional[User]:
        """
        Find a user by nickname (case-insensitive).

        Args:
            db: Database session.
            nickname: The nickname to search for.

        Returns:
            User instance if found, None otherwise.
        """
        from sqlalchemy import func
        
        normalized_nickname = normalize_mention(nickname)
        return db.query(User).filter(
            func.lower(User.nickname) == normalized_nickname
        ).first()

    @staticmethod
    def extract_and_create_mentions(
        db: Session, post_id: UUID, content: str, exclude_user_id: Optional[UUID] = None
    ) -> List[PostMention]:
        """
        Extract mentions from content and create associations with a post.

        Args:
            db: Database session.
            post_id: The post ID to associate mentions with.
            content: The post content to extract mentions from.
            exclude_user_id: User ID to exclude from mentions (e.g., post author).

        Returns:
            List of PostMention instances created.
        """
        from sqlalchemy import func

        mention_names = extract_mentions(content)
        post_mentions = []

        for mention_name in mention_names:
            # Find user by nickname
            user = MentionService.find_user_by_nickname(db, mention_name)
            
            if not user:
                # User not found, skip this mention
                continue
            
            # Skip if this is the post author
            if exclude_user_id and user.id == exclude_user_id:
                continue
            
            # Check if mention already exists
            existing = db.query(PostMention).filter(
                PostMention.post_id == post_id,
                PostMention.mentioned_user_id == user.id
            ).first()

            if not existing:
                post_mention = PostMention(
                    post_id=post_id,
                    mentioned_user_id=user.id
                )
                db.add(post_mention)
                post_mentions.append(post_mention)

        return post_mentions

    @staticmethod
    def extract_and_create_comment_mentions(
        db: Session, comment_id: UUID, content: str, exclude_user_id: Optional[UUID] = None
    ) -> List[CommentMention]:
        """
        Extract mentions from comment content and create associations.

        Args:
            db: Database session.
            comment_id: The comment ID to associate mentions with.
            content: The comment content to extract mentions from.
            exclude_user_id: User ID to exclude from mentions (e.g., comment author).

        Returns:
            List of CommentMention instances created.
        """
        from sqlalchemy import func

        mention_names = extract_mentions(content)
        comment_mentions = []

        for mention_name in mention_names:
            # Find user by nickname
            user = MentionService.find_user_by_nickname(db, mention_name)
            
            if not user:
                # User not found, skip this mention
                continue
            
            # Skip if this is the comment author
            if exclude_user_id and user.id == exclude_user_id:
                continue
            
            # Check if mention already exists
            existing = db.query(CommentMention).filter(
                CommentMention.comment_id == comment_id,
                CommentMention.mentioned_user_id == user.id
            ).first()

            if not existing:
                comment_mention = CommentMention(
                    comment_id=comment_id,
                    mentioned_user_id=user.id
                )
                db.add(comment_mention)
                comment_mentions.append(comment_mention)

        return comment_mentions

    @staticmethod
    def get_mentions_for_post(db: Session, post_id: UUID) -> List[User]:
        """
        Get all users mentioned in a post.

        Args:
            db: Database session.
            post_id: The post ID.

        Returns:
            List of User instances mentioned in the post.
        """
        post_mentions = db.query(PostMention).filter(
            PostMention.post_id == post_id
        ).all()

        return [pm.mentioned_user for pm in post_mentions]

    @staticmethod
    def get_mentions_for_comment(db: Session, comment_id: UUID) -> List[User]:
        """
        Get all users mentioned in a comment.

        Args:
            db: Database session.
            comment_id: The comment ID.

        Returns:
            List of User instances mentioned in the comment.
        """
        comment_mentions = db.query(CommentMention).filter(
            CommentMention.comment_id == comment_id
        ).all()

        return [cm.mentioned_user for cm in comment_mentions]

    @staticmethod
    def delete_post_mentions(db: Session, post_id: UUID) -> None:
        """
        Delete all mention associations for a post.

        Args:
            db: Database session.
            post_id: The post ID.
        """
        db.query(PostMention).filter(PostMention.post_id == post_id).delete()

    @staticmethod
    def delete_comment_mentions(db: Session, comment_id: UUID) -> None:
        """
        Delete all mention associations for a comment.

        Args:
            db: Database session.
            comment_id: The comment ID.
        """
        db.query(CommentMention).filter(CommentMention.comment_id == comment_id).delete()

