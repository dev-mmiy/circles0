"""add hashtag tables for post hashtags

Revision ID: add_hashtag_tables_20251115
Revises: add_notification_table_20251111
Create Date: 2025-11-15

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_hashtag_tables_20251115"
down_revision: Union[str, None] = "add_notification_table_20251111"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create hashtags table
    op.create_table(
        "hashtags",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_hashtags")),
    )
    op.create_index(op.f("ix_hashtags_name"), "hashtags", ["name"], unique=True)

    # Create post_hashtags table (many-to-many relationship)
    op.create_table(
        "post_hashtags",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("hashtag_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["post_id"],
            ["posts.id"],
            name=op.f("fk_post_hashtags_post_id_posts"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["hashtag_id"],
            ["hashtags.id"],
            name=op.f("fk_post_hashtags_hashtag_id_hashtags"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_post_hashtags")),
        sa.UniqueConstraint("post_id", "hashtag_id", name=op.f("uq_post_hashtag")),
    )
    op.create_index(op.f("ix_post_hashtags_post_id"), "post_hashtags", ["post_id"])
    op.create_index(
        op.f("ix_post_hashtags_hashtag_id"), "post_hashtags", ["hashtag_id"]
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f("ix_post_hashtags_hashtag_id"), table_name="post_hashtags")
    op.drop_index(op.f("ix_post_hashtags_post_id"), table_name="post_hashtags")
    op.drop_index(op.f("ix_hashtags_name"), table_name="hashtags")

    # Drop tables
    op.drop_table("post_hashtags")
    op.drop_table("hashtags")
