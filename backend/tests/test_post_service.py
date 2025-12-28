"""
Unit tests for PostService.
"""

from datetime import datetime
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from app.models.post import Post, PostComment, PostImage, PostLike
from app.models.user import User
from app.schemas.post import PostCommentCreate, PostCreate, PostLikeCreate, PostUpdate
from app.services.post_service import PostService


class TestPostService:
    """Test cases for PostService."""

    def test_create_post(self, db_session: Session, test_user: User):
        """Test creating a new post."""
        post_data = PostCreate(
            content="Test post content",
            visibility="public",
        )

        post = PostService.create_post(db_session, test_user.id, post_data)

        assert post.id is not None
        assert post.user_id == test_user.id
        assert post.content == "Test post content"
        assert post.visibility == "public"
        assert post.is_active is True

    def test_create_post_with_images(self, db_session: Session, test_user: User):
        """Test creating a post with images."""
        post_data = PostCreate(
            content="Test post with images",
            visibility="public",
            image_urls=[
                "https://example.com/image1.jpg",
                "https://example.com/image2.jpg",
            ],
        )

        post = PostService.create_post(db_session, test_user.id, post_data)

        assert post.id is not None
        # Check images were created
        images = db_session.query(PostImage).filter(PostImage.post_id == post.id).all()
        assert len(images) == 2
        assert images[0].image_url == "https://example.com/image1.jpg"
        assert images[0].display_order == 0
        assert images[1].image_url == "https://example.com/image2.jpg"
        assert images[1].display_order == 1

    def test_get_post_by_id_public(self, db_session: Session, test_user: User):
        """Test getting a public post by ID."""
        post = Post(
            user_id=test_user.id,
            content="Public post",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        retrieved_post = PostService.get_post_by_id(db_session, post.id)

        assert retrieved_post is not None
        assert retrieved_post.id == post.id
        assert retrieved_post.content == "Public post"

    def test_get_post_by_id_private_as_owner(
        self, db_session: Session, test_user: User
    ):
        """Test getting a private post by ID as the owner."""
        post = Post(
            user_id=test_user.id,
            content="Private post",
            visibility="private",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        retrieved_post = PostService.get_post_by_id(
            db_session, post.id, current_user_id=test_user.id
        )

        assert retrieved_post is not None
        assert retrieved_post.id == post.id

    def test_get_post_by_id_private_as_other_user(
        self, db_session: Session, test_user: User
    ):
        """Test getting a private post by ID as another user."""
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

        post = Post(
            user_id=test_user.id,
            content="Private post",
            visibility="private",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        retrieved_post = PostService.get_post_by_id(
            db_session, post.id, current_user_id=other_user.id
        )

        assert retrieved_post is None

    def test_get_post_by_id_not_found(self, db_session: Session):
        """Test getting a post that doesn't exist."""
        non_existent_id = uuid4()
        retrieved_post = PostService.get_post_by_id(db_session, non_existent_id)

        assert retrieved_post is None

    def test_update_post(self, db_session: Session, test_user: User):
        """Test updating a post."""
        post = Post(
            user_id=test_user.id,
            content="Original content",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        update_data = PostUpdate(content="Updated content", visibility="followers_only")

        updated_post = PostService.update_post(
            db_session, post.id, test_user.id, update_data
        )

        assert updated_post.content == "Updated content"
        assert updated_post.visibility == "followers_only"

    def test_update_post_not_owner(self, db_session: Session, test_user: User):
        """Test updating a post as non-owner should fail."""
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

        post = Post(
            user_id=test_user.id,
            content="Original content",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        update_data = PostUpdate(content="Updated content")

        updated_post = PostService.update_post(
            db_session, post.id, other_user.id, update_data
        )

        assert updated_post is None

    def test_update_post_delete_images(self, db_session: Session, test_user: User):
        """Test updating a post to delete all images."""
        print("\n[TEST] test_update_post_delete_images: Starting...")

        # Create post with images
        print("[TEST] Creating post with images...")
        post = Post(
            user_id=test_user.id,
            content="Post with images",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        # Add images
        print("[TEST] Adding 2 images to post...")
        image1 = PostImage(
            post_id=post.id,
            image_url="https://example.com/image1.jpg",
            display_order=0,
        )
        image2 = PostImage(
            post_id=post.id,
            image_url="https://example.com/image2.jpg",
            display_order=1,
        )
        db_session.add_all([image1, image2])
        db_session.commit()

        # Verify images exist
        print("[TEST] Verifying images exist before update...")
        images_before = (
            db_session.query(PostImage).filter(PostImage.post_id == post.id).all()
        )
        assert len(images_before) == 2
        print(f"[TEST] ✓ Found {len(images_before)} images before update")

        # Update post with empty image_urls to delete all images
        print("[TEST] Updating post with empty image_urls to delete all images...")
        update_data = PostUpdate(image_urls=[])

        updated_post = PostService.update_post(
            db_session, post.id, test_user.id, update_data
        )

        assert updated_post is not None
        print("[TEST] ✓ Post updated successfully")

        # Verify all images are deleted
        print("[TEST] Verifying all images are deleted...")
        images_after = (
            db_session.query(PostImage).filter(PostImage.post_id == post.id).all()
        )
        assert len(images_after) == 0
        print(
            f"[TEST] ✓ All images deleted successfully (found {len(images_after)} images)"
        )
        print("[TEST] test_update_post_delete_images: PASSED ✓\n")

    def test_update_post_replace_images(self, db_session: Session, test_user: User):
        """Test updating a post to replace images with new ones."""
        print("\n[TEST] test_update_post_replace_images: Starting...")

        # Create post with images
        print("[TEST] Creating post with original images...")
        post = Post(
            user_id=test_user.id,
            content="Post with images",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        # Add original images
        print("[TEST] Adding 2 original images...")
        image1 = PostImage(
            post_id=post.id,
            image_url="https://example.com/old1.jpg",
            display_order=0,
        )
        image2 = PostImage(
            post_id=post.id,
            image_url="https://example.com/old2.jpg",
            display_order=1,
        )
        db_session.add_all([image1, image2])
        db_session.commit()

        # Update post with new images
        print("[TEST] Replacing images with 3 new images...")
        update_data = PostUpdate(
            image_urls=[
                "https://example.com/new1.jpg",
                "https://example.com/new2.jpg",
                "https://example.com/new3.jpg",
            ]
        )

        updated_post = PostService.update_post(
            db_session, post.id, test_user.id, update_data
        )

        assert updated_post is not None
        print("[TEST] ✓ Post updated successfully")

        # Verify old images are deleted and new images are added
        print("[TEST] Verifying old images are deleted and new images are added...")
        images_after = (
            db_session.query(PostImage)
            .filter(PostImage.post_id == post.id)
            .order_by(PostImage.display_order)
            .all()
        )
        assert len(images_after) == 3
        assert images_after[0].image_url == "https://example.com/new1.jpg"
        assert images_after[0].display_order == 0
        assert images_after[1].image_url == "https://example.com/new2.jpg"
        assert images_after[1].display_order == 1
        assert images_after[2].image_url == "https://example.com/new3.jpg"
        assert images_after[2].display_order == 2
        print(f"[TEST] ✓ Images replaced successfully ({len(images_after)} new images)")
        print("[TEST] test_update_post_replace_images: PASSED ✓\n")

    def test_update_post_add_images_to_post_without_images(
        self, db_session: Session, test_user: User
    ):
        """Test adding images to a post that previously had no images."""
        print(
            "\n[TEST] test_update_post_add_images_to_post_without_images: Starting..."
        )

        # Create post without images
        print("[TEST] Creating post without images...")
        post = Post(
            user_id=test_user.id,
            content="Post without images",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        # Verify no images exist
        print("[TEST] Verifying post has no images...")
        images_before = (
            db_session.query(PostImage).filter(PostImage.post_id == post.id).all()
        )
        assert len(images_before) == 0
        print(f"[TEST] ✓ Post has no images ({len(images_before)} images)")

        # Update post with images
        print("[TEST] Adding 2 images to post...")
        update_data = PostUpdate(
            image_urls=["https://example.com/new1.jpg", "https://example.com/new2.jpg"]
        )

        updated_post = PostService.update_post(
            db_session, post.id, test_user.id, update_data
        )

        assert updated_post is not None
        print("[TEST] ✓ Post updated successfully")

        # Verify images are added
        print("[TEST] Verifying images are added...")
        images_after = (
            db_session.query(PostImage)
            .filter(PostImage.post_id == post.id)
            .order_by(PostImage.display_order)
            .all()
        )
        assert len(images_after) == 2
        assert images_after[0].image_url == "https://example.com/new1.jpg"
        assert images_after[1].image_url == "https://example.com/new2.jpg"
        print(f"[TEST] ✓ Images added successfully ({len(images_after)} images)")
        print("[TEST] test_update_post_add_images_to_post_without_images: PASSED ✓\n")

    def test_delete_post(self, db_session: Session, test_user: User):
        """Test soft deleting a post."""
        post = Post(
            user_id=test_user.id,
            content="Post to delete",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        PostService.delete_post(db_session, post.id, test_user.id)

        db_session.refresh(post)
        assert post.is_active is False

    def test_like_post(self, db_session: Session, test_user: User):
        """Test liking a post."""
        post = Post(
            user_id=test_user.id,
            content="Post to like",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        like_data = PostLikeCreate(reaction_type="like")

        like = PostService.like_post(db_session, post.id, test_user.id, like_data)

        assert like is not None
        assert like.post_id == post.id
        assert like.user_id == test_user.id

    def test_unlike_post(self, db_session: Session, test_user: User):
        """Test unliking a post."""
        post = Post(
            user_id=test_user.id,
            content="Post to unlike",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        # Like first
        like = PostLike(post_id=post.id, user_id=test_user.id)
        db_session.add(like)
        db_session.commit()

        # Unlike
        result = PostService.unlike_post(db_session, post.id, test_user.id)

        assert result is True
        # Verify like is removed
        remaining_like = (
            db_session.query(PostLike)
            .filter(PostLike.post_id == post.id, PostLike.user_id == test_user.id)
            .first()
        )
        assert remaining_like is None

    def test_create_comment(self, db_session: Session, test_user: User):
        """Test creating a comment on a post."""
        post = Post(
            user_id=test_user.id,
            content="Post to comment on",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        comment_data = PostCommentCreate(post_id=post.id, content="Test comment")

        comment = PostService.create_comment(
            db_session, post.id, test_user.id, comment_data
        )

        assert comment is not None
        assert comment.post_id == post.id
        assert comment.user_id == test_user.id
        assert comment.content == "Test comment"

    def test_get_feed_all(self, db_session: Session, test_user: User):
        """Test getting feed with filter_type='all'."""
        # Create multiple posts
        post1 = Post(
            user_id=test_user.id,
            content="Post 1",
            visibility="public",
            is_active=True,
            created_at=datetime.utcnow(),
        )
        post2 = Post(
            user_id=test_user.id,
            content="Post 2",
            visibility="public",
            is_active=True,
            created_at=datetime.utcnow(),
        )
        db_session.add_all([post1, post2])
        db_session.commit()

        feed = PostService.get_feed(
            db_session, current_user_id=test_user.id, filter_type="all"
        )

        assert len(feed) >= 2
        # Should be ordered by created_at desc
        assert feed[0].created_at >= feed[1].created_at

    def test_get_feed_my_posts(self, db_session: Session, test_user: User):
        """Test getting feed with filter_type='my_posts'."""
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

        # Create posts from both users
        my_post = Post(
            user_id=test_user.id,
            content="My post",
            visibility="public",
            is_active=True,
            created_at=datetime.utcnow(),
        )
        other_post = Post(
            user_id=other_user.id,
            content="Other user's post",
            visibility="public",
            is_active=True,
            created_at=datetime.utcnow(),
        )
        db_session.add_all([my_post, other_post])
        db_session.commit()

        feed = PostService.get_feed(
            db_session, current_user_id=test_user.id, filter_type="my_posts"
        )

        assert len(feed) == 1
        assert feed[0].user_id == test_user.id
        assert feed[0].content == "My post"

    def test_get_feed_unauthenticated(self, db_session: Session, test_user: User):
        """Test getting feed as unauthenticated user (only public posts)."""
        # Create posts with different visibility
        public_post = Post(
            user_id=test_user.id,
            content="Public post",
            visibility="public",
            is_active=True,
            created_at=datetime.utcnow(),
        )
        private_post = Post(
            user_id=test_user.id,
            content="Private post",
            visibility="private",
            is_active=True,
            created_at=datetime.utcnow(),
        )
        db_session.add_all([public_post, private_post])
        db_session.commit()

        feed = PostService.get_feed(db_session, current_user_id=None, filter_type="all")

        # Should only contain public posts
        assert len(feed) == 1
        assert feed[0].visibility == "public"
        assert feed[0].content == "Public post"


# Pytest fixtures
@pytest.fixture
def test_user(db_session: Session) -> User:
    """Create a test user."""
    from uuid import uuid4

    user = User(
        id=uuid4(),
        auth0_id="auth0|testuser123",
        email="testuser@example.com",
        email_verified=True,
        nickname="testuser",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user
