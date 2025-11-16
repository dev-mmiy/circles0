"""add_message_notification_type

Revision ID: da234c27655b
Revises: add_message_tables_20251115
Create Date: 2025-11-16 20:47:39.642134

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'da234c27655b'
down_revision: Union[str, None] = 'add_message_tables_20251115'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 'message' value to notificationtype enum
    op.execute("""
        ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'message';
    """)


def downgrade() -> None:
    # Note: PostgreSQL doesn't support removing enum values directly
    # This would require recreating the enum type, which is complex
    # For now, we'll leave the enum value in place
    pass
