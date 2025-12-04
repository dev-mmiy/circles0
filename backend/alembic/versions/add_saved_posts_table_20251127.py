"""add saved_posts table

Revision ID: add_saved_posts_table_20251127
Revises: a17f60f83bd3
Create Date: 2025-11-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_saved_posts_table_20251127'
down_revision: Union[str, None] = 'a17f60f83bd3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create saved_posts table
    op.create_table(
        'saved_posts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('post_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', 'post_id', name='uq_saved_posts_user_post')
    )
    
    # Create indexes
    op.create_index('idx_saved_posts_user_id', 'saved_posts', ['user_id'])
    op.create_index('idx_saved_posts_user_created_at', 'saved_posts', ['user_id', sa.text('created_at DESC')])
    op.create_index('idx_saved_posts_post_id', 'saved_posts', ['post_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_saved_posts_post_id', table_name='saved_posts')
    op.drop_index('idx_saved_posts_user_created_at', table_name='saved_posts')
    op.drop_index('idx_saved_posts_user_id', table_name='saved_posts')
    
    # Drop table
    op.drop_table('saved_posts')

