"""
Direct Message models for 1-on-1 messaging between users.
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import relationship

from app.database import Base


class Conversation(Base):
    """
    Conversation model for 1-on-1 messaging.

    A conversation represents a messaging thread between two users.
    Each conversation has a unique pair of participants.
    """

    __tablename__ = "conversations"

    id = Column(
        PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4, index=True
    )
    user1_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="First participant",
    )
    user2_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Second participant",
    )
    last_message_at = Column(
        DateTime,
        nullable=True,
        index=True,
        comment="Timestamp of the last message in this conversation",
    )
    user1_deleted_at = Column(
        DateTime,
        nullable=True,
        comment="When user1 deleted this conversation",
    )
    user2_deleted_at = Column(
        DateTime,
        nullable=True,
        comment="When user2 deleted this conversation",
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    user1 = relationship(
        "User", foreign_keys=[user1_id], back_populates="conversations_as_user1"
    )
    user2 = relationship(
        "User", foreign_keys=[user2_id], back_populates="conversations_as_user2"
    )
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )

    def __repr__(self):
        return f"<Conversation {self.id} between {self.user1_id} and {self.user2_id}>"

    def get_other_user_id(self, user_id):
        """Get the ID of the other participant in the conversation."""
        if self.user1_id == user_id:
            return self.user2_id
        return self.user1_id


class Message(Base):
    """
    Message model for individual messages in a conversation.

    Messages can contain text, images (as URLs), and links.
    """

    __tablename__ = "messages"

    id = Column(
        PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4, index=True
    )
    conversation_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content = Column(Text, nullable=False, comment="Message text content")
    image_url = Column(
        String(500),
        nullable=True,
        comment="URL of an image attached to the message",
    )
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship(
        "User", foreign_keys=[sender_id], back_populates="messages_sent"
    )
    reads = relationship(
        "MessageRead",
        back_populates="message",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Message {self.id} from {self.sender_id} in conversation {self.conversation_id}>"


class MessageRead(Base):
    """
    Message read status model.

    Tracks which users have read which messages.
    """

    __tablename__ = "message_reads"

    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    message_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reader_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    read_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    message = relationship("Message", back_populates="reads")
    reader = relationship("User", foreign_keys=[reader_id])

    def __repr__(self):
        return f"<MessageRead {self.id} - message {self.message_id} read by {self.reader_id}>"


