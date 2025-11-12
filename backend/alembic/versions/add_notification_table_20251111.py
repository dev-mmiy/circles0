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
revision: str = 'add_notification_table_20251111'
down_revision: Union[str, None] = 'add_follow_table_20251110'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create notification_type enum
    notification_type = postgresql.ENUM(
        'follow', 'comment', 'reply', 'like', 'comment_like',
        name='notificationtype',
        create_type=True
    )
    notification_type.create(op.get_bind(), checkfirst=True)

    # Create notifications table
    op.create_table(
        'notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recipient_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('actor_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type', sa.Enum('follow', 'comment', 'reply', 'like', 'comment_like', name='notificationtype'), nullable=False),
        sa.Column('post_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('comment_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['recipient_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['comment_id'], ['post_comments.id'], ondelete='CASCADE'),
    )

    # Create indexes for efficient queries
    op.create_index('ix_notifications_id', 'notifications', ['id'])
    op.create_index('ix_notifications_recipient_id', 'notifications', ['recipient_id'])
    op.create_index('ix_notifications_type', 'notifications', ['type'])
    op.create_index('ix_notifications_is_read', 'notifications', ['is_read'])
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_notifications_created_at', table_name='notifications')
    op.drop_index('ix_notifications_is_read', table_name='notifications')
    op.drop_index('ix_notifications_type', table_name='notifications')
    op.drop_index('ix_notifications_recipient_id', table_name='notifications')
    op.drop_index('ix_notifications_id', table_name='notifications')

    # Drop table
    op.drop_table('notifications')

    # Drop enum type
    notification_type = postgresql.ENUM(
        'follow', 'comment', 'reply', 'like', 'comment_like',
        name='notificationtype'
    )
    notification_type.drop(op.get_bind(), checkfirst=True)
