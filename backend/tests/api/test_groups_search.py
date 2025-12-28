import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.models.group import Group, GroupMember
from app.models.user import User
from app.auth.dependencies import get_current_user
from app.database import get_db

client = TestClient(app)

def test_search_groups(db_session: Session, test_user: User):
    # Create test groups
    group1 = Group(name="Test Group 1", description="Description for group 1", creator_id=test_user.id)
    group2 = Group(name="Another Group", description="Description for another group", creator_id=test_user.id)
    db_session.add(group1)
    db_session.add(group2)
    db_session.commit()

    # Add user as member
    member1 = GroupMember(group_id=group1.id, user_id=test_user.id, is_admin=True)
    member2 = GroupMember(group_id=group2.id, user_id=test_user.id, is_admin=True)
    db_session.add(member1)
    db_session.add(member2)
    db_session.commit()

    # Mock current user and db
    app.dependency_overrides[get_current_user] = lambda: {"sub": test_user.auth0_id}
    app.dependency_overrides[get_db] = lambda: db_session

    try:
        # Test search by name
        response = client.get("/api/v1/groups/search?q=Test")
        assert response.status_code == 200
        data = response.json()
        assert len(data["groups"]) == 1
        assert data["groups"][0]["name"] == "Test Group 1"

        # Test search by description
        response = client.get("/api/v1/groups/search?q=another")
        assert response.status_code == 200
        data = response.json()
        assert len(data["groups"]) == 1
        assert data["groups"][0]["name"] == "Another Group"

        # Test no results
        response = client.get("/api/v1/groups/search?q=NonExistent")
        assert response.status_code == 200
        data = response.json()
        assert len(data["groups"]) == 0
    finally:
        app.dependency_overrides = {}
