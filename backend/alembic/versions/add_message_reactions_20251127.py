"""add message reactions

Revision ID: add_message_reactions_20251127
Revises: add_notification_table_20251111
Create Date: 2025-11-27

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_message_reactions_20251127"
down_revision: Union[str, None] = "add_comment_like_20251115"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create message_reactions table
    op.create_table(
        "message_reactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "message_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "reaction_type",
            sa.String(20),
            nullable=False,
            server_default="like",
            comment="like, heart, thumbs_up, thumbs_down, laugh, sad, angry",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["message_id"],
            ["messages.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("message_id", "user_id", name="uq_message_user_reaction"),
    )

    # Create indexes for efficient queries
    op.create_index(
        "ix_message_reactions_message_id", "message_reactions", ["message_id"]
    )
    op.create_index(
        "ix_message_reactions_user_id", "message_reactions", ["user_id"]
    )

    # Create group_message_reactions table
    op.create_table(
        "group_message_reactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "message_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "reaction_type",
            sa.String(20),
            nullable=False,
            server_default="like",
            comment="like, heart, thumbs_up, thumbs_down, laugh, sad, angry",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["message_id"],
            ["group_messages.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("message_id", "user_id", name="uq_group_message_user_reaction"),
    )

    # Create indexes for efficient queries
    op.create_index(
        "ix_group_message_reactions_message_id", "group_message_reactions", ["message_id"]
    )
    op.create_index(
        "ix_group_message_reactions_user_id", "group_message_reactions", ["user_id"]
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index("ix_group_message_reactions_user_id", table_name="group_message_reactions")
    op.drop_index("ix_group_message_reactions_message_id", table_name="group_message_reactions")
    op.drop_index("ix_message_reactions_user_id", table_name="message_reactions")
    op.drop_index("ix_message_reactions_message_id", table_name="message_reactions")

    # Drop tables
    op.drop_table("group_message_reactions")
    op.drop_table("message_reactions")

