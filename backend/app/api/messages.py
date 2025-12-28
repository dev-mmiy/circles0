"""
Messages API endpoints for direct messaging between users.
"""

import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func
from sqlalchemy.orm import Session, joinedload

logger = logging.getLogger(__name__)

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.message import Conversation, Message, MessageRead, MessageReaction
from app.schemas.message import (
    ConversationCreate,
    ConversationListResponse,
    ConversationResponse,
    MarkReadRequest,
    MarkReadResponse,
    MessageCreate,
    MessageListResponse,
    MessageReactionCreate,
    MessageReactionResponse,
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
            logger.warning(f"[_build_message_response] Error accessing message.reads: {e}")
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

    # Build reactions list
    reactions_data = []
    try:
        reactions_list = list(message.reactions) if hasattr(message, 'reactions') else []
        for reaction in reactions_list:
            reaction_user = reaction.user
            user_data = None
            if reaction_user:
                user_data = {
                    "id": reaction_user.id,
                    "nickname": reaction_user.nickname,
                    "username": reaction_user.username,
                    "avatar_url": reaction_user.avatar_url,
                }
            reactions_data.append(
                MessageReactionResponse(
                    id=reaction.id,
                    message_id=reaction.message_id,
                    user_id=reaction.user_id,
                    reaction_type=reaction.reaction_type,
                    created_at=reaction.created_at,
                    user=user_data,
                )
            )
    except Exception as e:
        logger.warning(f"[_build_message_response] Error accessing message.reactions: {e}")
        # Fallback: query the database directly
        reactions_query = (
            db.query(MessageReaction)
            .options(joinedload(MessageReaction.user))
            .filter(MessageReaction.message_id == message.id)
            .all()
        )
        for reaction in reactions_query:
            reaction_user = reaction.user
            user_data = None
            if reaction_user:
                user_data = {
                    "id": reaction_user.id,
                    "nickname": reaction_user.nickname,
                    "username": reaction_user.username,
                    "avatar_url": reaction_user.avatar_url,
                }
            reactions_data.append(
                MessageReactionResponse(
                    id=reaction.id,
                    message_id=reaction.message_id,
                    user_id=reaction.user_id,
                    reaction_type=reaction.reaction_type,
                    created_at=reaction.created_at,
                    user=user_data,
                )
            )

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
        reactions=reactions_data if reactions_data else None,
    )


def _build_conversation_response(
    db: Session, conversation, current_user_id: UUID, unread_count: int = None
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
        last_message = _build_message_response(db, last_message_data, current_user_id)

    # Use provided unread_count or fetch it if not provided (for backward compatibility)
    if unread_count is None:
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
    import time
    logger.info(f"[get_conversations] Request received: skip={skip}, limit={limit}")
    user_id = get_user_id_from_token(db, current_user)
    logger.debug(f"[get_conversations] User ID: {user_id}")

    conversations_start_time = time.time()
    conversations = MessageService.get_conversations(db, user_id, skip, limit)
    conversations_elapsed = time.time() - conversations_start_time
    logger.debug(f"[get_conversations] Conversations retrieved: count={len(conversations)} (took {conversations_elapsed:.3f}s)")

    # Get actual total count
    total = MessageService.count_conversations(db, user_id)

    # Optimize: Get all unread counts in a single query instead of N+1 queries
    # This approach uses GROUP BY with LEFT JOIN to count unread messages per conversation
    # in a single database query, rather than querying each conversation individually
    conversation_ids = [conv.id for conv in conversations]
    unread_counts = {}
    unread_counts_start_time = time.time()
    if conversation_ids:
        # Count unread messages per conversation in a single query using GROUP BY
        # LEFT JOIN MessageRead to find messages that have been read
        # Filter for messages where MessageRead.id IS NULL (unread messages)
        # GROUP BY conversation_id to get count per conversation
        unread_counts_query = (
            db.query(
                Message.conversation_id,
                func.count(Message.id).label('count')
            )
            .outerjoin(
                MessageRead,
                and_(
                    MessageRead.message_id == Message.id,
                    MessageRead.reader_id == user_id,
                )
            )
            .filter(
                Message.conversation_id.in_(conversation_ids),
                Message.sender_id != user_id,
                Message.is_deleted == False,
                MessageRead.id.is_(None),
            )
            .group_by(Message.conversation_id)
            .all()
        )
        unread_counts = {conv_id: count for conv_id, count in unread_counts_query}
    unread_counts_elapsed = time.time() - unread_counts_start_time
    logger.debug(f"[get_conversations] Unread counts fetched: {len(unread_counts)} conversations (took {unread_counts_elapsed:.3f}s)")

    # Build responses with pre-fetched unread counts
    response_build_start_time = time.time()
    response = ConversationListResponse(
        conversations=[
            _build_conversation_response(db, conv, user_id, unread_counts.get(conv.id, 0))
            for conv in conversations
        ],
        total=total,
        skip=skip,
        limit=limit,
    )
    response_build_elapsed = time.time() - response_build_start_time
    total_elapsed = time.time() - conversations_start_time
    logger.info(
        f"[get_conversations] Response built successfully: {len(conversations)} conversations "
        f"(conversations: {conversations_elapsed:.3f}s, unread_counts: {unread_counts_elapsed:.3f}s, "
        f"response_build: {response_build_elapsed:.3f}s, total: {total_elapsed:.3f}s)"
    )
    
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
            joinedload(Message.reactions).joinedload(MessageReaction.user),
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
        # Get actual total count for search results
        total = MessageService.count_search_messages(db, conversation_id, user_id, q)
    else:
        logger.info(f"[get_messages] Getting messages")
        messages = MessageService.get_messages(db, conversation_id, user_id, skip, limit)
        # Get actual total count
        total = MessageService.count_messages(db, conversation_id, user_id)

    logger.info(f"[get_messages] Messages retrieved: count={len(messages)}, total={total}")

    logger.info(f"[get_messages] Building response for {len(messages)} messages")
    # Load messages with reactions
    messages_with_reactions = (
        db.query(Message)
        .options(
            joinedload(Message.sender),
            joinedload(Message.reads),
            joinedload(Message.reactions).joinedload(MessageReaction.user),
        )
        .filter(Message.id.in_([msg.id for msg in messages]))
        .all()
    )
    # Create a map for quick lookup
    message_map = {msg.id: msg for msg in messages_with_reactions}
    # Build response using messages with reactions
    response = MessageListResponse(
        messages=[_build_message_response(db, message_map.get(msg.id, msg), user_id) for msg in messages],
        total=total,
        skip=skip,
        limit=limit,
        conversation_id=conversation_id,
    )
    logger.info(f"[get_messages] Response built successfully for conversation_id={conversation_id}")
    return response


# ========== Message Reaction Endpoints ==========


@router.post(
    "/{message_id}/reactions",
    response_model=MessageReactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add or update a reaction to a message",
)
async def add_message_reaction(
    message_id: UUID,
    reaction_data: MessageReactionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Add or update a reaction to a message.
    
    If the user has already reacted to the message, the reaction type will be updated.
    If the same reaction type is sent, the reaction will be removed (toggle off).
    """
    user_id = get_user_id_from_token(db, current_user)
    
    # Check if message exists and user has access
    message = (
        db.query(Message)
        .join(Conversation)
        .filter(
            Message.id == message_id,
            (Conversation.user1_id == user_id) | (Conversation.user2_id == user_id),
        )
        .first()
    )
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found or not accessible",
        )
    
    # Check if user already reacted
    existing_reaction = (
        db.query(MessageReaction)
        .filter(
            MessageReaction.message_id == message_id,
            MessageReaction.user_id == user_id,
        )
        .first()
    )
    
    if existing_reaction:
        # If same reaction type, remove it (toggle off)
        if existing_reaction.reaction_type == reaction_data.reaction_type:
            db.delete(existing_reaction)
            db.commit()
            from fastapi import Response
            return Response(status_code=status.HTTP_204_NO_CONTENT)
        # Otherwise, update reaction type
        existing_reaction.reaction_type = reaction_data.reaction_type
        db.commit()
        db.refresh(existing_reaction)
        
        # Load user for response
        existing_reaction = (
            db.query(MessageReaction)
            .options(joinedload(MessageReaction.user))
            .filter(MessageReaction.id == existing_reaction.id)
            .first()
        )
        
        reaction_user = existing_reaction.user
        user_data = None
        if reaction_user:
            user_data = {
                "id": reaction_user.id,
                "nickname": reaction_user.nickname,
                "username": reaction_user.username,
                "avatar_url": reaction_user.avatar_url,
            }
        
        return MessageReactionResponse(
            id=existing_reaction.id,
            message_id=existing_reaction.message_id,
            user_id=existing_reaction.user_id,
            reaction_type=existing_reaction.reaction_type,
            created_at=existing_reaction.created_at,
            user=user_data,
        )
    else:
        # Create new reaction
        new_reaction = MessageReaction(
            message_id=message_id,
            user_id=user_id,
            reaction_type=reaction_data.reaction_type,
        )
        db.add(new_reaction)
        db.commit()
        db.refresh(new_reaction)
        
        # Load user for response
        new_reaction = (
            db.query(MessageReaction)
            .options(joinedload(MessageReaction.user))
            .filter(MessageReaction.id == new_reaction.id)
            .first()
        )
        
        reaction_user = new_reaction.user
        user_data = None
        if reaction_user:
            user_data = {
                "id": reaction_user.id,
                "nickname": reaction_user.nickname,
                "username": reaction_user.username,
                "avatar_url": reaction_user.avatar_url,
            }
        
        return MessageReactionResponse(
            id=new_reaction.id,
            message_id=new_reaction.message_id,
            user_id=new_reaction.user_id,
            reaction_type=new_reaction.reaction_type,
            created_at=new_reaction.created_at,
            user=user_data,
        )


@router.delete(
    "/{message_id}/reactions",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a reaction from a message",
)
async def remove_message_reaction(
    message_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Remove a reaction from a message.
    """
    user_id = get_user_id_from_token(db, current_user)
    
    # Check if message exists and user has access
    message = (
        db.query(Message)
        .join(Conversation)
        .filter(
            Message.id == message_id,
            (Conversation.user1_id == user_id) | (Conversation.user2_id == user_id),
        )
        .first()
    )
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found or not accessible",
        )
    
    # Find and delete reaction
    reaction = (
        db.query(MessageReaction)
        .filter(
            MessageReaction.message_id == message_id,
            MessageReaction.user_id == user_id,
        )
        .first()
    )
    
    if not reaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reaction not found",
        )
    
    db.delete(reaction)
    db.commit()
    return None


@router.get(
    "/{message_id}/reactions",
    response_model=List[MessageReactionResponse],
    summary="Get all reactions for a message",
)
async def get_message_reactions(
    message_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get all reactions for a message.
    """
    user_id = get_user_id_from_token(db, current_user)
    
    # Check if message exists and user has access
    message = (
        db.query(Message)
        .join(Conversation)
        .filter(
            Message.id == message_id,
            (Conversation.user1_id == user_id) | (Conversation.user2_id == user_id),
        )
        .first()
    )
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found or not accessible",
        )
    
    # Get all reactions with user information
    reactions = (
        db.query(MessageReaction)
        .options(joinedload(MessageReaction.user))
        .filter(MessageReaction.message_id == message_id)
        .all()
    )
    
    reactions_data = []
    for reaction in reactions:
        reaction_user = reaction.user
        user_data = None
        if reaction_user:
            user_data = {
                "id": reaction_user.id,
                "nickname": reaction_user.nickname,
                "username": reaction_user.username,
                "avatar_url": reaction_user.avatar_url,
            }
        reactions_data.append(
            MessageReactionResponse(
                id=reaction.id,
                message_id=reaction.message_id,
                user_id=reaction.user_id,
                reaction_type=reaction.reaction_type,
                created_at=reaction.created_at,
                user=user_data,
            )
        )
    
    return reactions_data


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
