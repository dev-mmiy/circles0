"""
API endpoint tests for Saved Posts API.

Uses httpx.AsyncClient for testing async endpoints.
"""

from uuid import uuid4

import pytest
import pytest_asyncio
import httpx
from asgi_lifespan import LifespanManager

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.main import app


@pytest_asyncio.fixture
async def async_client(db_session, test_user):
    """Create async client with database and auth overrides."""
    # Override database dependency
    app.dependency_overrides[get_db] = lambda: db_session
    
    async with LifespanManager(app):
        async with httpx.AsyncClient(app=app, base_url="http://test") as client:
            yield client
    
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(test_user):
    """Create mock authentication by overriding get_current_user."""
    mock_user = {"sub": test_user.auth0_id}
    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield {"Authorization": "Bearer dummy_token"}
    app.dependency_overrides.pop(get_current_user, None)


class TestSavedPostsAPI:
    """Test cases for Saved Posts API endpoints."""

    @pytest.mark.asyncio
    async def test_save_post_authenticated(self, async_client, db_session, test_user, auth_headers):
        """Test saving a post with authentication."""
        from app.models.post import Post

        # Create a post
        post = Post(
            user_id=test_user.id,
            content="Test post to save",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        response = await async_client.post(
            f"/api/v1/posts/{post.id}/save",
            headers=auth_headers
        )

        assert response.status_code == 201  # Created
        data = response.json()
        assert data["message"] == "Post saved successfully"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_save_post_unauthenticated(self, async_client, db_session, test_user):
        """Test saving a post without authentication should fail."""
        from app.models.post import Post

        # Create a post
        post = Post(
            user_id=test_user.id,
            content="Test post",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        response = await async_client.post(f"/api/v1/posts/{post.id}/save")

        assert response.status_code == 403  # Forbidden

    @pytest.mark.asyncio
    async def test_save_post_not_found(self, async_client, db_session, test_user, auth_headers):
        """Test saving a post that doesn't exist should fail."""
        non_existent_post_id = uuid4()

        response = await async_client.post(
            f"/api/v1/posts/{non_existent_post_id}/save",
            headers=auth_headers
        )

        assert response.status_code == 400  # Bad Request
        data = response.json()
        assert "not found" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_save_post_already_saved(self, async_client, db_session, test_user, auth_headers):
        """Test saving a post that is already saved should fail."""
        from app.models.post import Post, SavedPost

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
        saved_post = SavedPost(user_id=test_user.id, post_id=post.id)
        db_session.add(saved_post)
        db_session.commit()

        # Try to save again
        response = await async_client.post(
            f"/api/v1/posts/{post.id}/save",
            headers=auth_headers
        )

        assert response.status_code == 400  # Bad Request
        data = response.json()
        assert "already saved" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_unsave_post_authenticated(self, async_client, db_session, test_user, auth_headers):
        """Test unsaving a post with authentication."""
        from app.models.post import Post, SavedPost

        # Create a post
        post = Post(
            user_id=test_user.id,
            content="Test post",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        # Save the post first
        saved_post = SavedPost(user_id=test_user.id, post_id=post.id)
        db_session.add(saved_post)
        db_session.commit()

        response = await async_client.delete(
            f"/api/v1/posts/{post.id}/save",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Post unsaved successfully"

    @pytest.mark.asyncio
    async def test_unsave_post_unauthenticated(self, async_client, db_session, test_user):
        """Test unsaving a post without authentication should fail."""
        from app.models.post import Post

        # Create a post
        post = Post(
            user_id=test_user.id,
            content="Test post",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        response = await async_client.delete(f"/api/v1/posts/{post.id}/save")

        assert response.status_code == 403  # Forbidden

    @pytest.mark.asyncio
    async def test_unsave_post_not_saved(self, async_client, db_session, test_user, auth_headers):
        """Test unsaving a post that is not saved should fail."""
        from app.models.post import Post

        # Create a post
        post = Post(
            user_id=test_user.id,
            content="Test post",
            visibility="public",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        response = await async_client.delete(
            f"/api/v1/posts/{post.id}/save",
            headers=auth_headers
        )

        assert response.status_code == 404  # Not Found
        data = response.json()
        assert "not found" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_saved_posts_authenticated(self, async_client, db_session, test_user, auth_headers):
        """Test getting saved posts with authentication."""
        from app.models.post import Post, SavedPost

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

        # Save posts
        saved_post1 = SavedPost(user_id=test_user.id, post_id=post1.id)
        saved_post2 = SavedPost(user_id=test_user.id, post_id=post2.id)
        db_session.add_all([saved_post1, saved_post2])
        db_session.commit()

        response = await async_client.get(
            "/api/v1/posts/saved",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        post_ids = [p["id"] for p in data]
        assert str(post1.id) in post_ids
        assert str(post2.id) in post_ids

    @pytest.mark.asyncio
    async def test_get_saved_posts_unauthenticated(self, async_client):
        """Test getting saved posts without authentication should fail."""
        response = await async_client.get("/api/v1/posts/saved")

        assert response.status_code == 403  # Forbidden

    @pytest.mark.asyncio
    async def test_get_saved_posts_pagination(self, async_client, db_session, test_user, auth_headers):
        """Test pagination for saved posts."""
        from app.models.post import Post, SavedPost

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
        saved_posts = [
            SavedPost(user_id=test_user.id, post_id=post.id) for post in posts
        ]
        db_session.add_all(saved_posts)
        db_session.commit()

        # Get first page
        response = await async_client.get(
            "/api/v1/posts/saved?skip=0&limit=2",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

        # Get second page
        response = await async_client.get(
            "/api/v1/posts/saved?skip=2&limit=2",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    @pytest.mark.asyncio
    async def test_check_saved_posts_authenticated(self, async_client, db_session, test_user, auth_headers):
        """Test checking if posts are saved."""
        from app.models.post import Post, SavedPost

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
        post3 = Post(
            user_id=test_user.id,
            content="Post 3",
            visibility="public",
            is_active=True,
        )
        db_session.add_all([post1, post2, post3])
        db_session.commit()

        # Save post1 and post2
        saved_post1 = SavedPost(user_id=test_user.id, post_id=post1.id)
        saved_post2 = SavedPost(user_id=test_user.id, post_id=post2.id)
        db_session.add_all([saved_post1, saved_post2])
        db_session.commit()

        # Check saved posts
        post_ids = f"{post1.id}&post_ids={post2.id}&post_ids={post3.id}"
        response = await async_client.get(
            f"/api/v1/posts/saved/check?post_ids={post_ids}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "saved_post_ids" in data
        assert len(data["saved_post_ids"]) == 2
        assert str(post1.id) in data["saved_post_ids"]
        assert str(post2.id) in data["saved_post_ids"]
        assert str(post3.id) not in data["saved_post_ids"]

    @pytest.mark.asyncio
    async def test_check_saved_posts_unauthenticated(self, async_client):
        """Test checking saved posts without authentication should fail."""
        post_id = uuid4()
        response = await async_client.get(f"/api/v1/posts/saved/check?post_ids={post_id}")

        assert response.status_code == 403  # Forbidden

    @pytest.mark.asyncio
    async def test_get_saved_posts_excludes_inactive_posts(self, async_client, db_session, test_user, auth_headers):
        """Test that inactive posts are excluded from saved posts."""
        from app.models.post import Post, SavedPost

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
        saved_post = SavedPost(user_id=test_user.id, post_id=post.id)
        db_session.add(saved_post)
        db_session.commit()

        # Deactivate the post
        post.is_active = False
        db_session.commit()

        # Get saved posts - should not include inactive post
        response = await async_client.get(
            "/api/v1/posts/saved",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0
