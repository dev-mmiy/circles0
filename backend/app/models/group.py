"""
Group Chat models for group messaging between multiple users.
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import relationship

from app.database import Base


class Group(Base):
    """
    Group model for group chat.

    A group represents a chat room with multiple participants.
    Groups have a name, description, and creator.
    """

    __tablename__ = "groups"

    id = Column(
        PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4, index=True
    )
    name = Column(String(255), nullable=False, comment="Group name")
    description = Column(
        Text, nullable=True, comment="Group description"
    )
    creator_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="User who created the group",
    )
    last_message_at = Column(
        DateTime,
        nullable=True,
        index=True,
        comment="Timestamp of the last message in this group",
    )
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    creator = relationship("User", foreign_keys=[creator_id], back_populates="groups_created")
    members = relationship(
        "GroupMember",
        back_populates="group",
        cascade="all, delete-orphan",
    )
    messages = relationship(
        "GroupMessage",
        back_populates="group",
        cascade="all, delete-orphan",
        order_by="GroupMessage.created_at",
    )

    def __repr__(self):
        return f"<Group {self.id} - {self.name}>"


class GroupMember(Base):
    """
    Group member model.

    Tracks which users are members of which groups,
    and their roles (admin, member).
    """

    __tablename__ = "group_members"

    id = Column(
        PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4, index=True
    )
    group_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("groups.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_admin = Column(
        Boolean, default=False, nullable=False, comment="Whether user is a group admin"
    )
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    left_at = Column(
        DateTime,
        nullable=True,
        comment="When user left the group (null if still a member)",
    )

    # Relationships
    group = relationship("Group", back_populates="members")
    user = relationship("User", foreign_keys=[user_id], back_populates="group_memberships")

    def __repr__(self):
        return f"<GroupMember {self.id} - user {self.user_id} in group {self.group_id}>"


class GroupMessage(Base):
    """
    Group message model for individual messages in a group chat.

    Messages can contain text and images (as URLs).
    """

    __tablename__ = "group_messages"

    id = Column(
        PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4, index=True
    )
    group_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("groups.id", ondelete="CASCADE"),
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
    group = relationship("Group", back_populates="messages")
    sender = relationship(
        "User", foreign_keys=[sender_id], back_populates="group_messages_sent"
    )
    reads = relationship(
        "GroupMessageRead",
        back_populates="message",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<GroupMessage {self.id} from {self.sender_id} in group {self.group_id}>"


class GroupMessageRead(Base):
    """
    Group message read status model.

    Tracks which users have read which group messages.
    """

    __tablename__ = "group_message_reads"

    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    message_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("group_messages.id", ondelete="CASCADE"),
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
    message = relationship("GroupMessage", back_populates="reads")
    reader = relationship("User", foreign_keys=[reader_id])

    def __repr__(self):
        return f"<GroupMessageRead {self.id} - message {self.message_id} read by {self.reader_id}>"

