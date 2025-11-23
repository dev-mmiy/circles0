"""
Integration tests for message functionality.

Tests the complete flow of:
- Conversation creation
- Message sending and receiving
- Unread count calculation
- Message search
"""

from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from app.models.message import Message
from app.models.user import User
from app.schemas.message import MessageCreate
from app.services.message_service import MessageService


class TestMessageIntegration:
    """Integration tests for message functionality."""

    def test_conversation_creation_and_message_flow(
        self, db_session: Session, test_user: User
    ):
        """Test complete flow: create conversation, send messages, check unread count."""
        # Create a second user
        user2 = User(
            id=uuid4(),
            auth0_id="auth0|testuser456",
            email="testuser2@example.com",
            email_verified=True,
            nickname="testuser2",
            is_active=True,
        )
        db_session.add(user2)
        db_session.commit()
        db_session.refresh(user2)

        # Step 1: Create or get conversation
        conversation = MessageService.get_or_create_conversation(
            db_session, test_user.id, user2.id
        )
        assert conversation is not None
        assert conversation.user1_id in (test_user.id, user2.id)
        assert conversation.user2_id in (test_user.id, user2.id)

        # Step 2: Send message from user1 to user2
        message_data = MessageCreate(
            recipient_id=user2.id,
            content="Hello from user1",
            image_url=None,
        )
        message1 = MessageService.send_message(
            db_session, test_user.id, message_data
        )
        assert message1 is not None
        assert message1.conversation_id == conversation.id
        assert message1.sender_id == test_user.id
        assert message1.content == "Hello from user1"

        # Step 3: Check unread count for user2 (should be 1)
        unread_count = MessageService.get_unread_count(
            db_session, conversation.id, user2.id
        )
        assert unread_count == 1

        # Step 4: Send another message from user1 to user2
        message2 = MessageService.send_message(
            db_session, test_user.id, message_data
        )
        assert message2 is not None

        # Step 5: Check unread count for user2 (should be 2)
        unread_count = MessageService.get_unread_count(
            db_session, conversation.id, user2.id
        )
        assert unread_count == 2

        # Step 6: Mark messages as read
        marked_count = MessageService.mark_messages_as_read(
            db_session, conversation.id, user2.id, [message1.id, message2.id]
        )
        assert marked_count == 2

        # Step 7: Check unread count for user2 (should be 0)
        unread_count = MessageService.get_unread_count(
            db_session, conversation.id, user2.id
        )
        assert unread_count == 0

        # Step 8: Send message from user2 to user1
        message_data_reply = MessageCreate(
            recipient_id=test_user.id,
            content="Hello from user2",
            image_url=None,
        )
        message3 = MessageService.send_message(
            db_session, user2.id, message_data_reply
        )
        assert message3 is not None

        # Step 9: Check unread count for user1 (should be 1)
        unread_count = MessageService.get_unread_count(
            db_session, conversation.id, test_user.id
        )
        assert unread_count == 1

        # Step 10: Verify own messages don't count as unread
        unread_count_own = MessageService.get_unread_count(
            db_session, conversation.id, test_user.id
        )
        # Should still be 1 (message3 from user2)
        assert unread_count_own == 1

    def test_unread_count_with_multiple_conversations(
        self, db_session: Session, test_user: User
    ):
        """Test unread count calculation across multiple conversations."""
        # Create two additional users
        user2 = User(
            id=uuid4(),
            auth0_id="auth0|testuser456",
            email="testuser2@example.com",
            email_verified=True,
            nickname="testuser2",
            is_active=True,
        )
        user3 = User(
            id=uuid4(),
            auth0_id="auth0|testuser789",
            email="testuser3@example.com",
            email_verified=True,
            nickname="testuser3",
            is_active=True,
        )
        db_session.add(user2)
        db_session.add(user3)
        db_session.commit()
        db_session.refresh(user2)
        db_session.refresh(user3)

        # Create two conversations
        conv1 = MessageService.get_or_create_conversation(
            db_session, test_user.id, user2.id
        )
        conv2 = MessageService.get_or_create_conversation(
            db_session, test_user.id, user3.id
        )

        # Send messages to user2 (3 messages)
        message_data1 = MessageCreate(
            recipient_id=user2.id, content="Message 1", image_url=None
        )
        message_data2 = MessageCreate(
            recipient_id=user2.id, content="Message 2", image_url=None
        )
        message_data3 = MessageCreate(
            recipient_id=user2.id, content="Message 3", image_url=None
        )
        MessageService.send_message(db_session, test_user.id, message_data1)
        MessageService.send_message(db_session, test_user.id, message_data2)
        MessageService.send_message(db_session, test_user.id, message_data3)

        # Send messages to user3 (2 messages)
        message_data4 = MessageCreate(
            recipient_id=user3.id, content="Message 4", image_url=None
        )
        message_data5 = MessageCreate(
            recipient_id=user3.id, content="Message 5", image_url=None
        )
        MessageService.send_message(db_session, test_user.id, message_data4)
        MessageService.send_message(db_session, test_user.id, message_data5)

        # Check unread counts
        unread_count_conv1 = MessageService.get_unread_count(
            db_session, conv1.id, user2.id
        )
        unread_count_conv2 = MessageService.get_unread_count(
            db_session, conv2.id, user3.id
        )

        assert unread_count_conv1 == 3
        assert unread_count_conv2 == 2

        # Mark some messages as read in conv1
        messages_conv1 = (
            db_session.query(Message)
            .filter(Message.conversation_id == conv1.id)
            .all()
        )
        MessageService.mark_messages_as_read(
            db_session, conv1.id, user2.id, [messages_conv1[0].id]
        )

        # Check unread count again
        unread_count_conv1 = MessageService.get_unread_count(
            db_session, conv1.id, user2.id
        )
        assert unread_count_conv1 == 2  # Should be reduced by 1

    def test_message_search_integration(
        self, db_session: Session, test_user: User
    ):
        """Test message search functionality within a conversation."""
        # Create a second user
        user2 = User(
            id=uuid4(),
            auth0_id="auth0|testuser456",
            email="testuser2@example.com",
            email_verified=True,
            nickname="testuser2",
            is_active=True,
        )
        db_session.add(user2)
        db_session.commit()
        db_session.refresh(user2)

        # Create conversation
        conversation = MessageService.get_or_create_conversation(
            db_session, test_user.id, user2.id
        )

        # Send multiple messages with different content
        messages_data = [
            MessageCreate(
                recipient_id=user2.id, content="Hello world", image_url=None
            ),
            MessageCreate(
                recipient_id=user2.id, content="How are you?", image_url=None
            ),
            MessageCreate(
                recipient_id=user2.id, content="Good morning", image_url=None
            ),
            MessageCreate(
                recipient_id=user2.id, content="Hello again", image_url=None
            ),
        ]

        for msg_data in messages_data:
            MessageService.send_message(db_session, test_user.id, msg_data)

        # Search for messages containing "Hello"
        search_results = MessageService.search_messages(
            db_session, conversation.id, test_user.id, "Hello"
        )

        # Should find 2 messages: "Hello world" and "Hello again"
        assert len(search_results) == 2
        assert any(msg.content == "Hello world" for msg in search_results)
        assert any(msg.content == "Hello again" for msg in search_results)

        # Search for messages containing "morning"
        search_results = MessageService.search_messages(
            db_session, conversation.id, test_user.id, "morning"
        )

        # Should find 1 message: "Good morning"
        assert len(search_results) == 1
        assert search_results[0].content == "Good morning"

        # Search for non-existent content
        search_results = MessageService.search_messages(
            db_session, conversation.id, test_user.id, "nonexistent"
        )
        assert len(search_results) == 0

    def test_get_conversations_with_unread_counts(
        self, db_session: Session, test_user: User
    ):
        """Test getting conversations list with correct unread counts."""
        # Create two additional users
        user2 = User(
            id=uuid4(),
            auth0_id="auth0|testuser456",
            email="testuser2@example.com",
            email_verified=True,
            nickname="testuser2",
            is_active=True,
        )
        user3 = User(
            id=uuid4(),
            auth0_id="auth0|testuser789",
            email="testuser3@example.com",
            email_verified=True,
            nickname="testuser3",
            is_active=True,
        )
        db_session.add(user2)
        db_session.add(user3)
        db_session.commit()
        db_session.refresh(user2)
        db_session.refresh(user3)

        # Create conversations
        conv1 = MessageService.get_or_create_conversation(
            db_session, test_user.id, user2.id
        )
        conv2 = MessageService.get_or_create_conversation(
            db_session, test_user.id, user3.id
        )

        # Send messages to both conversations
        MessageService.send_message(
            db_session,
            test_user.id,
            MessageCreate(recipient_id=user2.id, content="Msg 1", image_url=None),
        )
        MessageService.send_message(
            db_session,
            test_user.id,
            MessageCreate(recipient_id=user2.id, content="Msg 2", image_url=None),
        )
        MessageService.send_message(
            db_session,
            test_user.id,
            MessageCreate(recipient_id=user3.id, content="Msg 3", image_url=None),
        )

        # Get conversations for user2
        conversations = MessageService.get_conversations(
            db_session, user2.id, skip=0, limit=20
        )

        # Should have 1 conversation (with test_user)
        assert len(conversations) == 1
        assert conversations[0].id == conv1.id

        # Verify unread count using the service method
        unread_count = MessageService.get_unread_count(
            db_session, conv1.id, user2.id
        )
        assert unread_count == 2

    def test_message_deletion_and_unread_count(
        self, db_session: Session, test_user: User
    ):
        """Test that deleted messages don't count toward unread count."""
        # Create a second user
        user2 = User(
            id=uuid4(),
            auth0_id="auth0|testuser456",
            email="testuser2@example.com",
            email_verified=True,
            nickname="testuser2",
            is_active=True,
        )
        db_session.add(user2)
        db_session.commit()
        db_session.refresh(user2)

        # Create conversation
        conversation = MessageService.get_or_create_conversation(
            db_session, test_user.id, user2.id
        )

        # Send 3 messages
        msg1 = MessageService.send_message(
            db_session,
            test_user.id,
            MessageCreate(recipient_id=user2.id, content="Msg 1", image_url=None),
        )
        msg2 = MessageService.send_message(
            db_session,
            test_user.id,
            MessageCreate(recipient_id=user2.id, content="Msg 2", image_url=None),
        )
        msg3 = MessageService.send_message(
            db_session,
            test_user.id,
            MessageCreate(recipient_id=user2.id, content="Msg 3", image_url=None),
        )

        # Check unread count (should be 3)
        unread_count = MessageService.get_unread_count(
            db_session, conversation.id, user2.id
        )
        assert unread_count == 3

        # Delete one message
        MessageService.delete_message(db_session, msg2.id, test_user.id)

        # Check unread count (should be 2, deleted message doesn't count)
        unread_count = MessageService.get_unread_count(
            db_session, conversation.id, user2.id
        )
        assert unread_count == 2

