"""add group tables

Revision ID: add_group_tables_20251115
Revises: add_message_tables_20251115
Create Date: 2025-11-15

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision = "add_group_tables_20251115"
down_revision = "add_message_tables_20251115"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create groups table
    op.create_table(
        "groups",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("creator_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("last_message_at", sa.DateTime(), nullable=True),
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
            ["creator_id"],
            ["users.id"],
            name="fk_groups_creator_id_users",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_groups"),
    )

    # Create indexes for groups
    op.create_index("ix_groups_id", "groups", ["id"])
    op.create_index("ix_groups_creator_id", "groups", ["creator_id"])
    op.create_index("ix_groups_last_message_at", "groups", ["last_message_at"])

    # Create group_members table
    op.create_table(
        "group_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_admin", sa.Boolean(), server_default="false", nullable=False),
        sa.Column(
            "joined_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column("left_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["group_id"],
            ["groups.id"],
            name="fk_group_members_group_id_groups",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_group_members_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_group_members"),
        sa.UniqueConstraint("group_id", "user_id", name="uq_group_members_group_user"),
    )

    # Create indexes for group_members
    op.create_index("ix_group_members_group_id", "group_members", ["group_id"])
    op.create_index("ix_group_members_user_id", "group_members", ["user_id"])

    # Create group_messages table
    op.create_table(
        "group_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
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
            ["group_id"],
            ["groups.id"],
            name="fk_group_messages_group_id_groups",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["sender_id"],
            ["users.id"],
            name="fk_group_messages_sender_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_group_messages"),
    )

    # Create indexes for group_messages
    op.create_index("ix_group_messages_id", "group_messages", ["id"])
    op.create_index("ix_group_messages_group_id", "group_messages", ["group_id"])
    op.create_index("ix_group_messages_sender_id", "group_messages", ["sender_id"])
    op.create_index("ix_group_messages_created_at", "group_messages", ["created_at"])

    # Create group_message_reads table
    op.create_table(
        "group_message_reads",
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
            ["group_messages.id"],
            name="fk_group_message_reads_message_id_group_messages",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["reader_id"],
            ["users.id"],
            name="fk_group_message_reads_reader_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_group_message_reads"),
    )

    # Create indexes for group_message_reads
    op.create_index(
        "ix_group_message_reads_message_id", "group_message_reads", ["message_id"]
    )
    op.create_index(
        "ix_group_message_reads_reader_id", "group_message_reads", ["reader_id"]
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index("ix_group_message_reads_reader_id", table_name="group_message_reads")
    op.drop_index(
        "ix_group_message_reads_message_id", table_name="group_message_reads"
    )
    op.drop_index("ix_group_messages_created_at", table_name="group_messages")
    op.drop_index("ix_group_messages_sender_id", table_name="group_messages")
    op.drop_index("ix_group_messages_group_id", table_name="group_messages")
    op.drop_index("ix_group_messages_id", table_name="group_messages")
    op.drop_index("ix_group_members_user_id", table_name="group_members")
    op.drop_index("ix_group_members_group_id", table_name="group_members")
    op.drop_index("ix_groups_last_message_at", table_name="groups")
    op.drop_index("ix_groups_creator_id", table_name="groups")
    op.drop_index("ix_groups_id", table_name="groups")

    # Drop tables
    op.drop_table("group_message_reads")
    op.drop_table("group_messages")
    op.drop_table("group_members")
    op.drop_table("groups")


