"""add follow table

Revision ID: add_follow_table_20251110
Revises: add_post_tables_20251109
Create Date: 2025-11-10

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "add_follow_table_20251110"
down_revision = "add_post_tables_20251109"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create follows table
    op.create_table(
        "follows",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("follower_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("following_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["follower_id"],
            ["users.id"],
            name="fk_follows_follower_id_users",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["following_id"],
            ["users.id"],
            name="fk_follows_following_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_follows"),
        sa.UniqueConstraint(
            "follower_id", "following_id", name="uq_follower_following"
        ),
    )

    # Create indexes for better query performance
    op.create_index("ix_follows_follower_id", "follows", ["follower_id"])
    op.create_index("ix_follows_following_id", "follows", ["following_id"])
    op.create_index(
        "ix_follows_follower_following",
        "follows",
        ["follower_id", "following_id"],
        unique=True,
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index("ix_follows_follower_following", table_name="follows")
    op.drop_index("ix_follows_following_id", table_name="follows")
    op.drop_index("ix_follows_follower_id", table_name="follows")

    # Drop follows table
    op.drop_table("follows")
