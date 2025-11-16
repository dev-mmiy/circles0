"""add user_field_visibility table for field-level privacy control

Revision ID: add_user_field_visibility_table_20251115
Revises: add_post_image_table_20251115
Create Date: 2025-11-15

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "add_field_visibility_20251115"
down_revision: Union[str, None] = "add_post_image_table_20251115"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create field_visibility_enum type if it doesn't exist
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE field_visibility_enum AS ENUM ('public', 'limited', 'private', 'same_disease_only');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """
    )

    # Create user_field_visibility table
    # Note: SQLAlchemy will try to create the enum type, so we use raw SQL for the column
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS user_field_visibility (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            field_name VARCHAR(50) NOT NULL,
            visibility field_visibility_enum NOT NULL DEFAULT 'limited',
            CONSTRAINT uq_user_field_visibility UNIQUE (user_id, field_name)
        );
    """
    )

    # Create index
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_user_field_visibility_user_id 
        ON user_field_visibility(user_id);
    """
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index(
        op.f("ix_user_field_visibility_user_id"), table_name="user_field_visibility"
    )

    # Drop tables
    op.drop_table("user_field_visibility")

    # Drop enum type
    op.execute("DROP TYPE IF EXISTS field_visibility_enum")
