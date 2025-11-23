"""
Messages API endpoints for direct messaging between users.
"""

import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

logger = logging.getLogger(__name__)

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.message import (
    ConversationCreate,
    ConversationListResponse,
    ConversationResponse,
    MarkReadRequest,
    MarkReadResponse,
    MessageCreate,
    MessageListResponse,
    MessageResponse,
)
from app.services.message_service import MessageService
from app.services.user_service import UserService
from app.utils.auth_utils import extract_auth0_id

router = APIRouter(prefix="/messages", tags=["messages"])


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


def _build_message_response(
    db: Session, message, current_user_id: UUID
) -> MessageResponse:
    """Build message response with sender information and read status."""
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
        # Access message.reads - this should be eagerly loaded via joinedload
        try:
            reads_list = list(message.reads) if hasattr(message, 'reads') else []
            read_record = next(
                (r for r in reads_list if r.reader_id == current_user_id), None
            )
            if read_record:
                is_read = True
                read_at = read_record.read_at
        except Exception as e:
            print(f"[_build_message_response] Error accessing message.reads: {e}")  # Force print to stdout
            # Fallback: query the database directly
            from app.models.message import MessageRead
            read_record = (
                db.query(MessageRead)
                .filter(
                    MessageRead.message_id == message.id,
                    MessageRead.reader_id == current_user_id,
                )
                .first()
            )
            if read_record:
                is_read = True
                read_at = read_record.read_at

    return MessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
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


def _build_conversation_response(
    db: Session, conversation, current_user_id: UUID
) -> ConversationResponse:
    """Build conversation response with other user information and unread count."""
    # Determine other user
    if conversation.user1_id == current_user_id:
        other_user_model = conversation.user2
    else:
        other_user_model = conversation.user1

    other_user = None
    if other_user_model:
        other_user = {
            "id": other_user_model.id,
            "nickname": other_user_model.nickname,
            "username": other_user_model.username,
            "avatar_url": other_user_model.avatar_url,
        }

    # Get last message
    last_message = None
    if conversation.messages:
        last_message_data = conversation.messages[-1]
        print(f"[_build_conversation_response] Building message response for conversation {conversation.id}")  # Force print to stdout
        last_message = _build_message_response(db, last_message_data, current_user_id)
        print(f"[_build_conversation_response] Message response built for conversation {conversation.id}")  # Force print to stdout

    # Get unread count (re-enabled after performance optimization)
    logger.debug(f"[_build_conversation_response] Getting unread count for conversation {conversation.id}")
    unread_count = MessageService.get_unread_count(db, conversation.id, current_user_id)
    logger.debug(f"[_build_conversation_response] Unread count: {unread_count}")

    return ConversationResponse(
        id=conversation.id,
        user1_id=conversation.user1_id,
        user2_id=conversation.user2_id,
        last_message_at=conversation.last_message_at,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        other_user=other_user,
        last_message=last_message,
        unread_count=unread_count,
    )


# ========== Conversation Endpoints ==========


@router.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new conversation",
)
async def create_conversation(
    conversation_data: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Create a new conversation with another user.

    If a conversation already exists, returns the existing conversation.
    """
    user_id = get_user_id_from_token(db, current_user)

    try:
        conversation = MessageService.get_or_create_conversation(
            db, user_id, conversation_data.recipient_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return _build_conversation_response(db, conversation, user_id)


@router.get(
    "/conversations",
    response_model=ConversationListResponse,
    summary="Get all conversations for current user",
)
async def get_conversations(
    skip: int = Query(0, ge=0, description="Number of conversations to skip"),
    limit: int = Query(
        20, ge=1, le=100, description="Maximum number of conversations to return"
    ),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get all conversations for the current user.

    Returns conversations ordered by last message time (most recent first).
    """
    logger.info(f"[get_conversations] Request received: skip={skip}, limit={limit}")
    print(f"[get_conversations] Request received: skip={skip}, limit={limit}")  # Force print to stdout
    user_id = get_user_id_from_token(db, current_user)
    logger.info(f"[get_conversations] User ID: {user_id}")

    logger.info(f"[get_conversations] Calling MessageService.get_conversations")
    conversations = MessageService.get_conversations(db, user_id, skip, limit)
    logger.info(f"[get_conversations] Conversations retrieved: count={len(conversations)}")

    total = len(conversations)  # TODO: Get actual total count

    logger.info(f"[get_conversations] Building response for {len(conversations)} conversations")
    response = ConversationListResponse(
        conversations=[
            _build_conversation_response(db, conv, user_id) for conv in conversations
        ],
        total=total,
        skip=skip,
        limit=limit,
    )
    logger.info(f"[get_conversations] Response built successfully")
    print(f"[get_conversations] Response built successfully, returning response")  # Force print to stdout
    
    # Try to serialize the response to check if there's an issue
    try:
        import json
        from fastapi.encoders import jsonable_encoder
        serialized = jsonable_encoder(response)
        print(f"[get_conversations] Response serialized successfully, size: {len(json.dumps(serialized))} bytes")  # Force print to stdout
    except Exception as e:
        print(f"[get_conversations] Error serializing response: {e}")  # Force print to stdout
        logger.error(f"[get_conversations] Error serializing response: {e}")
    
    return response


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationResponse,
    summary="Get a conversation by ID",
)
async def get_conversation(
    conversation_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get a specific conversation by ID.

    User must be a participant in the conversation.
    """
    logger.info(f"[get_conversation] Request received: conversation_id={conversation_id}")
    user_id = get_user_id_from_token(db, current_user)
    logger.info(f"[get_conversation] User ID: {user_id}")

    conversation = MessageService.get_conversation_by_id(db, conversation_id, user_id)
    logger.info(f"[get_conversation] Conversation found: {conversation is not None}")

    if not conversation:
        logger.warning(f"[get_conversation] Conversation not found or not accessible: conversation_id={conversation_id}, user_id={user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or not accessible",
        )

    logger.info(f"[get_conversation] Building response for conversation_id={conversation_id}")
    response = _build_conversation_response(db, conversation, user_id)
    logger.info(f"[get_conversation] Response built successfully for conversation_id={conversation_id}")
    return response


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a conversation",
)
async def delete_conversation(
    conversation_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a conversation for the current user (soft delete).

    User must be a participant in the conversation.
    """
    user_id = get_user_id_from_token(db, current_user)

    deleted = MessageService.delete_conversation(db, conversation_id, user_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or not accessible",
        )


# ========== Message Endpoints ==========


@router.post(
    "",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send a message",
)
async def send_message(
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Send a message to another user.

    Creates a conversation if one doesn't exist.
    """
    sender_id = get_user_id_from_token(db, current_user)

    try:
        message = MessageService.send_message(db, sender_id, message_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Fetch message with relationships
    from app.models.message import Message

    message_with_data = (
        db.query(Message)
        .options(
            joinedload(Message.sender),
            joinedload(Message.reads),
        )
        .filter(Message.id == message.id)
        .first()
    )

    return _build_message_response(db, message_with_data, sender_id)


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=MessageListResponse,
    summary="Get messages in a conversation",
)
async def get_messages(
    conversation_id: UUID,
    skip: int = Query(0, ge=0, description="Number of messages to skip"),
    limit: int = Query(
        50, ge=1, le=100, description="Maximum number of messages to return"
    ),
    q: Optional[str] = Query(None, description="Search query to filter messages by content"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get messages in a conversation.

    User must be a participant in the conversation.
    Messages are returned in chronological order (oldest first).
    If q parameter is provided, only messages matching the search query are returned.
    """
    logger.info(f"[get_messages] Request received: conversation_id={conversation_id}, skip={skip}, limit={limit}, q={q}")
    user_id = get_user_id_from_token(db, current_user)
    logger.info(f"[get_messages] User ID: {user_id}")

    if q:
        logger.info(f"[get_messages] Searching messages with query: {q}")
        messages = MessageService.search_messages(db, conversation_id, user_id, q, skip, limit)
    else:
        logger.info(f"[get_messages] Getting messages")
        messages = MessageService.get_messages(db, conversation_id, user_id, skip, limit)

    logger.info(f"[get_messages] Messages retrieved: count={len(messages)}")
    total = len(messages)  # TODO: Get actual total count

    logger.info(f"[get_messages] Building response for {len(messages)} messages")
    response = MessageListResponse(
        messages=[_build_message_response(db, msg, user_id) for msg in messages],
        total=total,
        skip=skip,
        limit=limit,
        conversation_id=conversation_id,
    )
    logger.info(f"[get_messages] Response built successfully for conversation_id={conversation_id}")
    return response


@router.put(
    "/conversations/{conversation_id}/read",
    response_model=MarkReadResponse,
    summary="Mark messages as read",
)
async def mark_messages_as_read(
    conversation_id: UUID,
    read_data: MarkReadRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Mark messages as read in a conversation.

    User must be a participant in the conversation.
    If message_ids is provided, marks only those messages.
    If message_ids is None, marks all unread messages in the conversation.
    """
    user_id = get_user_id_from_token(db, current_user)

    marked_count = MessageService.mark_messages_as_read(
        db, conversation_id, user_id, read_data.message_ids
    )

    # Get marked message IDs (simplified - in production, return actual IDs)
    marked_message_ids = read_data.message_ids or []

    return MarkReadResponse(
        marked_count=marked_count,
        message_ids=marked_message_ids,
    )


@router.delete(
    "/{message_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a message",
)
async def delete_message(
    message_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a message (soft delete).

    User must be the sender of the message.
    """
    user_id = get_user_id_from_token(db, current_user)

    deleted = MessageService.delete_message(db, message_id, user_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found or not accessible",
        )
