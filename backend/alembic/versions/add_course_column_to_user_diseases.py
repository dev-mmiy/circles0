"""add course column to user_diseases

Revision ID: add_course_column
Revises: add_message_reactions_20251127
Create Date: 2025-01-XX XX:XX:XX.XXXXXX

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_course_column"
down_revision: Union[str, None] = "add_message_reactions_20251127"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add course column to user_diseases table if it doesn't exist
    # This column may already exist from vjfpnzw7gojf migration, so we check first
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'user_diseases' 
                AND column_name = 'course'
            ) THEN
                ALTER TABLE user_diseases ADD COLUMN course TEXT;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    # Remove course column from user_diseases table
    # Only drop if it exists
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'user_diseases' 
                AND column_name = 'course'
            ) THEN
                ALTER TABLE user_diseases DROP COLUMN course;
            END IF;
        END $$;
    """)

