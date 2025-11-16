"""add block table

Revision ID: add_block_table_20251115
Revises: add_push_subscription_table_20251115
Create Date: 2025-11-15

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "add_block_table_20251115"
down_revision = "add_push_sub_20251115"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create blocks table
    op.create_table(
        "blocks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("blocker_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("blocked_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["blocker_id"],
            ["users.id"],
            name="fk_blocks_blocker_id_users",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["blocked_id"],
            ["users.id"],
            name="fk_blocks_blocked_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_blocks"),
        sa.UniqueConstraint(
            "blocker_id", "blocked_id", name="uq_blocker_blocked"
        ),
    )

    # Create indexes for better query performance
    op.create_index("ix_blocks_blocker_id", "blocks", ["blocker_id"])
    op.create_index("ix_blocks_blocked_id", "blocks", ["blocked_id"])
    op.create_index(
        "ix_blocks_blocker_blocked",
        "blocks",
        ["blocker_id", "blocked_id"],
        unique=True,
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index("ix_blocks_blocker_blocked", table_name="blocks")
    op.drop_index("ix_blocks_blocked_id", table_name="blocks")
    op.drop_index("ix_blocks_blocker_id", table_name="blocks")

    # Drop blocks table
    op.drop_table("blocks")

