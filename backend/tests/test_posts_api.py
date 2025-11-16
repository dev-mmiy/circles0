"""
API endpoint tests for Posts API.
"""

from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app


class TestPostsAPI:
    """Test cases for Posts API endpoints."""

    def setup_method(self):
        """Set up test client for each test."""
        self.client = TestClient(app)

    @pytest.fixture(autouse=True)
    def override_db(self, db_session):
        """Override database dependency for tests."""
        app.dependency_overrides[get_db] = lambda: db_session
        yield
        app.dependency_overrides.clear()

    def test_get_feed_unauthenticated(self, db_session, test_user):
        """Test getting feed without authentication."""
        from app.models.post import Post

        # Create a public post
        post = Post(
            user_id=test_user.id,
            content="Public post",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        response = self.client.get("/api/v1/posts")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(p["content"] == "Public post" for p in data)

    def test_get_feed_authenticated(self, db_session, test_user):
        """Test getting feed with authentication."""
        from app.models.post import Post

        # Create posts
        public_post = Post(
            user_id=test_user.id,
            content="Public post",
            visibility="public",
            is_active=True,
        )
        private_post = Post(
            user_id=test_user.id,
            content="Private post",
            visibility="private",
            is_active=True,
        )
        db_session.add_all([public_post, private_post])
        db_session.commit()

        # Mock authentication
        mock_user = {"sub": test_user.auth0_id}

        with patch("app.api.posts.get_current_user_optional", return_value=mock_user):
            response = self.client.get("/api/v1/posts")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should include public post and private post (user's own post)
        assert len(data) >= 2

    def test_get_feed_filter_my_posts(self, db_session, test_user):
        """Test getting feed with my_posts filter."""
        from app.models.post import Post
        from app.models.user import User

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
        )
        other_post = Post(
            user_id=other_user.id,
            content="Other user's post",
            visibility="public",
            is_active=True,
        )
        db_session.add_all([my_post, other_post])
        db_session.commit()

        # Mock authentication
        mock_user = {"sub": test_user.auth0_id}

        with patch("app.api.posts.get_current_user_optional", return_value=mock_user):
            response = self.client.get("/api/v1/posts?filter_type=my_posts")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should only contain test_user's posts
        assert len(data) == 1
        assert data[0]["content"] == "My post"
        assert data[0]["user_id"] == str(test_user.id)

    def test_get_feed_filter_following(self, db_session, test_user):
        """Test getting feed with following filter."""
        from app.models.follow import Follow
        from app.models.post import Post
        from app.models.user import User

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

        # Create follow relationship
        follow = Follow(
            follower_id=test_user.id,
            following_id=other_user.id,
            is_active=True,
        )
        db_session.add(follow)

        # Create posts
        followed_post = Post(
            user_id=other_user.id,
            content="Followed user's post",
            visibility="public",
            is_active=True,
        )
        unfollowed_post = Post(
            user_id=test_user.id,
            content="My own post",
            visibility="public",
            is_active=True,
        )
        db_session.add_all([followed_post, unfollowed_post])
        db_session.commit()

        # Mock authentication
        mock_user = {"sub": test_user.auth0_id}

        with patch("app.api.posts.get_current_user_optional", return_value=mock_user):
            response = self.client.get("/api/v1/posts?filter_type=following")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should only contain posts from followed users
        assert len(data) >= 1
        assert any(p["content"] == "Followed user's post" for p in data)

    def test_create_post_authenticated(self, db_session, test_user):
        """Test creating a post with authentication."""
        # Mock authentication
        mock_user = {"sub": test_user.auth0_id}

        post_data = {
            "content": "Test post content",
            "visibility": "public",
        }

        with patch("app.api.posts.get_current_user", return_value=mock_user):
            response = self.client.post("/api/v1/posts", json=post_data)

        assert response.status_code == 201
        data = response.json()
        assert data["content"] == "Test post content"
        assert data["visibility"] == "public"
        assert "id" in data
        assert "created_at" in data

    def test_create_post_unauthenticated(self, db_session):
        """Test creating a post without authentication should fail."""
        post_data = {
            "content": "Test post content",
            "visibility": "public",
        }

        response = self.client.post("/api/v1/posts", json=post_data)

        assert response.status_code == 403  # Forbidden

    def test_get_post_by_id_public(self, db_session, test_user):
        """Test getting a public post by ID."""
        from app.models.post import Post

        post = Post(
            user_id=test_user.id,
            content="Public post",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        response = self.client.get(f"/api/v1/posts/{post.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(post.id)
        assert data["content"] == "Public post"

    def test_get_post_by_id_private_as_owner(self, db_session, test_user):
        """Test getting a private post by ID as owner."""
        from app.models.post import Post

        post = Post(
            user_id=test_user.id,
            content="Private post",
            visibility="private",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        # Mock authentication
        mock_user = {"sub": test_user.auth0_id}

        with patch("app.api.posts.get_current_user_optional", return_value=mock_user):
            response = self.client.get(f"/api/v1/posts/{post.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(post.id)
        assert data["content"] == "Private post"

    def test_get_post_by_id_private_as_other_user(self, db_session, test_user):
        """Test getting a private post by ID as another user should fail."""
        from app.models.post import Post
        from app.models.user import User

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

        # Mock authentication as other user
        mock_user = {"sub": other_user.auth0_id}

        with patch("app.api.posts.get_current_user_optional", return_value=mock_user):
            response = self.client.get(f"/api/v1/posts/{post.id}")

        assert response.status_code == 404  # Not found (private post)

    def test_update_post_as_owner(self, db_session, test_user):
        """Test updating a post as the owner."""
        from app.models.post import Post

        post = Post(
            user_id=test_user.id,
            content="Original content",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        # Mock authentication
        mock_user = {"sub": test_user.auth0_id}

        update_data = {
            "content": "Updated content",
            "visibility": "followers_only",
        }

        with patch("app.api.posts.get_current_user", return_value=mock_user):
            response = self.client.put(f"/api/v1/posts/{post.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "Updated content"
        assert data["visibility"] == "followers_only"

    def test_update_post_delete_images(self, db_session, test_user):
        """Test updating a post to delete all images via API."""
        print("\n[TEST] test_update_post_delete_images (API): Starting...")
        from app.models.post import Post, PostImage

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
        images_before = db_session.query(PostImage).filter(PostImage.post_id == post.id).all()
        assert len(images_before) == 2
        print(f"[TEST] ✓ Found {len(images_before)} images before update")

        # Mock authentication
        print("[TEST] Mocking authentication...")
        mock_user = {"sub": test_user.auth0_id}

        # Update post with empty image_urls to delete all images
        print("[TEST] Calling API to delete all images...")
        update_data = {
            "image_urls": [],
        }

        with patch("app.api.posts.get_current_user", return_value=mock_user):
            response = self.client.put(f"/api/v1/posts/{post.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        print(f"[TEST] ✓ API call successful (status: {response.status_code})")
        
        # Verify images are deleted in response
        print("[TEST] Verifying images are deleted in API response...")
        assert "images" in data
        assert len(data["images"]) == 0
        print(f"[TEST] ✓ API response shows {len(data['images'])} images")

        # Verify images are deleted in database
        print("[TEST] Verifying images are deleted in database...")
        images_after = db_session.query(PostImage).filter(PostImage.post_id == post.id).all()
        assert len(images_after) == 0
        print(f"[TEST] ✓ Database shows {len(images_after)} images")
        print("[TEST] test_update_post_delete_images (API): PASSED ✓\n")

    def test_update_post_replace_images(self, db_session, test_user):
        """Test updating a post to replace images via API."""
        print("\n[TEST] test_update_post_replace_images (API): Starting...")
        from app.models.post import Post, PostImage

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

        # Mock authentication
        print("[TEST] Mocking authentication...")
        mock_user = {"sub": test_user.auth0_id}

        # Update post with new images
        print("[TEST] Calling API to replace images with 3 new images...")
        update_data = {
            "image_urls": [
                "https://example.com/new1.jpg",
                "https://example.com/new2.jpg",
                "https://example.com/new3.jpg"
            ],
        }

        with patch("app.api.posts.get_current_user", return_value=mock_user):
            response = self.client.put(f"/api/v1/posts/{post.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        print(f"[TEST] ✓ API call successful (status: {response.status_code})")
        
        # Verify new images are in response
        print("[TEST] Verifying new images in API response...")
        assert "images" in data
        assert len(data["images"]) == 3
        assert data["images"][0]["image_url"] == "https://example.com/new1.jpg"
        assert data["images"][1]["image_url"] == "https://example.com/new2.jpg"
        assert data["images"][2]["image_url"] == "https://example.com/new3.jpg"
        print(f"[TEST] ✓ API response shows {len(data['images'])} new images")

        # Verify old images are deleted and new images are added in database
        print("[TEST] Verifying images are replaced in database...")
        images_after = db_session.query(PostImage).filter(PostImage.post_id == post.id).order_by(PostImage.display_order).all()
        assert len(images_after) == 3
        assert images_after[0].image_url == "https://example.com/new1.jpg"
        assert images_after[1].image_url == "https://example.com/new2.jpg"
        assert images_after[2].image_url == "https://example.com/new3.jpg"
        print(f"[TEST] ✓ Database shows {len(images_after)} new images")
        print("[TEST] test_update_post_replace_images (API): PASSED ✓\n")

    def test_delete_post_as_owner(self, db_session, test_user):
        """Test deleting a post as the owner."""
        from app.models.post import Post

        post = Post(
            user_id=test_user.id,
            content="Post to delete",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        # Mock authentication
        mock_user = {"sub": test_user.auth0_id}

        with patch("app.api.posts.get_current_user", return_value=mock_user):
            response = self.client.delete(f"/api/v1/posts/{post.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Post deleted successfully"

        # Verify post is soft deleted
        db_session.refresh(post)
        assert post.is_active is False

    def test_like_post_authenticated(self, db_session, test_user):
        """Test liking a post with authentication."""
        from app.models.post import Post

        post = Post(
            user_id=test_user.id,
            content="Post to like",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        # Mock authentication
        mock_user = {"sub": test_user.auth0_id}

        like_data = {"reaction_type": "like"}

        with patch("app.api.posts.get_current_user", return_value=mock_user):
            response = self.client.post(
                f"/api/v1/posts/{post.id}/likes", json=like_data
            )

        assert response.status_code == 201
        data = response.json()
        assert data["post_id"] == str(post.id)
        assert data["user_id"] == str(test_user.id)
        assert data["reaction_type"] == "like"

    def test_create_comment_authenticated(self, db_session, test_user):
        """Test creating a comment with authentication."""
        from app.models.post import Post

        post = Post(
            user_id=test_user.id,
            content="Post to comment on",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        # Mock authentication
        mock_user = {"sub": test_user.auth0_id}

        comment_data = {"content": "Test comment"}

        with patch("app.api.posts.get_current_user", return_value=mock_user):
            response = self.client.post(
                f"/api/v1/posts/{post.id}/comments", json=comment_data
            )

        assert response.status_code == 201
        data = response.json()
        assert data["post_id"] == str(post.id)
        assert data["user_id"] == str(test_user.id)
        assert data["content"] == "Test comment"

