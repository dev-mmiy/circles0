"""add message tables

Revision ID: add_message_tables_20251115
Revises: add_block_table_20251115
Create Date: 2025-11-15

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision = "add_message_tables_20251115"
down_revision = "add_block_table_20251115"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create conversations table
    op.create_table(
        "conversations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user1_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user2_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("last_message_at", sa.DateTime(), nullable=True),
        sa.Column("user1_deleted_at", sa.DateTime(), nullable=True),
        sa.Column("user2_deleted_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user1_id"],
            ["users.id"],
            name="fk_conversations_user1_id_users",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user2_id"],
            ["users.id"],
            name="fk_conversations_user2_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_conversations"),
    )

    # Create indexes for conversations
    op.create_index("ix_conversations_id", "conversations", ["id"])
    op.create_index("ix_conversations_user1_id", "conversations", ["user1_id"])
    op.create_index("ix_conversations_user2_id", "conversations", ["user2_id"])
    op.create_index(
        "ix_conversations_last_message_at", "conversations", ["last_message_at"]
    )

    # Create messages table
    op.create_table(
        "messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sender_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), server_default="false", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["conversation_id"],
            ["conversations.id"],
            name="fk_messages_conversation_id_conversations",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["sender_id"],
            ["users.id"],
            name="fk_messages_sender_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_messages"),
    )

    # Create indexes for messages
    op.create_index("ix_messages_id", "messages", ["id"])
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"])
    op.create_index("ix_messages_sender_id", "messages", ["sender_id"])
    op.create_index("ix_messages_created_at", "messages", ["created_at"])

    # Create message_reads table
    op.create_table(
        "message_reads",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("message_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reader_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "read_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["message_id"],
            ["messages.id"],
            name="fk_message_reads_message_id_messages",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["reader_id"],
            ["users.id"],
            name="fk_message_reads_reader_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_message_reads"),
    )

    # Create indexes for message_reads
    op.create_index("ix_message_reads_message_id", "message_reads", ["message_id"])
    op.create_index("ix_message_reads_reader_id", "message_reads", ["reader_id"])


def downgrade() -> None:
    # Drop indexes
    op.drop_index("ix_message_reads_reader_id", table_name="message_reads")
    op.drop_index("ix_message_reads_message_id", table_name="message_reads")
    op.drop_index("ix_messages_created_at", table_name="messages")
    op.drop_index("ix_messages_sender_id", table_name="messages")
    op.drop_index("ix_messages_conversation_id", table_name="messages")
    op.drop_index("ix_messages_id", table_name="messages")
    op.drop_index("ix_conversations_last_message_at", table_name="conversations")
    op.drop_index("ix_conversations_user2_id", table_name="conversations")
    op.drop_index("ix_conversations_user1_id", table_name="conversations")
    op.drop_index("ix_conversations_id", table_name="conversations")

    # Drop tables
    op.drop_table("message_reads")
    op.drop_table("messages")
    op.drop_table("conversations")
