"""
Block service for business logic related to user blocking.
"""

import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import and_, func
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session, joinedload

from app.models.block import Block
from app.models.user import User

logger = logging.getLogger(__name__)


class BlockService:
    """Service for block/unblock operations."""

    @staticmethod
    def block_user(db: Session, blocker_id: UUID, blocked_id: UUID) -> Optional[Block]:
        """
        Create a block relationship.

        Returns None if:
        - Trying to block yourself
        - User doesn't exist
        - Already blocked

        Also removes any existing follow relationships between the users.
        """
        # Check if trying to block yourself
        if blocker_id == blocked_id:
            return None

        # Check if blocked user exists
        blocked_user = db.query(User).filter(User.id == blocked_id).first()
        if not blocked_user:
            return None

        # Check if already blocked
        try:
            existing_block = (
                db.query(Block)
                .filter(
                    Block.blocker_id == blocker_id,
                    Block.blocked_id == blocked_id,
                )
                .first()
            )
        except ProgrammingError as e:
            # Handle case where blocks table doesn't exist (migration not run)
            if "does not exist" in str(e) or "relation" in str(e).lower():
                logger.error(
                    "blocks table does not exist. Cannot block user. "
                    "Please run database migrations."
                )
                return None
            raise

        if existing_block:
            # If inactive, reactivate
            if not existing_block.is_active:
                existing_block.is_active = True
                existing_block.created_at = datetime.utcnow()
                db.commit()
                db.refresh(existing_block)
                return existing_block
            # Already blocking
            return existing_block

        # Create new block relationship
        try:
            block = Block(
                blocker_id=blocker_id,
                blocked_id=blocked_id,
                is_active=True,
                created_at=datetime.utcnow(),
            )
            db.add(block)
            db.commit()
            db.refresh(block)
        except ProgrammingError as e:
            # Handle case where blocks table doesn't exist (migration not run)
            if "does not exist" in str(e) or "relation" in str(e).lower():
                logger.error(
                    "blocks table does not exist. Cannot block user. "
                    "Please run database migrations."
                )
                db.rollback()
                return None
            raise

        # Remove any existing follow relationships (both directions)
        from app.models.follow import Follow

        # Remove blocker following blocked
        follow1 = (
            db.query(Follow)
            .filter(
                Follow.follower_id == blocker_id,
                Follow.following_id == blocked_id,
                Follow.is_active == True,
            )
            .first()
        )
        if follow1:
            follow1.is_active = False
            db.commit()

        # Remove blocked following blocker
        follow2 = (
            db.query(Follow)
            .filter(
                Follow.follower_id == blocked_id,
                Follow.following_id == blocker_id,
                Follow.is_active == True,
            )
            .first()
        )
        if follow2:
            follow2.is_active = False
            db.commit()

        return block

    @staticmethod
    def unblock_user(db: Session, blocker_id: UUID, blocked_id: UUID) -> bool:
        """
        Remove a block relationship (soft delete).

        Returns True if successful, False if not blocking.
        """
        try:
            block = (
                db.query(Block)
                .filter(
                    Block.blocker_id == blocker_id,
                    Block.blocked_id == blocked_id,
                    Block.is_active == True,
                )
                .first()
            )
        except ProgrammingError as e:
            # Handle case where blocks table doesn't exist (migration not run)
            if "does not exist" in str(e) or "relation" in str(e).lower():
                logger.warning(
                    "blocks table does not exist, returning False. "
                    "Please run database migrations."
                )
                return False
            raise

        if not block:
            return False

        # Soft delete
        try:
            block.is_active = False
            db.commit()
            return True
        except ProgrammingError as e:
            # Handle case where blocks table doesn't exist (migration not run)
            if "does not exist" in str(e) or "relation" in str(e).lower():
                logger.error(
                    "blocks table does not exist. Cannot unblock user. "
                    "Please run database migrations."
                )
                db.rollback()
                return False
            raise

    @staticmethod
    def is_blocked(db: Session, blocker_id: UUID, blocked_id: UUID) -> bool:
        """Check if blocker_id is blocking blocked_id."""
        try:
            return (
                db.query(Block)
                .filter(
                    Block.blocker_id == blocker_id,
                    Block.blocked_id == blocked_id,
                    Block.is_active == True,
                )
                .first()
                is not None
            )
        except ProgrammingError as e:
            # Handle case where blocks table doesn't exist (migration not run)
            if "does not exist" in str(e) or "relation" in str(e).lower():
                logger.warning(
                    "blocks table does not exist, returning False. "
                    "Please run database migrations."
                )
                return False
            raise

    @staticmethod
    def is_blocked_by(db: Session, user_id: UUID, other_user_id: UUID) -> bool:
        """
        Check if user_id is blocked by other_user_id.

        This checks if other_user_id has blocked user_id.
        """
        try:
            return (
                db.query(Block)
                .filter(
                    Block.blocker_id == other_user_id,
                    Block.blocked_id == user_id,
                    Block.is_active == True,
                )
                .first()
                is not None
            )
        except ProgrammingError as e:
            # Handle case where blocks table doesn't exist (migration not run)
            if "does not exist" in str(e) or "relation" in str(e).lower():
                logger.warning(
                    "blocks table does not exist, returning False. "
                    "Please run database migrations."
                )
                return False
            raise

    @staticmethod
    def are_blocked(db: Session, user1_id: UUID, user2_id: UUID) -> bool:
        """
        Check if two users have blocked each other (either direction).

        Returns True if either user has blocked the other.
        """
        return BlockService.is_blocked(
            db, user1_id, user2_id
        ) or BlockService.is_blocked(db, user2_id, user1_id)

    @staticmethod
    def get_blocked_users(
        db: Session, blocker_id: UUID, skip: int = 0, limit: int = 50
    ) -> List[Block]:
        """
        Get list of users blocked by blocker_id.

        Returns list of Block relationships.
        """
        try:
            return (
                db.query(Block)
                .filter(Block.blocker_id == blocker_id, Block.is_active == True)
                .order_by(Block.created_at.desc())
                .offset(skip)
                .limit(limit)
                .all()
            )
        except ProgrammingError as e:
            # Handle case where blocks table doesn't exist (migration not run)
            if "does not exist" in str(e) or "relation" in str(e).lower():
                logger.warning(
                    "blocks table does not exist, returning empty list. "
                    "Please run database migrations."
                )
                return []
            raise

    @staticmethod
    def get_blocked_users_count(db: Session, blocker_id: UUID) -> int:
        """Get count of users blocked by blocker_id."""
        try:
            return (
                db.query(Block)
                .filter(Block.blocker_id == blocker_id, Block.is_active == True)
                .count()
            )
        except ProgrammingError as e:
            # Handle case where blocks table doesn't exist (migration not run)
            if "does not exist" in str(e) or "relation" in str(e).lower():
                logger.warning(
                    "blocks table does not exist, returning 0. "
                    "Please run database migrations."
                )
                return 0
            raise
