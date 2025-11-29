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
    # Add course column to user_diseases table
    op.add_column("user_diseases", sa.Column("course", sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove course column from user_diseases table
    op.drop_column("user_diseases", "course")

