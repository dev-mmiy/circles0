"""
Unit tests for FollowService.
"""

from datetime import datetime
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from app.models.follow import Follow
from app.models.user import User
from app.services.follow_service import FollowService


class TestFollowService:
    """Test cases for FollowService."""

    def test_follow_user(self, db_session: Session, test_user: User):
        """Test following a user."""
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

        follow = FollowService.follow_user(db_session, test_user.id, other_user.id)

        assert follow is not None
        assert follow.follower_id == test_user.id
        assert follow.following_id == other_user.id
        assert follow.is_active is True

    def test_follow_user_self(self, db_session: Session, test_user: User):
        """Test following yourself should return None."""
        follow = FollowService.follow_user(db_session, test_user.id, test_user.id)

        assert follow is None

    def test_follow_user_not_found(self, db_session: Session, test_user: User):
        """Test following a non-existent user should return None."""
        non_existent_id = uuid4()
        follow = FollowService.follow_user(db_session, test_user.id, non_existent_id)

        assert follow is None

    def test_follow_user_duplicate(self, db_session: Session, test_user: User):
        """Test following a user that's already being followed."""
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

        # Follow first time
        follow1 = FollowService.follow_user(db_session, test_user.id, other_user.id)
        assert follow1 is not None

        # Follow again (should return existing follow)
        follow2 = FollowService.follow_user(db_session, test_user.id, other_user.id)

        assert follow2 is not None
        assert follow2.id == follow1.id

    def test_unfollow_user(self, db_session: Session, test_user: User):
        """Test unfollowing a user."""
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

        # Follow first
        follow = FollowService.follow_user(db_session, test_user.id, other_user.id)
        assert follow is not None

        # Unfollow
        result = FollowService.unfollow_user(db_session, test_user.id, other_user.id)

        assert result is True
        # Verify follow is inactive
        db_session.refresh(follow)
        assert follow.is_active is False

    def test_unfollow_user_not_following(self, db_session: Session, test_user: User):
        """Test unfollowing a user that's not being followed."""
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

        result = FollowService.unfollow_user(db_session, test_user.id, other_user.id)

        assert result is False

    def test_is_following(self, db_session: Session, test_user: User):
        """Test checking if a user is following another user."""
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

        # Initially not following
        assert (
            FollowService.is_following(db_session, test_user.id, other_user.id) is False
        )

        # Follow user
        FollowService.follow_user(db_session, test_user.id, other_user.id)

        # Now should be following
        assert (
            FollowService.is_following(db_session, test_user.id, other_user.id) is True
        )

    def test_get_followers(self, db_session: Session, test_user: User):
        """Test getting list of followers."""
        follower1 = User(
            id=uuid4(),
            auth0_id="auth0|follower1",
            email="follower1@example.com",
            email_verified=True,
            nickname="follower1",
            is_active=True,
        )
        follower2 = User(
            id=uuid4(),
            auth0_id="auth0|follower2",
            email="follower2@example.com",
            email_verified=True,
            nickname="follower2",
            is_active=True,
        )
        db_session.add_all([follower1, follower2])
        db_session.commit()

        # Both users follow test_user
        FollowService.follow_user(db_session, follower1.id, test_user.id)
        FollowService.follow_user(db_session, follower2.id, test_user.id)

        followers = FollowService.get_followers(db_session, test_user.id)

        assert len(followers) == 2
        follower_ids = {follow.follower_id for follow in followers}
        assert follower1.id in follower_ids
        assert follower2.id in follower_ids

    def test_get_following(self, db_session: Session, test_user: User):
        """Test getting list of users being followed."""
        following1 = User(
            id=uuid4(),
            auth0_id="auth0|following1",
            email="following1@example.com",
            email_verified=True,
            nickname="following1",
            is_active=True,
        )
        following2 = User(
            id=uuid4(),
            auth0_id="auth0|following2",
            email="following2@example.com",
            email_verified=True,
            nickname="following2",
            is_active=True,
        )
        db_session.add_all([following1, following2])
        db_session.commit()

        # test_user follows both users
        FollowService.follow_user(db_session, test_user.id, following1.id)
        FollowService.follow_user(db_session, test_user.id, following2.id)

        following = FollowService.get_following(db_session, test_user.id)

        assert len(following) == 2
        following_ids = {follow.following_id for follow in following}
        assert following1.id in following_ids
        assert following2.id in following_ids

    def test_get_follower_count(self, db_session: Session, test_user: User):
        """Test getting count of followers."""
        follower1 = User(
            id=uuid4(),
            auth0_id="auth0|follower1",
            email="follower1@example.com",
            email_verified=True,
            nickname="follower1",
            is_active=True,
        )
        follower2 = User(
            id=uuid4(),
            auth0_id="auth0|follower2",
            email="follower2@example.com",
            email_verified=True,
            nickname="follower2",
            is_active=True,
        )
        db_session.add_all([follower1, follower2])
        db_session.commit()

        # Initially no followers
        assert FollowService.get_follower_count(db_session, test_user.id) == 0

        # Add followers
        FollowService.follow_user(db_session, follower1.id, test_user.id)
        FollowService.follow_user(db_session, follower2.id, test_user.id)

        # Should have 2 followers
        assert FollowService.get_follower_count(db_session, test_user.id) == 2

    def test_get_following_count(self, db_session: Session, test_user: User):
        """Test getting count of users being followed."""
        following1 = User(
            id=uuid4(),
            auth0_id="auth0|following1",
            email="following1@example.com",
            email_verified=True,
            nickname="following1",
            is_active=True,
        )
        following2 = User(
            id=uuid4(),
            auth0_id="auth0|following2",
            email="following2@example.com",
            email_verified=True,
            nickname="following2",
            is_active=True,
        )
        db_session.add_all([following1, following2])
        db_session.commit()

        # Initially not following anyone
        assert FollowService.get_following_count(db_session, test_user.id) == 0

        # Follow users
        FollowService.follow_user(db_session, test_user.id, following1.id)
        FollowService.follow_user(db_session, test_user.id, following2.id)

        # Should be following 2 users
        assert FollowService.get_following_count(db_session, test_user.id) == 2

    def test_get_follow_stats(self, db_session: Session, test_user: User):
        """Test getting follow statistics."""
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

        # test_user follows other_user
        FollowService.follow_user(db_session, test_user.id, other_user.id)

        stats = FollowService.get_follow_stats(
            db_session, other_user.id, current_user_id=test_user.id
        )

        assert stats["follower_count"] == 1  # test_user follows other_user
        assert stats["following_count"] == 0  # other_user doesn't follow anyone
        assert stats["is_following"] is True  # test_user follows other_user
        assert stats["is_followed_by"] is False  # other_user doesn't follow test_user

    def test_get_mutual_follows(self, db_session: Session, test_user: User):
        """Test getting mutual follows."""
        mutual_user = User(
            id=uuid4(),
            auth0_id="auth0|mutual123",
            email="mutual@example.com",
            email_verified=True,
            nickname="mutualuser",
            is_active=True,
        )
        db_session.add(mutual_user)
        db_session.commit()

        # Create mutual follow relationship
        FollowService.follow_user(db_session, test_user.id, mutual_user.id)
        FollowService.follow_user(db_session, mutual_user.id, test_user.id)

        mutual_follows = FollowService.get_mutual_follows(db_session, test_user.id)

        assert mutual_user.id in mutual_follows
