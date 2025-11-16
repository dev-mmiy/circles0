"""add notification table

Revision ID: add_notification_table_20251111
Revises: add_follow_table_20251110
Create Date: 2025-11-11

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "add_notification_table_20251111"
down_revision: Union[str, None] = "add_follow_table_20251110"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create notification_type enum (using raw SQL for IF NOT EXISTS support)
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE notificationtype AS ENUM ('follow', 'comment', 'reply', 'like', 'comment_like');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """
    )

    # Create notifications table using raw SQL to avoid SQLAlchemy ENUM issues
    op.execute(
        """
        CREATE TABLE notifications (
            id UUID PRIMARY KEY,
            recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type notificationtype NOT NULL,
            post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
            comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
            is_read BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP NOT NULL
        )
    """
    )

    # Create indexes for efficient queries
    op.create_index("ix_notifications_id", "notifications", ["id"])
    op.create_index("ix_notifications_recipient_id", "notifications", ["recipient_id"])
    op.create_index("ix_notifications_type", "notifications", ["type"])
    op.create_index("ix_notifications_is_read", "notifications", ["is_read"])
    op.create_index("ix_notifications_created_at", "notifications", ["created_at"])


def downgrade() -> None:
    # Drop indexes
    op.drop_index("ix_notifications_created_at", table_name="notifications")
    op.drop_index("ix_notifications_is_read", table_name="notifications")
    op.drop_index("ix_notifications_type", table_name="notifications")
    op.drop_index("ix_notifications_recipient_id", table_name="notifications")
    op.drop_index("ix_notifications_id", table_name="notifications")

    # Drop table (using raw SQL to match upgrade)
    op.execute("DROP TABLE IF EXISTS notifications CASCADE;")

    # Drop enum type
    op.execute("DROP TYPE IF EXISTS notificationtype;")
