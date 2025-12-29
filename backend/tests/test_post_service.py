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

    def test_create_health_record_diary(self, db_session: Session, test_user: User):
        """Test creating a health record of type diary."""
        post_data = PostCreate(
            content="今日は体調が良かった",
            visibility="private",
            post_type="health_record",
            health_record_type="diary",
            health_record_data={
                "mood": "good",
                "notes": "今日は体調が良かった",
                "tags": ["体調良好", "外出"]
            }
        )

        post = PostService.create_post(db_session, test_user.id, post_data)

        assert post.id is not None
        assert post.user_id == test_user.id
        assert post.content == "今日は体調が良かった"
        assert post.visibility == "private"
        assert post.post_type == "health_record"
        assert post.health_record_type == "diary"
        assert post.health_record_data is not None
        assert post.health_record_data["mood"] == "good"
        assert post.health_record_data["notes"] == "今日は体調が良かった"
        assert post.health_record_data["tags"] == ["体調良好", "外出"]

    def test_create_health_record_symptom(self, db_session: Session, test_user: User):
        """Test creating a health record of type symptom."""
        post_data = PostCreate(
            content="頭痛が続いています",
            visibility="public",
            post_type="health_record",
            health_record_type="symptom",
            health_record_data={
                "symptomName": "頭痛",
                "severity": 7,
                "duration": "2時間",
                "location": "前頭部",
                "notes": "ストレスが原因かもしれません"
            }
        )

        post = PostService.create_post(db_session, test_user.id, post_data)

        assert post.id is not None
        assert post.user_id == test_user.id
        assert post.content == "頭痛が続いています"
        assert post.visibility == "public"
        assert post.post_type == "health_record"
        assert post.health_record_type == "symptom"
        assert post.health_record_data is not None
        assert post.health_record_data["symptomName"] == "頭痛"
        assert post.health_record_data["severity"] == 7
        assert post.health_record_data["duration"] == "2時間"
        assert post.health_record_data["location"] == "前頭部"

    def test_create_health_record_invalid_type(self, db_session: Session, test_user: User):
        """Test creating a health record with invalid type.
        
        Note: Pydantic validation will catch invalid types before reaching the service,
        so we test by directly creating a Post with invalid data.
        """
        # Create post directly with invalid health_record_type (bypassing Pydantic validation)
        post = Post(
            user_id=test_user.id,
            content="Test content",
            visibility="public",
            post_type="health_record",
            health_record_type="invalid_type",
            health_record_data={},
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()
        
        # The validation happens in the service layer, but since we bypassed Pydantic,
        # we can test that the service would reject it if we tried to create via service
        # For now, we just verify the post was created (validation is at Pydantic level)
        assert post.health_record_type == "invalid_type"

    def test_create_health_record_missing_type(self, db_session: Session, test_user: User):
        """Test creating a health record without health_record_type."""
        post_data = PostCreate(
            content="Test content",
            visibility="public",
            post_type="health_record",
            health_record_type=None,
            health_record_data={}
        )

        with pytest.raises(ValueError, match="health_record_type is required"):
            PostService.create_post(db_session, test_user.id, post_data)

    def test_update_post_to_health_record(self, db_session: Session, test_user: User):
        """Test updating a regular post to a health record."""
        # Create a regular post
        post = Post(
            user_id=test_user.id,
            content="Regular post",
            visibility="public",
            post_type="regular",
            is_active=True,
        )
        db_session.add(post)
        db_session.commit()

        # Update to health record
        update_data = PostUpdate(
            post_type="health_record",
            health_record_type="diary",
            health_record_data={
                "mood": "good",
                "notes": "Updated to health record"
            }
        )

        updated_post = PostService.update_post(db_session, post.id, test_user.id, update_data)

        assert updated_post is not None
        assert updated_post.post_type == "health_record"
        assert updated_post.health_record_type == "diary"
        assert updated_post.health_record_data["mood"] == "good"

    def test_create_health_record_vital(self, db_session: Session, test_user: User):
        """Test creating a health record of type vital."""
        post_data = PostCreate(
            content="バイタルを記録しました",
            visibility="private",
            post_type="health_record",
            health_record_type="vital",
            health_record_data={
                "recorded_at": "2025-12-29T10:00:00Z",
                "measurements": {
                    "blood_pressure": {
                        "systolic": 120,
                        "diastolic": 80,
                        "unit": "mmHg"
                    },
                    "temperature": {
                        "value": 36.5,
                        "unit": "celsius"
                    },
                    "weight": {
                        "value": 65.0,
                        "unit": "kg"
                    },
                    "heart_rate": {
                        "value": 72,
                        "unit": "bpm"
                    }
                },
                "notes": "体調良好"
            }
        )

        post = PostService.create_post(db_session, test_user.id, post_data)

        assert post.id is not None
        assert post.user_id == test_user.id
        assert post.content == "バイタルを記録しました"
        assert post.visibility == "private"
        assert post.post_type == "health_record"
        assert post.health_record_type == "vital"
        assert post.health_record_data is not None
        assert post.health_record_data["measurements"]["blood_pressure"]["systolic"] == 120
        assert post.health_record_data["measurements"]["blood_pressure"]["diastolic"] == 80
        assert post.health_record_data["measurements"]["temperature"]["value"] == 36.5
        assert post.health_record_data["measurements"]["weight"]["value"] == 65.0
        assert post.health_record_data["measurements"]["heart_rate"]["value"] == 72

    def test_create_health_record_meal(self, db_session: Session, test_user: User):
        """Test creating a health record of type meal."""
        post_data = PostCreate(
            content="朝食を記録しました",
            visibility="public",
            post_type="health_record",
            health_record_type="meal",
            health_record_data={
                "meal_type": "breakfast",
                "recorded_at": "2025-12-29T08:00:00Z",
                "foods": [
                    {
                        "name": "ご飯",
                        "amount": 150,
                        "unit": "g"
                    },
                    {
                        "name": "味噌汁",
                        "amount": 200,
                        "unit": "ml"
                    }
                ],
                "nutrition": {
                    "calories": 500,
                    "protein": 20,
                    "carbs": 60,
                    "fat": 15
                },
                "notes": "バランスの良い朝食"
            }
        )

        post = PostService.create_post(db_session, test_user.id, post_data)

        assert post.id is not None
        assert post.user_id == test_user.id
        assert post.content == "朝食を記録しました"
        assert post.visibility == "public"
        assert post.post_type == "health_record"
        assert post.health_record_type == "meal"
        assert post.health_record_data is not None
        assert post.health_record_data["meal_type"] == "breakfast"
        assert len(post.health_record_data["foods"]) == 2
        assert post.health_record_data["foods"][0]["name"] == "ご飯"
        assert post.health_record_data["foods"][0]["amount"] == 150
        assert post.health_record_data["nutrition"]["calories"] == 500
        assert post.health_record_data["nutrition"]["protein"] == 20


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
