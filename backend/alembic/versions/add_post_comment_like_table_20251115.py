"""add post comment like table

Revision ID: add_post_comment_like_table_20251115
Revises: add_user_field_visibility_table_20251115
Create Date: 2025-11-15

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_comment_like_20251115"
down_revision: Union[str, None] = "7caed1f3ebfa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create post_comment_likes table
    op.create_table(
        "post_comment_likes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column(
            "comment_id",
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
            comment="like, support, empathy",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["comment_id"],
            ["post_comments.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("comment_id", "user_id", name="uq_comment_user_like"),
    )

    # Create indexes for efficient queries
    op.create_index(
        "ix_post_comment_likes_comment_id", "post_comment_likes", ["comment_id"]
    )
    op.create_index(
        "ix_post_comment_likes_user_id", "post_comment_likes", ["user_id"]
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index("ix_post_comment_likes_user_id", table_name="post_comment_likes")
    op.drop_index("ix_post_comment_likes_comment_id", table_name="post_comment_likes")

    # Drop table
    op.drop_table("post_comment_likes")

