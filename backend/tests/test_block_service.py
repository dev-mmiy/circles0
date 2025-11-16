"""
Unit tests for BlockService.
"""

from datetime import datetime
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from app.models.block import Block
from app.models.user import User
from app.services.block_service import BlockService


class TestBlockService:
    """Test cases for BlockService."""

    def test_block_user(self, db_session: Session, test_user: User):
        """Test blocking a user."""
        other_user = User(
            id=uuid4(),
            auth0_id="auth0|other123",
            email="other@example.com",
            email_verified=True,
            nickname="otheruser",
            is_active=True,
        )
        db_session.add(other_user)
        db_session.commit()

        block = BlockService.block_user(db_session, test_user.id, other_user.id)

        assert block is not None
        assert block.blocker_id == test_user.id
        assert block.blocked_id == other_user.id
        assert block.is_active is True

    def test_block_user_self(self, db_session: Session, test_user: User):
        """Test blocking yourself should return None."""
        block = BlockService.block_user(db_session, test_user.id, test_user.id)

        assert block is None

    def test_block_user_not_found(self, db_session: Session, test_user: User):
        """Test blocking a non-existent user should return None."""
        non_existent_id = uuid4()
        block = BlockService.block_user(db_session, test_user.id, non_existent_id)

        assert block is None

    def test_block_user_duplicate(self, db_session: Session, test_user: User):
        """Test blocking a user that's already blocked."""
        other_user = User(
            id=uuid4(),
            auth0_id="auth0|other123",
            email="other@example.com",
            email_verified=True,
            nickname="otheruser",
            is_active=True,
        )
        db_session.add(other_user)
        db_session.commit()

        # Block first time
        block1 = BlockService.block_user(db_session, test_user.id, other_user.id)
        assert block1 is not None

        # Block again (should return existing block)
        block2 = BlockService.block_user(db_session, test_user.id, other_user.id)

        assert block2 is not None
        assert block2.id == block1.id

    def test_unblock_user(self, db_session: Session, test_user: User):
        """Test unblocking a user."""
        other_user = User(
            id=uuid4(),
            auth0_id="auth0|other123",
            email="other@example.com",
            email_verified=True,
            nickname="otheruser",
            is_active=True,
        )
        db_session.add(other_user)
        db_session.commit()

        # Block first
        block = BlockService.block_user(db_session, test_user.id, other_user.id)
        assert block is not None

        # Unblock
        result = BlockService.unblock_user(db_session, test_user.id, other_user.id)

        assert result is True
        # Verify block is inactive
        db_session.refresh(block)
        assert block.is_active is False

    def test_unblock_user_not_blocked(self, db_session: Session, test_user: User):
        """Test unblocking a user that's not blocked."""
        other_user = User(
            id=uuid4(),
            auth0_id="auth0|other123",
            email="other@example.com",
            email_verified=True,
            nickname="otheruser",
            is_active=True,
        )
        db_session.add(other_user)
        db_session.commit()

        result = BlockService.unblock_user(db_session, test_user.id, other_user.id)

        assert result is False

    def test_is_blocked(self, db_session: Session, test_user: User):
        """Test checking if a user is blocked."""
        other_user = User(
            id=uuid4(),
            auth0_id="auth0|other123",
            email="other@example.com",
            email_verified=True,
            nickname="otheruser",
            is_active=True,
        )
        db_session.add(other_user)
        db_session.commit()

        # Initially not blocked
        assert BlockService.is_blocked(db_session, test_user.id, other_user.id) is False

        # Block user
        BlockService.block_user(db_session, test_user.id, other_user.id)

        # Now should be blocked
        assert BlockService.is_blocked(db_session, test_user.id, other_user.id) is True

    def test_is_blocked_by(self, db_session: Session, test_user: User):
        """Test checking if a user is blocked by another user."""
        other_user = User(
            id=uuid4(),
            auth0_id="auth0|other123",
            email="other@example.com",
            email_verified=True,
            nickname="otheruser",
            is_active=True,
        )
        db_session.add(other_user)
        db_session.commit()

        # Initially not blocked
        assert (
            BlockService.is_blocked_by(db_session, test_user.id, other_user.id) is False
        )

        # Block user (other_user blocks test_user)
        BlockService.block_user(db_session, other_user.id, test_user.id)

        # Now should be blocked
        assert (
            BlockService.is_blocked_by(db_session, test_user.id, other_user.id) is True
        )

    def test_are_blocked(self, db_session: Session, test_user: User):
        """Test checking if two users have blocked each other."""
        other_user = User(
            id=uuid4(),
            auth0_id="auth0|other123",
            email="other@example.com",
            email_verified=True,
            nickname="otheruser",
            is_active=True,
        )
        db_session.add(other_user)
        db_session.commit()

        # Initially not blocked
        assert (
            BlockService.are_blocked(db_session, test_user.id, other_user.id) is False
        )

        # Block in one direction
        BlockService.block_user(db_session, test_user.id, other_user.id)

        # Should return True (either direction)
        assert BlockService.are_blocked(db_session, test_user.id, other_user.id) is True

    def test_get_blocked_users(self, db_session: Session, test_user: User):
        """Test getting list of blocked users."""
        other_user1 = User(
            id=uuid4(),
            auth0_id="auth0|other1",
            email="other1@example.com",
            email_verified=True,
            nickname="otheruser1",
            is_active=True,
        )
        other_user2 = User(
            id=uuid4(),
            auth0_id="auth0|other2",
            email="other2@example.com",
            email_verified=True,
            nickname="otheruser2",
            is_active=True,
        )
        db_session.add_all([other_user1, other_user2])
        db_session.commit()

        # Block both users
        BlockService.block_user(db_session, test_user.id, other_user1.id)
        BlockService.block_user(db_session, test_user.id, other_user2.id)

        blocked_users = BlockService.get_blocked_users(db_session, test_user.id)

        assert len(blocked_users) == 2
        blocked_ids = {block.blocked_id for block in blocked_users}
        assert other_user1.id in blocked_ids
        assert other_user2.id in blocked_ids

    def test_get_blocked_users_count(self, db_session: Session, test_user: User):
        """Test getting count of blocked users."""
        other_user1 = User(
            id=uuid4(),
            auth0_id="auth0|other1",
            email="other1@example.com",
            email_verified=True,
            nickname="otheruser1",
            is_active=True,
        )
        other_user2 = User(
            id=uuid4(),
            auth0_id="auth0|other2",
            email="other2@example.com",
            email_verified=True,
            nickname="otheruser2",
            is_active=True,
        )
        db_session.add_all([other_user1, other_user2])
        db_session.commit()

        # Initially no blocked users
        assert BlockService.get_blocked_users_count(db_session, test_user.id) == 0

        # Block users
        BlockService.block_user(db_session, test_user.id, other_user1.id)
        BlockService.block_user(db_session, test_user.id, other_user2.id)

        # Should have 2 blocked users
        assert BlockService.get_blocked_users_count(db_session, test_user.id) == 2
