"""
Message service for business logic related to direct messages and conversations.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import and_, desc, func, or_
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
            "created_at": message.created_at.isoformat(),
            "updated_at": message.updated_at.isoformat(),
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
        query = (
            db.query(Conversation)
            .options(
                joinedload(Conversation.user1),
                joinedload(Conversation.user2),
                joinedload(Conversation.messages).joinedload(Message.sender),
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

        # Load last message for each conversation
        for conversation in conversations:
            last_message = (
                db.query(Message)
                .filter(
                    Message.conversation_id == conversation.id,
                    Message.is_deleted == False,
                )
                .order_by(desc(Message.created_at))
                .first()
            )
            if last_message:
                conversation.messages = [last_message]

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

        # Filter out already read messages
        already_read_message_ids = {
            mr.message_id
            for mr in db.query(MessageRead)
            .filter(
                MessageRead.reader_id == reader_id,
                MessageRead.message_id.in_([m.id for m in messages]),
            )
            .all()
        }

        messages_to_mark = [m for m in messages if m.id not in already_read_message_ids]

        # Create MessageRead records
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
        # Verify user is a participant
        conversation = MessageService.get_conversation_by_id(
            db, conversation_id, user_id
        )
        if not conversation:
            return 0

        # Get all messages in conversation that are not from the user
        all_message_ids = [
            m.id
            for m in db.query(Message)
            .filter(
                Message.conversation_id == conversation_id,
                Message.sender_id != user_id,
                Message.is_deleted == False,
            )
            .all()
        ]

        if not all_message_ids:
            return 0

        # Get read message IDs
        read_message_ids = {
            mr.message_id
            for mr in db.query(MessageRead)
            .filter(
                MessageRead.reader_id == user_id,
                MessageRead.message_id.in_(all_message_ids),
            )
            .all()
        }

        return len(all_message_ids) - len(read_message_ids)
