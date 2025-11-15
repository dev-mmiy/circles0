"""
Hashtag service for business logic related to hashtags.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.hashtag import Hashtag, PostHashtag
from app.utils.hashtag import extract_hashtags, normalize_hashtag


class HashtagService:
    """Service for hashtag-related operations."""

    @staticmethod
    def get_or_create_hashtag(db: Session, name: str) -> Hashtag:
        """
        Get an existing hashtag or create a new one.

        Args:
            db: Database session.
            name: Hashtag name (will be normalized).

        Returns:
            The Hashtag instance.
        """
        normalized_name = normalize_hashtag(name)

        # Try to find existing hashtag
        hashtag = db.query(Hashtag).filter(
            func.lower(Hashtag.name) == normalized_name
        ).first()

        if not hashtag:
            # Create new hashtag
            hashtag = Hashtag(name=normalized_name)
            db.add(hashtag)
            db.flush()  # Flush to get the ID without committing

        return hashtag

    @staticmethod
    def extract_and_create_hashtags(
        db: Session, post_id: UUID, content: str
    ) -> List[PostHashtag]:
        """
        Extract hashtags from content and create associations with a post.

        Args:
            db: Database session.
            post_id: The post ID to associate hashtags with.
            content: The post content to extract hashtags from.

        Returns:
            List of PostHashtag instances created.
        """
        hashtag_names = extract_hashtags(content)
        post_hashtags = []

        for name in hashtag_names:
            hashtag = HashtagService.get_or_create_hashtag(db, name)

            # Check if association already exists
            existing = db.query(PostHashtag).filter(
                PostHashtag.post_id == post_id,
                PostHashtag.hashtag_id == hashtag.id
            ).first()

            if not existing:
                post_hashtag = PostHashtag(
                    post_id=post_id,
                    hashtag_id=hashtag.id
                )
                db.add(post_hashtag)
                post_hashtags.append(post_hashtag)

        return post_hashtags

    @staticmethod
    def get_hashtags_for_post(db: Session, post_id: UUID) -> List[Hashtag]:
        """
        Get all hashtags for a post.

        Args:
            db: Database session.
            post_id: The post ID.

        Returns:
            List of Hashtag instances.
        """
        post_hashtags = db.query(PostHashtag).filter(
            PostHashtag.post_id == post_id
        ).all()

        return [ph.hashtag for ph in post_hashtags]

    @staticmethod
    def search_hashtags(db: Session, query: str, limit: int = 20) -> List[Hashtag]:
        """
        Search hashtags by name.

        Args:
            db: Database session.
            query: Search query (partial match, case-insensitive).
            limit: Maximum number of results.

        Returns:
            List of matching Hashtag instances.
        """
        normalized_query = normalize_hashtag(query)
        hashtags = db.query(Hashtag).filter(
            Hashtag.name.ilike(f'%{normalized_query}%')
        ).limit(limit).all()

        return hashtags

    @staticmethod
    def get_popular_hashtags(db: Session, limit: int = 20) -> List[Hashtag]:
        """
        Get most popular hashtags (by number of posts).

        Args:
            db: Database session.
            limit: Maximum number of results.

        Returns:
            List of Hashtag instances ordered by popularity.
        """
        hashtags = db.query(Hashtag).join(PostHashtag).group_by(
            Hashtag.id
        ).order_by(
            func.count(PostHashtag.id).desc()
        ).limit(limit).all()

        return hashtags

    @staticmethod
    def delete_post_hashtags(db: Session, post_id: UUID) -> None:
        """
        Delete all hashtag associations for a post.

        Args:
            db: Database session.
            post_id: The post ID.
        """
        db.query(PostHashtag).filter(PostHashtag.post_id == post_id).delete()

