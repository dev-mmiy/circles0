"""
Unit tests for SavedPostService.
"""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from app.models.post import Post, SavedPost
from app.models.user import User
from app.services.post_service import SavedPostService


class TestSavedPostService:
    """Test cases for SavedPostService."""

    def test_save_post(self, db_session: Session, test_user: User):
        """Test saving a post."""
        # Create a post
        post = Post(
            user_id=test_user.id,
            content="Test post to save",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        # Save the post
        saved_post = SavedPostService.save_post(db_session, test_user.id, post.id)

        assert saved_post.id is not None
        assert saved_post.user_id == test_user.id
        assert saved_post.post_id == post.id
        assert saved_post.created_at is not None

    def test_save_post_already_saved(self, db_session: Session, test_user: User):
        """Test saving a post that is already saved should raise ValueError."""
        # Create a post
        post = Post(
            user_id=test_user.id,
            content="Test post",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        # Save the post first time
        SavedPostService.save_post(db_session, test_user.id, post.id)

        # Try to save again - should raise ValueError
        with pytest.raises(ValueError, match="already saved"):
            SavedPostService.save_post(db_session, test_user.id, post.id)

    def test_save_post_not_found(self, db_session: Session, test_user: User):
        """Test saving a post that doesn't exist should raise ValueError."""
        non_existent_post_id = uuid4()

        with pytest.raises(ValueError, match="not found"):
            SavedPostService.save_post(db_session, test_user.id, non_existent_post_id)

    def test_save_post_inactive(self, db_session: Session, test_user: User):
        """Test saving an inactive post should raise ValueError."""
        # Create an inactive post
        post = Post(
            user_id=test_user.id,
            content="Inactive post",
            visibility="public",
            is_active=False,  # Inactive
        )
        db_session.add(post)
        db_session.commit()

        with pytest.raises(ValueError, match="not found"):
            SavedPostService.save_post(db_session, test_user.id, post.id)

    def test_unsave_post(self, db_session: Session, test_user: User):
        """Test unsaving a post."""
        # Create a post
        post = Post(
            user_id=test_user.id,
            content="Test post",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        # Save the post
        SavedPostService.save_post(db_session, test_user.id, post.id)

        # Unsave the post
        result = SavedPostService.unsave_post(db_session, test_user.id, post.id)

        assert result is True

        # Verify it's no longer saved
        is_saved = SavedPostService.is_post_saved(db_session, test_user.id, post.id)
        assert is_saved is False

    def test_unsave_post_not_saved(self, db_session: Session, test_user: User):
        """Test unsaving a post that is not saved should return False."""
        # Create a post
        post = Post(
            user_id=test_user.id,
            content="Test post",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        # Try to unsave without saving first
        result = SavedPostService.unsave_post(db_session, test_user.id, post.id)

        assert result is False

    def test_is_post_saved_true(self, db_session: Session, test_user: User):
        """Test checking if a post is saved (when it is saved)."""
        # Create a post
        post = Post(
            user_id=test_user.id,
            content="Test post",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        # Save the post
        SavedPostService.save_post(db_session, test_user.id, post.id)

        # Check if saved
        is_saved = SavedPostService.is_post_saved(db_session, test_user.id, post.id)

        assert is_saved is True

    def test_is_post_saved_false(self, db_session: Session, test_user: User):
        """Test checking if a post is saved (when it is not saved)."""
        # Create a post
        post = Post(
            user_id=test_user.id,
            content="Test post",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        # Check if saved (without saving)
        is_saved = SavedPostService.is_post_saved(db_session, test_user.id, post.id)

        assert is_saved is False

    def test_get_saved_post_ids(self, db_session: Session, test_user: User):
        """Test getting saved post IDs."""
        # Create multiple posts
        post1 = Post(
            user_id=test_user.id,
            content="Post 1",
            visibility="public",
            is_active=True,
        )
        post2 = Post(
            user_id=test_user.id,
            content="Post 2",
            visibility="public",
            is_active=True,
        )
        post3 = Post(
            user_id=test_user.id,
            content="Post 3",
            visibility="public",
            is_active=True,
        )
        db_session.add_all([post1, post2, post3])
        db_session.commit()

        # Save post1 and post2
        SavedPostService.save_post(db_session, test_user.id, post1.id)
        SavedPostService.save_post(db_session, test_user.id, post2.id)

        # Get saved post IDs
        saved_ids = SavedPostService.get_saved_post_ids(
            db_session, test_user.id, [post1.id, post2.id, post3.id]
        )

        assert len(saved_ids) == 2
        assert post1.id in saved_ids
        assert post2.id in saved_ids
        assert post3.id not in saved_ids

    def test_get_saved_posts_sort_by_created_at_desc(
        self, db_session: Session, test_user: User
    ):
        """Test getting saved posts sorted by save date (descending)."""
        # Create posts with different creation times
        now = datetime.now(timezone.utc)
        post1 = Post(
            user_id=test_user.id,
            content="Post 1",
            visibility="public",
            is_active=True,
            created_at=now - timedelta(days=2),
        )
        post2 = Post(
            user_id=test_user.id,
            content="Post 2",
            visibility="public",
            is_active=True,
            created_at=now - timedelta(days=1),
        )
        db_session.add_all([post1, post2])
        db_session.commit()

        # Save post1 first, then post2
        SavedPostService.save_post(db_session, test_user.id, post1.id)
        db_session.commit()
        # Small delay to ensure different timestamps
        import time

        time.sleep(0.1)
        SavedPostService.save_post(db_session, test_user.id, post2.id)
        db_session.commit()

        # Get saved posts sorted by created_at desc
        posts, total = SavedPostService.get_saved_posts(
            db_session,
            test_user.id,
            current_user_id=test_user.id,
            sort_by="created_at",
            sort_order="desc",
        )

        assert total == 2
        assert len(posts) == 2
        # Most recently saved should be first
        assert posts[0].id == post2.id
        assert posts[1].id == post1.id

    def test_get_saved_posts_sort_by_post_created_at_desc(
        self, db_session: Session, test_user: User
    ):
        """Test getting saved posts sorted by post creation date (descending)."""
        # Create posts with different creation times
        now = datetime.now(timezone.utc)
        post1 = Post(
            user_id=test_user.id,
            content="Post 1",
            visibility="public",
            is_active=True,
            created_at=now - timedelta(days=2),
        )
        post2 = Post(
            user_id=test_user.id,
            content="Post 2",
            visibility="public",
            is_active=True,
            created_at=now - timedelta(days=1),
        )
        db_session.add_all([post1, post2])
        db_session.commit()

        # Save post2 first, then post1 (reverse order)
        SavedPostService.save_post(db_session, test_user.id, post2.id)
        SavedPostService.save_post(db_session, test_user.id, post1.id)
        db_session.commit()

        # Get saved posts sorted by post_created_at desc
        posts, total = SavedPostService.get_saved_posts(
            db_session,
            test_user.id,
            current_user_id=test_user.id,
            sort_by="post_created_at",
            sort_order="desc",
        )

        assert total == 2
        assert len(posts) == 2
        # Newer post should be first (regardless of save order)
        assert posts[0].id == post2.id
        assert posts[1].id == post1.id

    def test_get_saved_posts_pagination(self, db_session: Session, test_user: User):
        """Test pagination for saved posts."""
        # Create multiple posts
        posts = []
        for i in range(5):
            post = Post(
                user_id=test_user.id,
                content=f"Post {i}",
                visibility="public",
                is_active=True,
            )
            posts.append(post)
        db_session.add_all(posts)
        db_session.commit()

        # Save all posts
        for post in posts:
            SavedPostService.save_post(db_session, test_user.id, post.id)
        db_session.commit()

        # Get first page (limit=2)
        page1, total = SavedPostService.get_saved_posts(
            db_session,
            test_user.id,
            current_user_id=test_user.id,
            skip=0,
            limit=2,
        )

        assert total == 5
        assert len(page1) == 2

        # Get second page
        page2, total = SavedPostService.get_saved_posts(
            db_session,
            test_user.id,
            current_user_id=test_user.id,
            skip=2,
            limit=2,
        )

        assert total == 5
        assert len(page2) == 2

        # Verify no overlap
        page1_ids = {post.id for post in page1}
        page2_ids = {post.id for post in page2}
        assert page1_ids.isdisjoint(page2_ids)

    def test_get_saved_posts_visibility_filter_private(
        self, db_session: Session, test_user: User
    ):
        """Test that private posts are filtered correctly."""
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

        # Create a private post by other user
        private_post = Post(
            user_id=other_user.id,
            content="Private post",
            visibility="private",
            is_active=True,
        )
        db_session.add(private_post)
        db_session.commit()

        # Save the private post
        SavedPostService.save_post(db_session, test_user.id, private_post.id)
        db_session.commit()

        # Get saved posts - should not include private post from other user
        posts, total = SavedPostService.get_saved_posts(
            db_session,
            test_user.id,
            current_user_id=test_user.id,
        )

        # Note: 'total' represents total saved posts (before visibility filtering)
        # The private post is saved, so total is 1, but it's filtered out from results
        assert total == 1  # Total saved posts (including non-visible)
        assert len(posts) == 0  # But no visible posts returned

    def test_get_saved_posts_visibility_filter_followers_only(
        self, db_session: Session, test_user: User
    ):
        """Test that followers_only posts are filtered correctly."""
        from app.models.follow import Follow

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

        # Create a followers_only post by other user
        followers_post = Post(
            user_id=other_user.id,
            content="Followers only post",
            visibility="followers_only",
            is_active=True,
        )
        db_session.add(followers_post)
        db_session.commit()

        # Save the post
        SavedPostService.save_post(db_session, test_user.id, followers_post.id)
        db_session.commit()

        # Get saved posts without following - should not include the post
        posts, total = SavedPostService.get_saved_posts(
            db_session,
            test_user.id,
            current_user_id=test_user.id,
        )

        # Note: 'total' represents total saved posts (before visibility filtering)
        # The followers_only post is saved, so total is 1, but it's filtered out from results
        assert total == 1  # Total saved posts (including non-visible)
        assert len(posts) == 0  # But no visible posts returned

        # Create follow relationship
        follow = Follow(
            follower_id=test_user.id,
            following_id=other_user.id,
            is_active=True,
        )
        db_session.add(follow)
        db_session.commit()

        # Get saved posts with following - should include the post
        posts, total = SavedPostService.get_saved_posts(
            db_session,
            test_user.id,
            current_user_id=test_user.id,
        )

        assert total == 1
        assert len(posts) == 1
        assert posts[0].id == followers_post.id

    def test_get_saved_posts_excludes_inactive_posts(
        self, db_session: Session, test_user: User
    ):
        """Test that inactive posts are excluded from saved posts."""
        # Create a post
        post = Post(
            user_id=test_user.id,
            content="Test post",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        # Save the post
        SavedPostService.save_post(db_session, test_user.id, post.id)
        db_session.commit()

        # Deactivate the post
        post.is_active = False
        db_session.commit()

        # Get saved posts - should not include inactive post
        posts, total = SavedPostService.get_saved_posts(
            db_session,
            test_user.id,
            current_user_id=test_user.id,
        )

        assert total == 0
        assert len(posts) == 0

