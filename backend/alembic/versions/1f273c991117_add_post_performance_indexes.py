"""add_post_performance_indexes

Revision ID: 1f273c991117
Revises: a17f60f83bd3
Create Date: 2025-11-22 11:29:45.796197

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1f273c991117'
down_revision: Union[str, None] = 'a17f60f83bd3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add composite indexes for post queries to improve performance
    # These indexes optimize the most common query patterns:
    # 1. Feed queries: filter by is_active, sort by created_at
    # 2. Public feed queries: filter by is_active and visibility, sort by created_at
    # 3. User posts queries: filter by user_id and is_active, sort by created_at
    
    # Index for feed queries (is_active + created_at)
    # Used in: get_feed() - filters by is_active=True, orders by created_at DESC
    op.create_index(
        'ix_posts_is_active_created_at',
        'posts',
        ['is_active', 'created_at'],
        unique=False
    )
    
    # Index for public feed queries (is_active + visibility + created_at)
    # Used in: get_feed() - filters by is_active=True and visibility='public', orders by created_at DESC
    op.create_index(
        'ix_posts_is_active_visibility_created_at',
        'posts',
        ['is_active', 'visibility', 'created_at'],
        unique=False
    )
    
    # Index for user posts queries (user_id + is_active + created_at)
    # Used in: get_user_posts() - filters by user_id and is_active=True, orders by created_at DESC
    op.create_index(
        'ix_posts_user_id_is_active_created_at',
        'posts',
        ['user_id', 'is_active', 'created_at'],
        unique=False
    )


def downgrade() -> None:
    # Drop indexes in reverse order
    op.drop_index('ix_posts_user_id_is_active_created_at', table_name='posts')
    op.drop_index('ix_posts_is_active_visibility_created_at', table_name='posts')
    op.drop_index('ix_posts_is_active_created_at', table_name='posts')
