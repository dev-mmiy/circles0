"""add_post_comment_image_table

Revision ID: afe9f38822ff
Revises: add_course_column
Create Date: 2025-12-02 09:33:32.225897

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'afe9f38822ff'
down_revision: Union[str, None] = 'add_course_column'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create post_comment_images table
    op.create_table(
        "post_comment_images",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("comment_id", postgresql.UUID(as_uuid=True), nullable=False),
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
            ["comment_id"],
            ["post_comments.id"],
            name=op.f("fk_post_comment_images_comment_id_post_comments"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_post_comment_images")),
    )
    op.create_index(op.f("ix_post_comment_images_comment_id"), "post_comment_images", ["comment_id"])


def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f("ix_post_comment_images_comment_id"), table_name="post_comment_images")
    
    # Drop tables
    op.drop_table("post_comment_images")
