"""add mention tables for post and comment mentions

Revision ID: add_mention_tables_20251115
Revises: add_hashtag_tables_20251115
Create Date: 2025-11-15

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_mention_tables_20251115"
down_revision: Union[str, None] = "add_hashtag_tables_20251115"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create post_mentions table
    op.create_table(
        "post_mentions",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("mentioned_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["post_id"],
            ["posts.id"],
            name=op.f("fk_post_mentions_post_id_posts"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["mentioned_user_id"],
            ["users.id"],
            name=op.f("fk_post_mentions_mentioned_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_post_mentions")),
    )
    op.create_index(op.f("ix_post_mentions_post_id"), "post_mentions", ["post_id"])
    op.create_index(
        op.f("ix_post_mentions_mentioned_user_id"),
        "post_mentions",
        ["mentioned_user_id"],
    )

    # Create comment_mentions table
    op.create_table(
        "comment_mentions",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("comment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("mentioned_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["comment_id"],
            ["post_comments.id"],
            name=op.f("fk_comment_mentions_comment_id_post_comments"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["mentioned_user_id"],
            ["users.id"],
            name=op.f("fk_comment_mentions_mentioned_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_comment_mentions")),
    )
    op.create_index(
        op.f("ix_comment_mentions_comment_id"), "comment_mentions", ["comment_id"]
    )
    op.create_index(
        op.f("ix_comment_mentions_mentioned_user_id"),
        "comment_mentions",
        ["mentioned_user_id"],
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index(
        op.f("ix_comment_mentions_mentioned_user_id"), table_name="comment_mentions"
    )
    op.drop_index(op.f("ix_comment_mentions_comment_id"), table_name="comment_mentions")
    op.drop_index(
        op.f("ix_post_mentions_mentioned_user_id"), table_name="post_mentions"
    )
    op.drop_index(op.f("ix_post_mentions_post_id"), table_name="post_mentions")

    # Drop tables
    op.drop_table("comment_mentions")
    op.drop_table("post_mentions")
