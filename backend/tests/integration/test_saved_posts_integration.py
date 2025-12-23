"""
Integration tests for Saved Posts functionality.

Tests the complete flow of:
- Saving posts
- Getting saved posts with pagination and sorting
- Checking if posts are saved
- Unsaving posts
- Visibility filtering
"""

from datetime import datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from app.models.follow import Follow
from app.models.post import Post, SavedPost
from app.models.user import User
from app.services.post_service import SavedPostService


class TestSavedPostsIntegration:
    """Integration tests for saved posts functionality."""

    def test_save_get_unsave_flow(self, db_session: Session, test_user: User):
        """Test complete flow: save -> get -> unsave."""
        # Create a post
        post = Post(
            user_id=test_user.id,
            content="Test post for integration test",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        # Step 1: Save the post
        saved_post = SavedPostService.save_post(db_session, test_user.id, post.id)
        assert saved_post.id is not None
        assert saved_post.user_id == test_user.id
        assert saved_post.post_id == post.id

        # Step 2: Check if post is saved
        is_saved = SavedPostService.is_post_saved(db_session, test_user.id, post.id)
        assert is_saved is True

        # Step 3: Get saved posts
        posts, total = SavedPostService.get_saved_posts(
            db_session,
            test_user.id,
            current_user_id=test_user.id,
        )
        assert total == 1
        assert len(posts) == 1
        assert posts[0].id == post.id

        # Step 4: Unsave the post
        result = SavedPostService.unsave_post(db_session, test_user.id, post.id)
        assert result is True

        # Step 5: Verify it's no longer saved
        is_saved_after = SavedPostService.is_post_saved(
            db_session, test_user.id, post.id
        )
        assert is_saved_after is False

        # Step 6: Get saved posts again - should be empty
        posts_after, total_after = SavedPostService.get_saved_posts(
            db_session,
            test_user.id,
            current_user_id=test_user.id,
        )
        assert total_after == 0
        assert len(posts_after) == 0

    def test_multiple_users_save_different_posts(
        self, db_session: Session, test_user: User
    ):
        """Test that multiple users can save different posts."""
        # Create second user
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

        # Create posts
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
        db_session.add_all([post1, post2])
        db_session.commit()

        # User 1 saves post1
        SavedPostService.save_post(db_session, test_user.id, post1.id)

        # User 2 saves post2
        SavedPostService.save_post(db_session, other_user.id, post2.id)

        # Get saved posts for user 1
        posts_user1, total_user1 = SavedPostService.get_saved_posts(
            db_session,
            test_user.id,
            current_user_id=test_user.id,
        )
        assert total_user1 == 1
        assert posts_user1[0].id == post1.id

        # Get saved posts for user 2
        posts_user2, total_user2 = SavedPostService.get_saved_posts(
            db_session,
            other_user.id,
            current_user_id=other_user.id,
        )
        assert total_user2 == 1
        assert posts_user2[0].id == post2.id

    def test_same_post_saved_by_multiple_users(
        self, db_session: Session, test_user: User
    ):
        """Test that the same post can be saved by multiple users."""
        # Create second user
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

        # Create a post
        post = Post(
            user_id=test_user.id,
            content="Popular post",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        # Both users save the same post
        SavedPostService.save_post(db_session, test_user.id, post.id)
        SavedPostService.save_post(db_session, other_user.id, post.id)

        # Both users should see the post in their saved list
        posts_user1, _ = SavedPostService.get_saved_posts(
            db_session,
            test_user.id,
            current_user_id=test_user.id,
        )
        assert len(posts_user1) == 1
        assert posts_user1[0].id == post.id

        posts_user2, _ = SavedPostService.get_saved_posts(
            db_session,
            other_user.id,
            current_user_id=other_user.id,
        )
        assert len(posts_user2) == 1
        assert posts_user2[0].id == post.id

    def test_saved_posts_with_visibility_filtering(
        self, db_session: Session, test_user: User
    ):
        """Test that saved posts respect visibility settings."""
        # Create second user
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

        # Create posts with different visibility
        public_post = Post(
            user_id=other_user.id,
            content="Public post",
            visibility="public",
            is_active=True,
        )
        private_post = Post(
            user_id=other_user.id,
            content="Private post",
            visibility="private",
            is_active=True,
        )
        followers_post = Post(
            user_id=other_user.id,
            content="Followers only post",
            visibility="followers_only",
            is_active=True,
        )
        db_session.add_all([public_post, private_post, followers_post])
        db_session.commit()

        # Save all posts
        SavedPostService.save_post(db_session, test_user.id, public_post.id)
        SavedPostService.save_post(db_session, test_user.id, private_post.id)
        SavedPostService.save_post(db_session, test_user.id, followers_post.id)
        db_session.commit()

        # Get saved posts without following - should only see public post
        posts, total = SavedPostService.get_saved_posts(
            db_session,
            test_user.id,
            current_user_id=test_user.id,
        )
        assert total == 1
        assert posts[0].id == public_post.id

        # Create follow relationship
        follow = Follow(
            follower_id=test_user.id,
            following_id=other_user.id,
            is_active=True,
        )
        db_session.add(follow)
        db_session.commit()

        # Get saved posts with following - should see public and followers_only posts
        posts_after, total_after = SavedPostService.get_saved_posts(
            db_session,
            test_user.id,
            current_user_id=test_user.id,
        )
        assert total_after == 2
        post_ids = {post.id for post in posts_after}
        assert public_post.id in post_ids
        assert followers_post.id in post_ids
        assert private_post.id not in post_ids

    def test_saved_posts_sorting_and_pagination(
        self, db_session: Session, test_user: User
    ):
        """Test sorting and pagination together."""
        # Create multiple posts with different creation times
        now = datetime.utcnow()
        posts = []
        for i in range(10):
            post = Post(
                user_id=test_user.id,
                content=f"Post {i}",
                visibility="public",
                is_active=True,
                created_at=now - timedelta(days=10 - i),  # Older posts first
            )
            posts.append(post)
        db_session.add_all(posts)
        db_session.commit()

        # Save all posts in reverse order
        for post in reversed(posts):
            SavedPostService.save_post(db_session, test_user.id, post.id)
            db_session.commit()
            import time

            time.sleep(0.01)  # Small delay to ensure different timestamps

        # Test sorting by save date (created_at) desc with pagination
        page1, total = SavedPostService.get_saved_posts(
            db_session,
            test_user.id,
            current_user_id=test_user.id,
            skip=0,
            limit=3,
            sort_by="created_at",
            sort_order="desc",
        )
        assert total == 10
        assert len(page1) == 3
        # Most recently saved should be first
        assert page1[0].id == posts[0].id  # Last saved

        # Test sorting by post creation date (post_created_at) desc
        page1_post_date, total_post_date = SavedPostService.get_saved_posts(
            db_session,
            test_user.id,
            current_user_id=test_user.id,
            skip=0,
            limit=3,
            sort_by="post_created_at",
            sort_order="desc",
        )
        assert total_post_date == 10
        assert len(page1_post_date) == 3
        # Newest post should be first (regardless of save order)
        assert page1_post_date[0].id == posts[9].id  # Newest post

    def test_get_saved_post_ids_multiple_posts(
        self, db_session: Session, test_user: User
    ):
        """Test getting saved post IDs for multiple posts."""
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

        # Save some posts
        SavedPostService.save_post(db_session, test_user.id, posts[0].id)
        SavedPostService.save_post(db_session, test_user.id, posts[2].id)
        SavedPostService.save_post(db_session, test_user.id, posts[4].id)
        db_session.commit()

        # Get saved post IDs
        all_post_ids = [post.id for post in posts]
        saved_ids = SavedPostService.get_saved_post_ids(
            db_session, test_user.id, all_post_ids
        )

        assert len(saved_ids) == 3
        assert posts[0].id in saved_ids
        assert posts[2].id in saved_ids
        assert posts[4].id in saved_ids
        assert posts[1].id not in saved_ids
        assert posts[3].id not in saved_ids

    def test_saved_posts_exclude_inactive_posts(
        self, db_session: Session, test_user: User
    ):
        """Test that inactive posts are excluded from saved posts."""
        # Create posts
        active_post = Post(
            user_id=test_user.id,
            content="Active post",
            visibility="public",
            is_active=True,
        )
        inactive_post = Post(
            user_id=test_user.id,
            content="Inactive post",
            visibility="public",
            is_active=True,
        )
        db_session.add_all([active_post, inactive_post])
        db_session.commit()

        # Save both posts
        SavedPostService.save_post(db_session, test_user.id, active_post.id)
        SavedPostService.save_post(db_session, test_user.id, inactive_post.id)
        db_session.commit()

        # Deactivate one post
        inactive_post.is_active = False
        db_session.commit()

        # Get saved posts - should only include active post
        posts, total = SavedPostService.get_saved_posts(
            db_session,
            test_user.id,
            current_user_id=test_user.id,
        )
        assert total == 1
        assert len(posts) == 1
        assert posts[0].id == active_post.id

        # Check saved post IDs - should only include active post
        all_post_ids = [active_post.id, inactive_post.id]
        saved_ids = SavedPostService.get_saved_post_ids(
            db_session, test_user.id, all_post_ids
        )
        assert len(saved_ids) == 1
        assert active_post.id in saved_ids
        assert inactive_post.id not in saved_ids




