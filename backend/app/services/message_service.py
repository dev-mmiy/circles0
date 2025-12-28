"""
Message service for business logic related to direct messages and conversations.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.block import Block
from app.models.message import Conversation, Message, MessageRead
from app.models.user import User
from app.schemas.message import MessageCreate
from app.services.block_service import BlockService
from app.services.notification_broadcaster import broadcaster
from app.services.notification_service import NotificationService


class MessageService:
    """Service for message-related operations."""

    @staticmethod
    def get_or_create_conversation(
        db: Session, user1_id: UUID, user2_id: UUID
    ) -> Conversation:
        """
        Get existing conversation between two users or create a new one.

        Args:
            db: Database session
            user1_id: First user ID
            user2_id: Second user ID

        Returns:
            Conversation object

        Raises:
            ValueError: If users are blocked
        """
        # Check if users are blocked
        if BlockService.are_blocked(db, user1_id, user2_id):
            raise ValueError("Cannot create conversation: users are blocked")

        # Ensure consistent ordering (smaller UUID first)
        if user1_id > user2_id:
            user1_id, user2_id = user2_id, user1_id

        # Try to find existing conversation
        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.user1_id == user1_id,
                Conversation.user2_id == user2_id,
            )
            .first()
        )

        if not conversation:
            # Create new conversation
            conversation = Conversation(
                user1_id=user1_id,
                user2_id=user2_id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)

        return conversation

    @staticmethod
    def send_message(
        db: Session, sender_id: UUID, message_data: MessageCreate
    ) -> Message:
        """
        Send a message to another user.

        Args:
            db: Database session
            sender_id: ID of the user sending the message
            message_data: Message data

        Returns:
            Created Message object

        Raises:
            ValueError: If users are blocked or recipient not found
        """
        # Check if recipient exists
        recipient = db.query(User).filter(User.id == message_data.recipient_id).first()
        if not recipient:
            raise ValueError("Recipient not found")

        # Check if users are blocked
        if BlockService.are_blocked(db, sender_id, message_data.recipient_id):
            raise ValueError("Cannot send message: users are blocked")

        # Get or create conversation
        conversation = MessageService.get_or_create_conversation(
            db, sender_id, message_data.recipient_id
        )

        # Create message
        message = Message(
            conversation_id=conversation.id,
            sender_id=sender_id,
            content=message_data.content,
            image_url=message_data.image_url,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(message)
        db.commit()

        # Update conversation's last_message_at
        conversation.last_message_at = datetime.utcnow()
        conversation.updated_at = datetime.utcnow()
        db.commit()

        # Load sender information for broadcast
        db.refresh(message)
        message = (
            db.query(Message)
            .options(joinedload(Message.sender))
            .filter(Message.id == message.id)
            .first()
        )

        # Create notification for the recipient in a separate transaction
        # Don't fail message sending if notification creation fails
        # Use a separate database session to avoid transaction conflicts
        def create_notification_in_background():
            from app.database import SessionLocal
            notification_db = SessionLocal()
            try:
                NotificationService.create_message_notification(
                    db=notification_db,
                    sender_id=sender_id,
                    recipient_id=message_data.recipient_id,
                )
            except Exception as e:
                # Log error but don't fail the message sending
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to create message notification: {e}", exc_info=True)
            finally:
                notification_db.close()
        
        # Run notification creation in background thread to not block response
        import threading
        thread = threading.Thread(target=create_notification_in_background)
        thread.daemon = True
        thread.start()

        # Broadcast message to both sender and recipient via SSE
        # Run in background to not block the response
        import asyncio

        asyncio.create_task(
            MessageService._broadcast_message(
                message, sender_id, message_data.recipient_id
            )
        )

        return message

    @staticmethod
    async def _broadcast_message(message: Message, sender_id: UUID, recipient_id: UUID):
        """
        Broadcast a message to real-time SSE connections.

        Args:
            message: The message object to broadcast (should have sender loaded)
            sender_id: ID of the sender
            recipient_id: ID of the recipient
        """
        # Format sender data
        sender_data = None
        if message.sender:
            sender_data = {
                "id": str(message.sender.id),
                "nickname": message.sender.nickname,
                "username": message.sender.username,
                "avatar_url": message.sender.avatar_url,
            }

        # Format message data for SSE
        message_data = {
            "id": str(message.id),
            "conversation_id": str(message.conversation_id),
            "sender_id": str(message.sender_id),
            "content": message.content,
            "image_url": message.image_url,
            "is_deleted": message.is_deleted,
            "created_at": message.created_at.isoformat() + "Z",
            "updated_at": message.updated_at.isoformat() + "Z",
            "sender": sender_data,
        }

        # Broadcast to both sender and recipient
        # This allows both users to see the message in real-time
        await broadcaster.broadcast_to_user(sender_id, "message", message_data)
        await broadcaster.broadcast_to_user(recipient_id, "message", message_data)

    @staticmethod
    def get_conversations(
        db: Session,
        user_id: UUID,
        skip: int = 0,
        limit: int = 20,
    ) -> List[Conversation]:
        """
        Get all conversations for a user.

        Args:
            db: Database session
            user_id: User ID
            skip: Number of conversations to skip
            limit: Maximum number of conversations to return

        Returns:
            List of conversations
        """
        # Get conversations where user is user1 or user2
        # Exclude conversations that user has deleted
        # Note: We don't use joinedload for messages here to avoid loading all messages
        # Instead, we load the last message separately for each conversation
        query = (
            db.query(Conversation)
            .options(
                joinedload(Conversation.user1),
                joinedload(Conversation.user2),
            )
            .filter(
                or_(
                    and_(
                        Conversation.user1_id == user_id,
                        Conversation.user1_deleted_at.is_(None),
                    ),
                    and_(
                        Conversation.user2_id == user_id,
                        Conversation.user2_deleted_at.is_(None),
                    ),
                )
            )
            .order_by(desc(Conversation.last_message_at))
            .offset(skip)
            .limit(limit)
        )

        conversations = query.all()

        if not conversations:
            return conversations

        # Filter out conversations with blocked users
        # Get all blocked user IDs (both directions) in one query
        from app.models.block import Block
        blocked_user_ids = set()
        blocked_relationships = (
            db.query(Block)
            .filter(
                or_(
                    Block.blocker_id == user_id,
                    Block.blocked_id == user_id,
                ),
                Block.is_active == True,
            )
            .all()
        )
        # Build set of blocked user IDs (the "other" user in each block relationship)
        for block in blocked_relationships:
            if block.blocker_id == user_id:
                # Current user blocked this user
                blocked_user_ids.add(block.blocked_id)
            else:
                # This user blocked current user
                blocked_user_ids.add(block.blocker_id)

        # Filter conversations in memory (much faster than N queries)
        # Set lookup is O(1), so this is O(n) where n is number of conversations
        conversations = [
            conv for conv in conversations
            if (conv.user1_id != user_id and conv.user1_id not in blocked_user_ids) or
               (conv.user2_id != user_id and conv.user2_id not in blocked_user_ids)
        ]

        if not conversations:
            return conversations

        # Performance Optimization: Load all last messages in a single query using window function
        # This avoids N+1 query problem where we would query for last message per conversation
        # individually. Instead, we use SQL window functions to get the latest message
        # for all conversations in a single query.
        #
        # Without this optimization:
        # - For 20 conversations, we would execute 20 queries (one per conversation)
        # - This results in 20+ database queries for a single conversation list request
        #
        # With this optimization:
        # - We execute only 2 queries total (window function subquery + message fetch)
        # - This reduces database load and improves response time significantly
        conversation_ids = [conv.id for conv in conversations]
        
        # Step 1: Create a subquery that assigns row numbers to messages within each conversation
        # ROW_NUMBER() window function partitions by conversation_id and orders by created_at DESC
        # This gives us rn=1 for the latest message in each conversation.
        #
        # Example SQL generated:
        # SELECT id, conversation_id, ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at DESC) as rn
        # FROM messages
        # WHERE conversation_id IN (...) AND is_deleted = False
        latest_messages_subquery = (
            db.query(
                Message.id,
                Message.conversation_id,
                func.row_number()
                .over(
                    partition_by=Message.conversation_id,
                    order_by=desc(Message.created_at)
                )
                .label('rn')
            )
            .filter(
                Message.conversation_id.in_(conversation_ids),
                Message.is_deleted == False,
            )
            .subquery()
        )
        
        # Step 2: Filter to get only the latest message (rn=1) for each conversation
        latest_message_ids = (
            db.query(latest_messages_subquery.c.id)
            .filter(latest_messages_subquery.c.rn == 1)
            .all()
        )
        
        if latest_message_ids:
            message_ids = [row[0] for row in latest_message_ids]
            
            # Step 3: Load all latest messages with their relationships (sender, reads) in a single query
            # Using joinedload to eagerly load relationships prevents additional queries
            last_messages = (
                db.query(Message)
                .options(
                    joinedload(Message.sender),
                    joinedload(Message.reads),
                )
                .filter(Message.id.in_(message_ids))
                .all()
            )
            
            # Step 4: Map messages to their conversations
            # This creates a dictionary for O(1) lookup when assigning messages to conversations
            messages_by_conversation = {msg.conversation_id: msg for msg in last_messages}
            for conversation in conversations:
                if conversation.id in messages_by_conversation:
                    conversation.messages = [messages_by_conversation[conversation.id]]

        return conversations

    @staticmethod
    def get_conversation_by_id(
        db: Session, conversation_id: UUID, user_id: UUID
    ) -> Optional[Conversation]:
        """
        Get a conversation by ID.

        Args:
            db: Database session
            conversation_id: Conversation ID
            user_id: User ID (must be a participant)

        Returns:
            Conversation object or None if not found or user is not a participant
        """
        conversation = (
            db.query(Conversation)
            .options(
                joinedload(Conversation.user1),
                joinedload(Conversation.user2),
            )
            .filter(Conversation.id == conversation_id)
            .first()
        )

        if not conversation:
            return None

        # Check if user is a participant
        if conversation.user1_id != user_id and conversation.user2_id != user_id:
            return None

        # Check if user has deleted this conversation
        if (
            conversation.user1_id == user_id
            and conversation.user1_deleted_at is not None
        ) or (
            conversation.user2_id == user_id
            and conversation.user2_deleted_at is not None
        ):
            return None

        return conversation

    @staticmethod
    def get_messages(
        db: Session,
        conversation_id: UUID,
        user_id: UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Message]:
        """
        Get messages in a conversation.

        Args:
            db: Database session
            conversation_id: Conversation ID
            user_id: User ID (must be a participant)
            skip: Number of messages to skip
            limit: Maximum number of messages to return

        Returns:
            List of messages
        """
        # Verify user is a participant
        conversation = MessageService.get_conversation_by_id(
            db, conversation_id, user_id
        )
        if not conversation:
            return []

        # Check if users are blocked
        other_user_id = conversation.user1_id if conversation.user2_id == user_id else conversation.user2_id
        if BlockService.are_blocked(db, user_id, other_user_id):
            # If users are blocked, return empty list (don't show messages)
            return []

        # Get messages
        messages = (
            db.query(Message)
            .options(joinedload(Message.sender), joinedload(Message.reads))
            .filter(
                Message.conversation_id == conversation_id,
                Message.is_deleted == False,
            )
            .order_by(desc(Message.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

        # Reverse to show oldest first
        messages.reverse()

        return messages

    @staticmethod
    def search_messages(
        db: Session,
        conversation_id: UUID,
        user_id: UUID,
        query: str,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Message]:
        """
        Search messages in a conversation by content.

        Args:
            db: Database session
            conversation_id: Conversation ID
            user_id: User ID (must be a participant)
            query: Search query string
            skip: Number of messages to skip
            limit: Maximum number of messages to return

        Returns:
            List of messages matching the query
        """
        # Verify user is a participant
        conversation = MessageService.get_conversation_by_id(
            db, conversation_id, user_id
        )
        if not conversation:
            return []

        # Check if users are blocked
        other_user_id = conversation.user1_id if conversation.user2_id == user_id else conversation.user2_id
        if BlockService.are_blocked(db, user_id, other_user_id):
            # If users are blocked, return empty list (don't show messages)
            return []

        # Search messages by content (case-insensitive partial match)
        messages = (
            db.query(Message)
            .options(joinedload(Message.sender), joinedload(Message.reads))
            .filter(
                Message.conversation_id == conversation_id,
                Message.is_deleted == False,
                Message.content.ilike(f"%{query}%"),
            )
            .order_by(desc(Message.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

        # Reverse to show oldest first
        messages.reverse()

        return messages

    @staticmethod
    def count_conversations(
        db: Session,
        user_id: UUID,
    ) -> int:
        """
        Count total conversations for a user (excluding blocked users).

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Total number of conversations
        """
        # Get all blocked user IDs (both directions) in one query
        from app.models.block import Block
        blocked_user_ids = set()
        blocked_relationships = (
            db.query(Block)
            .filter(
                or_(
                    Block.blocker_id == user_id,
                    Block.blocked_id == user_id,
                ),
                Block.is_active == True,
            )
            .all()
        )
        # Build set of blocked user IDs (the "other" user in each block relationship)
        for block in blocked_relationships:
            if block.blocker_id == user_id:
                # Current user blocked this user
                blocked_user_ids.add(block.blocked_id)
            else:
                # This user blocked current user
                blocked_user_ids.add(block.blocker_id)

        # Build query with filters
        query = db.query(Conversation).filter(
                or_(
                    and_(
                        Conversation.user1_id == user_id,
                        Conversation.user1_deleted_at.is_(None),
                    ),
                    and_(
                        Conversation.user2_id == user_id,
                        Conversation.user2_deleted_at.is_(None),
                    ),
                )
            )

        # Filter out conversations with blocked users if any exist
        if blocked_user_ids:
            blocked_list = list(blocked_user_ids)
            query = query.filter(
                ~(
                    and_(
                        Conversation.user1_id == user_id,
                        Conversation.user2_id.in_(blocked_list),
                    )
                ),
                ~(
                    and_(
                        Conversation.user2_id == user_id,
                        Conversation.user1_id.in_(blocked_list),
                    )
                ),
            )

        count = query.count()
        return count or 0

    @staticmethod
    def count_messages(
        db: Session,
        conversation_id: UUID,
        user_id: UUID,
    ) -> int:
        """
        Count total messages in a conversation.

        Args:
            db: Database session
            conversation_id: Conversation ID
            user_id: User ID (must be a participant)

        Returns:
            Total number of messages (0 if users are blocked)
        """
        # Verify user is a participant
        conversation = MessageService.get_conversation_by_id(
            db, conversation_id, user_id
        )
        if not conversation:
            return 0

        # Check if users are blocked
        other_user_id = conversation.user1_id if conversation.user2_id == user_id else conversation.user2_id
        if BlockService.are_blocked(db, user_id, other_user_id):
            # If users are blocked, return 0
            return 0

        count = (
            db.query(func.count(Message.id))
            .filter(
                Message.conversation_id == conversation_id,
                Message.is_deleted == False,
            )
            .scalar()
        )
        return count or 0

    @staticmethod
    def count_search_messages(
        db: Session,
        conversation_id: UUID,
        user_id: UUID,
        query: str,
    ) -> int:
        """
        Count total messages matching search query in a conversation.

        Args:
            db: Database session
            conversation_id: Conversation ID
            user_id: User ID (must be a participant)
            query: Search query string

        Returns:
            Total number of matching messages (0 if users are blocked)
        """
        # Verify user is a participant
        conversation = MessageService.get_conversation_by_id(
            db, conversation_id, user_id
        )
        if not conversation:
            return 0

        # Check if users are blocked
        other_user_id = conversation.user1_id if conversation.user2_id == user_id else conversation.user2_id
        if BlockService.are_blocked(db, user_id, other_user_id):
            # If users are blocked, return 0
            return 0

        count = (
            db.query(func.count(Message.id))
            .filter(
                Message.conversation_id == conversation_id,
                Message.is_deleted == False,
                Message.content.ilike(f"%{query}%"),
            )
            .scalar()
        )
        return count or 0

    @staticmethod
    def mark_messages_as_read(
        db: Session,
        conversation_id: UUID,
        reader_id: UUID,
        message_ids: Optional[List[UUID]] = None,
    ) -> int:
        """
        Mark messages as read.

        Args:
            db: Database session
            conversation_id: Conversation ID
            reader_id: ID of the user marking messages as read
            message_ids: Specific message IDs to mark as read. If None, marks all unread messages.

        Returns:
            Number of messages marked as read
        """
        # Verify user is a participant
        conversation = MessageService.get_conversation_by_id(
            db, conversation_id, reader_id
        )
        if not conversation:
            return 0

        # Get messages to mark as read
        if message_ids:
            # Mark specific messages
            query = db.query(Message).filter(
                Message.conversation_id == conversation_id,
                Message.id.in_(message_ids),
                Message.sender_id != reader_id,  # Don't mark own messages as read
                Message.is_deleted == False,
            )
        else:
            # Mark all unread messages in conversation
            query = db.query(Message).filter(
                Message.conversation_id == conversation_id,
                Message.sender_id != reader_id,  # Don't mark own messages as read
                Message.is_deleted == False,
            )

        messages = query.all()

        # Step 1: Filter out already read messages to avoid duplicate MessageRead records
        # Query all existing MessageRead records for these messages in a single query
        # This prevents creating duplicate read records and improves performance
        already_read_message_ids = {
            mr.message_id
            for mr in db.query(MessageRead)
            .filter(
                MessageRead.reader_id == reader_id,
                MessageRead.message_id.in_([m.id for m in messages]),
            )
            .all()
        }

        # Filter to only messages that haven't been read yet
        messages_to_mark = [m for m in messages if m.id not in already_read_message_ids]

        # Step 2: Create MessageRead records for unread messages
        # Each MessageRead record tracks when a specific message was read by a specific user
        marked_count = 0
        for message in messages_to_mark:
            message_read = MessageRead(
                message_id=message.id,
                reader_id=reader_id,
                read_at=datetime.utcnow(),
            )
            db.add(message_read)
            marked_count += 1

        db.commit()

        return marked_count

    @staticmethod
    def delete_conversation(db: Session, conversation_id: UUID, user_id: UUID) -> bool:
        """
        Delete a conversation for a user (soft delete).

        Args:
            db: Database session
            conversation_id: Conversation ID
            user_id: User ID

        Returns:
            True if deleted, False if not found or user is not a participant
        """
        conversation = MessageService.get_conversation_by_id(
            db, conversation_id, user_id
        )
        if not conversation:
            return False

        # Mark conversation as deleted for this user
        if conversation.user1_id == user_id:
            conversation.user1_deleted_at = datetime.utcnow()
        else:
            conversation.user2_deleted_at = datetime.utcnow()

        conversation.updated_at = datetime.utcnow()
        db.commit()

        return True

    @staticmethod
    def delete_message(db: Session, message_id: UUID, user_id: UUID) -> bool:
        """
        Delete a message (soft delete).

        Args:
            db: Database session
            message_id: Message ID
            user_id: User ID (must be the sender)

        Returns:
            True if deleted, False if not found or user is not the sender
        """
        message = (
            db.query(Message)
            .filter(Message.id == message_id, Message.sender_id == user_id)
            .first()
        )

        if not message:
            return False

        message.is_deleted = True
        message.updated_at = datetime.utcnow()
        db.commit()

        return True

    @staticmethod
    def get_unread_count(db: Session, conversation_id: UUID, user_id: UUID) -> int:
        """
        Get unread message count for a conversation.

        Args:
            db: Database session
            conversation_id: Conversation ID
            user_id: User ID

        Returns:
            Number of unread messages
        """
        # Verify user is a participant (optimized - just check if conversation exists)
        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.id == conversation_id,
                or_(
                    Conversation.user1_id == user_id,
                    Conversation.user2_id == user_id,
                ),
            )
            .first()
        )
        if not conversation:
            return 0

        # Optimized: Use COUNT with LEFT JOIN instead of loading all message IDs
        # This approach is much more efficient than:
        # 1. Loading all messages and checking read status individually (N+1 problem)
        # 2. Loading all message IDs and checking read status in Python
        #
        # Instead, we use SQL to:
        # - LEFT JOIN MessageRead to find messages that have been read
        # - Filter for messages where MessageRead.id IS NULL (unread messages)
        # - Count in a single database query
        #
        # Performance: O(1) database query instead of O(n) queries
        unread_count = (
            db.query(func.count(Message.id))
            .select_from(Message)
            .outerjoin(
                MessageRead,
                and_(
                    MessageRead.message_id == Message.id,
                    MessageRead.reader_id == user_id,
                ),
            )
            .filter(
                Message.conversation_id == conversation_id,
                Message.sender_id != user_id,  # Don't count own messages
                Message.is_deleted == False,
                MessageRead.id.is_(None),  # Messages that haven't been read (no MessageRead record)
            )
            .scalar()
        )

        return unread_count or 0
