"""add post_image table for post images

Revision ID: add_post_image_table_20251115
Revises: add_mention_tables_20251115
Create Date: 2025-11-15

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_post_image_table_20251115"
down_revision: Union[str, None] = "add_mention_tables_20251115"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create post_images table
    op.create_table(
        "post_images",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "image_url",
            sa.String(length=500),
            nullable=False,
            comment="URL to the image file",
        ),
        sa.Column(
            "display_order",
            sa.Integer(),
            nullable=False,
            server_default="0",
            comment="Order for displaying images",
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["post_id"],
            ["posts.id"],
            name=op.f("fk_post_images_post_id_posts"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_post_images")),
    )
    op.create_index(op.f("ix_post_images_post_id"), "post_images", ["post_id"])


def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f("ix_post_images_post_id"), table_name="post_images")

    # Drop tables
    op.drop_table("post_images")
