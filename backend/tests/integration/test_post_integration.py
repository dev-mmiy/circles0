"""
Integration tests for post functionality.

Tests the complete flow of:
- Post creation with images, hashtags, and mentions
- Post updates (including image changes)
- Post visibility and filtering
- Post feed with pagination
"""

from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from app.models.hashtag import Hashtag, PostHashtag
from app.models.mention import PostMention
from app.models.post import PostImage, PostLike
from app.models.user import User
from app.schemas.post import PostCreate, PostUpdate
from app.services.post_service import PostService


class TestPostIntegration:
    """Integration tests for post functionality."""

    def test_create_post_with_images_and_hashtags(
        self, db_session: Session, test_user: User
    ):
        """Test creating a post with images and hashtags."""
        from app.services.hashtag_service import HashtagService

        # Create post with images and hashtags in content
        post_data = PostCreate(
            content="Check out this #awesome #photo!",
            visibility="public",
            image_urls=[
                "https://example.com/image1.jpg",
                "https://example.com/image2.jpg",
            ],
        )

        post = PostService.create_post(db_session, test_user.id, post_data)

        # Extract and create hashtags (as done in API endpoint)
        HashtagService.extract_and_create_hashtags(
            db_session, post.id, post_data.content
        )
        db_session.commit()

        # Verify post was created
        assert post.id is not None
        assert post.user_id == test_user.id
        assert post.content == "Check out this #awesome #photo!"

        # Verify images were created
        images = (
            db_session.query(PostImage)
            .filter(PostImage.post_id == post.id)
            .order_by(PostImage.display_order)
            .all()
        )
        assert len(images) == 2
        assert images[0].image_url == "https://example.com/image1.jpg"
        assert images[0].display_order == 0
        assert images[1].image_url == "https://example.com/image2.jpg"
        assert images[1].display_order == 1

        # Verify hashtags were extracted and created
        hashtags = (
            db_session.query(Hashtag)
            .join(PostHashtag)
            .filter(PostHashtag.post_id == post.id)
            .all()
        )
        hashtag_names = {h.name for h in hashtags}
        assert "awesome" in hashtag_names
        assert "photo" in hashtag_names

    def test_update_post_with_image_changes(
        self, db_session: Session, test_user: User
    ):
        """Test updating a post by changing images."""
        # Create initial post with images
        post_data = PostCreate(
            content="Original post",
            visibility="public",
            image_urls=[
                "https://example.com/image1.jpg",
                "https://example.com/image2.jpg",
            ],
        )
        post = PostService.create_post(db_session, test_user.id, post_data)

        # Verify initial images
        images = (
            db_session.query(PostImage)
            .filter(PostImage.post_id == post.id)
            .all()
        )
        assert len(images) == 2

        # Update post: remove all images
        update_data = PostUpdate(
            content="Updated post without images",
            image_urls=[],  # Empty list removes all images
        )
        updated_post = PostService.update_post(
            db_session, post.id, test_user.id, update_data
        )

        # Verify images were removed
        images_after = (
            db_session.query(PostImage)
            .filter(PostImage.post_id == post.id)
            .all()
        )
        assert len(images_after) == 0
        assert updated_post.content == "Updated post without images"

        # Update post: add new images
        update_data2 = PostUpdate(
            content="Updated post with new images",
            image_urls=[
                "https://example.com/image3.jpg",
                "https://example.com/image4.jpg",
            ],
        )
        updated_post2 = PostService.update_post(
            db_session, post.id, test_user.id, update_data2
        )

        # Verify new images were added
        images_final = (
            db_session.query(PostImage)
            .filter(PostImage.post_id == post.id)
            .order_by(PostImage.display_order)
            .all()
        )
        assert len(images_final) == 2
        assert images_final[0].image_url == "https://example.com/image3.jpg"
        assert images_final[1].image_url == "https://example.com/image4.jpg"

    def test_post_visibility_and_filtering(
        self, db_session: Session, test_user: User
    ):
        """Test post visibility settings and filtering."""
        # Create a second user
        user2 = User(
            id=uuid4(),
            auth0_id="auth0|testuser456",
            email="testuser2@example.com",
            email_verified=True,
            nickname="testuser2",
            is_active=True,
        )
        db_session.add(user2)
        db_session.commit()
        db_session.refresh(user2)

        # Create posts with different visibility settings
        public_post = PostService.create_post(
            db_session,
            test_user.id,
            PostCreate(content="Public post", visibility="public"),
        )
        followers_only_post = PostService.create_post(
            db_session,
            test_user.id,
            PostCreate(content="Followers only", visibility="followers_only"),
        )
        private_post = PostService.create_post(
            db_session,
            test_user.id,
            PostCreate(content="Private post", visibility="private"),
        )

        # Test unauthenticated user can only see public posts
        feed_unauthenticated = PostService.get_feed(
            db_session, current_user_id=None, skip=0, limit=20, filter_type="all"
        )
        post_contents = {p.content for p in feed_unauthenticated}
        assert "Public post" in post_contents
        assert "Followers only" not in post_contents
        assert "Private post" not in post_contents

        # Test authenticated user (not following) can see public posts
        feed_authenticated = PostService.get_feed(
            db_session,
            current_user_id=user2.id,
            skip=0,
            limit=20,
            filter_type="all",
        )
        post_contents = {p.content for p in feed_authenticated}
        assert "Public post" in post_contents
        assert "Followers only" not in post_contents  # Not following
        assert "Private post" not in post_contents

    def test_post_likes_integration(
        self, db_session: Session, test_user: User
    ):
        """Test post likes functionality."""
        from unittest.mock import patch

        # Create a second user
        user2 = User(
            id=uuid4(),
            auth0_id="auth0|testuser456",
            email="testuser2@example.com",
            email_verified=True,
            nickname="testuser2",
            is_active=True,
        )
        db_session.add(user2)
        db_session.commit()
        db_session.refresh(user2)

        # Create a post
        post = PostService.create_post(
            db_session,
            test_user.id,
            PostCreate(content="Post to like", visibility="public"),
        )

        # Mock notification creation to avoid SQL syntax errors in tests
        with patch(
            "app.services.notification_service.NotificationService.create_notification",
            return_value=None,
        ):
            # User2 likes the post
            from app.schemas.post import PostLikeCreate

            like = PostService.like_post(
                db_session, post.id, user2.id, PostLikeCreate()
            )
            assert like is not None
            assert like.post_id == post.id
            assert like.user_id == user2.id

            # Verify like was created
            likes = (
                db_session.query(PostLike)
                .filter(PostLike.post_id == post.id)
                .all()
            )
            assert len(likes) == 1
            assert likes[0].user_id == user2.id

            # User2 unlikes the post
            PostService.unlike_post(db_session, post.id, user2.id)

            # Verify like was removed
            likes = (
                db_session.query(PostLike)
                .filter(PostLike.post_id == post.id)
                .all()
            )
            assert len(likes) == 0

    def test_post_feed_pagination(
        self, db_session: Session, test_user: User
    ):
        """Test post feed pagination."""
        # Create multiple posts
        for i in range(25):
            PostService.create_post(
                db_session,
                test_user.id,
                PostCreate(
                    content=f"Post {i}", visibility="public"
                ),
            )

        # Get first page (20 posts)
        feed_page1 = PostService.get_feed(
            db_session, current_user_id=None, skip=0, limit=20, filter_type="all"
        )
        assert len(feed_page1) == 20

        # Get second page (5 posts remaining)
        feed_page2 = PostService.get_feed(
            db_session, current_user_id=None, skip=20, limit=20, filter_type="all"
        )
        assert len(feed_page2) == 5

        # Verify posts are ordered by created_at desc (newest first)
        assert feed_page1[0].content == "Post 24"
        assert feed_page1[-1].content == "Post 5"
        assert feed_page2[0].content == "Post 4"
        assert feed_page2[-1].content == "Post 0"

    def test_post_with_mentions(
        self, db_session: Session, test_user: User
    ):
        """Test post creation with user mentions."""
        from app.services.mention_service import MentionService

        # Create a second user
        user2 = User(
            id=uuid4(),
            auth0_id="auth0|testuser456",
            email="testuser2@example.com",
            email_verified=True,
            nickname="testuser2",
            username="testuser2",  # Username is required for mentions
            is_active=True,
        )
        db_session.add(user2)
        db_session.commit()
        db_session.refresh(user2)

        # Create post with mention
        post_data = PostCreate(
            content=f"Hey @{user2.username}, check this out!",
            visibility="public",
        )

        post = PostService.create_post(db_session, test_user.id, post_data)

        # Extract and create mentions (as done in API endpoint)
        MentionService.extract_and_create_mentions(
            db_session, post.id, post_data.content, exclude_user_id=test_user.id
        )
        db_session.commit()

        # Verify post was created
        assert post.id is not None

        # Verify mention was extracted and created
        mentions = (
            db_session.query(PostMention)
            .filter(PostMention.post_id == post.id)
            .all()
        )
        assert len(mentions) == 1
        assert mentions[0].mentioned_user_id == user2.id

