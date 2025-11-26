"""add_group_avatar_url

Revision ID: 7caed1f3ebfa
Revises: 1f273c991117
Create Date: 2025-11-26 09:27:15.943257

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7caed1f3ebfa'
down_revision: Union[str, None] = '1f273c991117'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add avatar_url column to groups table if it doesn't exist
    # Use raw SQL to check and add column safely
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'groups' 
                AND column_name = 'avatar_url'
            ) THEN
                ALTER TABLE groups ADD COLUMN avatar_url VARCHAR(500);
            END IF;
        END $$;
    """)


def downgrade() -> None:
    # Remove avatar_url column from groups table
    op.drop_column('groups', 'avatar_url')
