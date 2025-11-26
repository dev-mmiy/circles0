"""
Groups API endpoints for group chat.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.group import Group, GroupMember, GroupMessage
from app.schemas.group import (
    AddMemberRequest,
    GroupCreate,
    GroupListResponse,
    GroupMessageCreate,
    GroupMessageListResponse,
    GroupMessageResponse,
    GroupResponse,
    GroupUpdate,
    MarkGroupMessagesReadRequest,
    MarkGroupMessagesReadResponse,
    UpdateMemberRoleRequest,
)
from app.services.group_service import GroupService
from app.services.user_service import UserService
from app.utils.auth_utils import extract_auth0_id

router = APIRouter(prefix="/groups", tags=["groups"])


def get_user_id_from_token(db: Session, current_user: dict) -> UUID:
    """
    Get database user ID from Auth0 token.

    Args:
        db: Database session
        current_user: Decoded Auth0 token

    Returns:
        User UUID from database

    Raises:
        HTTPException: If user not found
    """
    auth0_id = extract_auth0_id(current_user)
    user = UserService.get_user_by_auth0_id(db, auth0_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user.id


def _build_group_message_response(
    db: Session, message: GroupMessage, current_user_id: UUID
) -> GroupMessageResponse:
    """Build group message response with sender information and read status."""
    sender = message.sender
    sender_data = None
    if sender:
        sender_data = {
            "id": sender.id,
            "nickname": sender.nickname,
            "username": sender.username,
            "avatar_url": sender.avatar_url,
        }

    # Check if message is read by current user
    is_read = False
    read_at = None
    if message.sender_id != current_user_id:
        read_record = next(
            (r for r in message.reads if r.reader_id == current_user_id), None
        )
        if read_record:
            is_read = True
            read_at = read_record.read_at

    return GroupMessageResponse(
        id=message.id,
        group_id=message.group_id,
        sender_id=message.sender_id,
        content=message.content,
        image_url=message.image_url,
        is_deleted=message.is_deleted,
        created_at=message.created_at,
        updated_at=message.updated_at,
        sender=sender_data,
        is_read=is_read,
        read_at=read_at,
    )


def _build_group_response(
    db: Session, group: Group, current_user_id: UUID
) -> GroupResponse:
    """Build group response with creator, members, and unread count."""
    creator = None
    if group.creator:
        creator = {
            "id": group.creator.id,
            "nickname": group.creator.nickname,
            "username": group.creator.username,
            "avatar_url": group.creator.avatar_url,
        }

    # Build members list
    members = []
    for member in group.members:
        if member.left_at is not None:
            continue

        user = member.user
        user_data = None
        if user:
            user_data = {
                "id": user.id,
                "nickname": user.nickname,
                "username": user.username,
                "avatar_url": user.avatar_url,
            }

        members.append(
            {
                "id": member.id,
                "group_id": member.group_id,
                "user_id": member.user_id,
                "is_admin": member.is_admin,
                "joined_at": member.joined_at,
                "left_at": member.left_at,
                "user": user_data,
            }
        )

    # Get last message
    last_message = None
    if group.messages:
        last_message_data = group.messages[-1]
        last_message = _build_group_message_response(
            db, last_message_data, current_user_id
        )

    # Get unread count
    unread_count = GroupService.get_unread_count(db, group.id, current_user_id)

    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        avatar_url=group.avatar_url,
        creator_id=group.creator_id,
        last_message_at=group.last_message_at,
        is_deleted=group.is_deleted,
        created_at=group.created_at,
        updated_at=group.updated_at,
        creator=creator,
        members=members,
        member_count=len(members),
        last_message=last_message,
        unread_count=unread_count,
    )


# ========== Group Endpoints ==========


@router.post(
    "",
    response_model=GroupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new group",
)
async def create_group(
    group_data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Create a new group.

    The creator is automatically added as an admin member.
    """
    creator_id = get_user_id_from_token(db, current_user)

    try:
        group = GroupService.create_group(db, creator_id, group_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Fetch group with relationships
    group_with_data = (
        db.query(Group)
        .options(
            joinedload(Group.creator),
            joinedload(Group.members).joinedload(GroupMember.user),
        )
        .filter(Group.id == group.id)
        .first()
    )

    return _build_group_response(db, group_with_data, creator_id)


@router.get(
    "",
    response_model=GroupListResponse,
    summary="Get all groups for current user",
)
async def get_groups(
    skip: int = Query(0, ge=0, description="Number of groups to skip"),
    limit: int = Query(
        20, ge=1, le=100, description="Maximum number of groups to return"
    ),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get all groups for the current user.

    Returns groups ordered by last message time (most recent first).
    """
    user_id = get_user_id_from_token(db, current_user)

    groups = GroupService.get_groups(db, user_id, skip, limit)

    # Get actual total count
    total = GroupService.count_groups(db, user_id)

    return GroupListResponse(
        groups=[_build_group_response(db, group, user_id) for group in groups],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/search",
    response_model=GroupListResponse,
    summary="Search groups",
)
async def search_groups(
    q: str = Query(..., min_length=1, description="Search query"),
    skip: int = Query(0, ge=0, description="Number of groups to skip"),
    limit: int = Query(
        20, ge=1, le=100, description="Maximum number of groups to return"
    ),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Search groups by name or description.
    """
    user_id = get_user_id_from_token(db, current_user)

    groups = GroupService.search_groups(db, q, skip, limit)

    # Get actual total count for search results
    total = GroupService.count_search_groups(db, q)

    return GroupListResponse(
        groups=[_build_group_response(db, group, user_id) for group in groups],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{group_id}",
    response_model=GroupResponse,
    summary="Get a group by ID",
)
async def get_group(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get a specific group by ID.

    User must be a member of the group.
    """
    user_id = get_user_id_from_token(db, current_user)

    group = GroupService.get_group_by_id(db, group_id, user_id)

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or not accessible",
        )

    return _build_group_response(db, group, user_id)


@router.put(
    "/{group_id}",
    response_model=GroupResponse,
    summary="Update a group",
)
async def update_group(
    group_id: UUID,
    group_data: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Update a group.

    User must be an admin of the group.
    """
    user_id = get_user_id_from_token(db, current_user)

    group = GroupService.update_group(db, group_id, user_id, group_data)

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or user is not an admin",
        )

    # Fetch group with relationships
    group_with_data = (
        db.query(Group)
        .options(
            joinedload(Group.creator),
            joinedload(Group.members).joinedload(GroupMember.user),
        )
        .filter(Group.id == group.id)
        .first()
    )

    return _build_group_response(db, group_with_data, user_id)


@router.delete(
    "/{group_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a group",
)
async def delete_group(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a group (soft delete).

    User must be the creator or an admin of the group.
    """
    user_id = get_user_id_from_token(db, current_user)

    deleted = GroupService.delete_group(db, group_id, user_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or user is not authorized",
        )


# ========== Member Endpoints ==========


@router.post(
    "/{group_id}/members",
    status_code=status.HTTP_201_CREATED,
    summary="Add members to a group",
)
async def add_members(
    group_id: UUID,
    member_data: AddMemberRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Add members to a group.

    User must be an admin of the group.
    """
    admin_id = get_user_id_from_token(db, current_user)

    try:
        members = GroupService.add_members(db, group_id, admin_id, member_data.user_ids)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Return group with updated members
    group = GroupService.get_group_by_id(db, group_id, admin_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    group_with_data = (
        db.query(Group)
        .options(
            joinedload(Group.creator),
            joinedload(Group.members).joinedload(GroupMember.user),
        )
        .filter(Group.id == group.id)
        .first()
    )

    return _build_group_response(db, group_with_data, admin_id)


@router.delete(
    "/{group_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a member from a group",
)
async def remove_member(
    group_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Remove a member from a group.

    User must be an admin of the group.
    """
    admin_id = get_user_id_from_token(db, current_user)

    try:
        removed = GroupService.remove_member(db, group_id, admin_id, user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found or user is not an admin",
        )


@router.put(
    "/{group_id}/members/{user_id}/role",
    summary="Update a member's role",
)
async def update_member_role(
    group_id: UUID,
    user_id: UUID,
    role_data: UpdateMemberRoleRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Update a member's role (admin or regular member).

    User must be an admin of the group.
    """
    admin_id = get_user_id_from_token(db, current_user)

    try:
        member = GroupService.update_member_role(
            db, group_id, admin_id, user_id, role_data.is_admin
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found or user is not an admin",
        )

    # Return group with updated members
    group = GroupService.get_group_by_id(db, group_id, admin_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    group_with_data = (
        db.query(Group)
        .options(
            joinedload(Group.creator),
            joinedload(Group.members).joinedload(GroupMember.user),
        )
        .filter(Group.id == group.id)
        .first()
    )

    return _build_group_response(db, group_with_data, admin_id)


# ========== Message Endpoints ==========


@router.post(
    "/{group_id}/messages",
    response_model=GroupMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send a message to a group",
)
async def send_group_message(
    group_id: UUID,
    message_data: GroupMessageCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Send a message to a group.

    User must be a member of the group.
    """
    sender_id = get_user_id_from_token(db, current_user)

    try:
        message = GroupService.send_group_message(db, sender_id, group_id, message_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Fetch message with relationships for response
    message_with_data = (
        db.query(GroupMessage)
        .options(
            joinedload(GroupMessage.sender),
            joinedload(GroupMessage.reads),
        )
        .filter(GroupMessage.id == message.id)
        .first()
    )

    # Schedule background task to broadcast message to all group members
    # This ensures the API response is not blocked by the broadcast operation
    background_tasks.add_task(
        GroupService.broadcast_group_message_async,
        message_with_data,
        group_id,
    )

    return _build_group_message_response(db, message_with_data, sender_id)


@router.get(
    "/{group_id}/messages",
    response_model=GroupMessageListResponse,
    summary="Get messages in a group",
)
async def get_group_messages(
    group_id: UUID,
    skip: int = Query(0, ge=0, description="Number of messages to skip"),
    limit: int = Query(
        50, ge=1, le=100, description="Maximum number of messages to return"
    ),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get messages in a group.

    User must be a member of the group.
    Messages are returned in chronological order (oldest first).
    """
    user_id = get_user_id_from_token(db, current_user)

    messages = GroupService.get_group_messages(db, group_id, user_id, skip, limit)

    # Get actual total count
    total = GroupService.count_group_messages(db, group_id, user_id)

    return GroupMessageListResponse(
        messages=[
            _build_group_message_response(db, msg, user_id) for msg in messages
        ],
        total=total,
        skip=skip,
        limit=limit,
        group_id=group_id,
    )


@router.put(
    "/{group_id}/messages/read",
    response_model=MarkGroupMessagesReadResponse,
    summary="Mark group messages as read",
)
async def mark_group_messages_as_read(
    group_id: UUID,
    read_data: MarkGroupMessagesReadRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Mark messages as read in a group.

    User must be a member of the group.
    If message_ids is provided, marks only those messages.
    If message_ids is None, marks all unread messages in the group.
    """
    user_id = get_user_id_from_token(db, current_user)

    marked_count = GroupService.mark_group_messages_as_read(
        db, group_id, user_id, read_data.message_ids
    )

    # Get marked message IDs (simplified - in production, return actual IDs)
    marked_message_ids = read_data.message_ids or []

    return MarkGroupMessagesReadResponse(
        marked_count=marked_count,
        message_ids=marked_message_ids,
    )


@router.delete(
    "/{group_id}/messages/{message_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a group message",
)
async def delete_group_message(
    group_id: UUID,
    message_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a group message (soft delete).

    User must be the sender of the message or an admin of the group.
    """
    user_id = get_user_id_from_token(db, current_user)

    deleted = GroupService.delete_group_message(db, message_id, user_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found or not accessible",
        )


@router.get(
    "/{group_id}/unread-count",
    summary="Get unread message count for a group",
)
async def get_unread_count(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get unread message count for a group.

    User must be a member of the group.
    """
    user_id = get_user_id_from_token(db, current_user)

    unread_count = GroupService.get_unread_count(db, group_id, user_id)

    return {"unread_count": unread_count}


