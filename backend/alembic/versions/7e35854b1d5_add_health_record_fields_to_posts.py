"""Add health record fields to posts

Revision ID: 7e35854b1d5
Revises: 456511e8b410
Create Date: 2025-12-29 16:16:32.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7e35854b1d5'
down_revision: Union[str, None] = '456511e8b410'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add health record fields to posts table.
    
    Adds:
    - post_type: 'regular' or 'health_record'
    - health_record_type: type of health record (diary, symptom, vital, meal, medication, exercise)
    - health_record_data: JSON data for structured health record information
    """
    # Add post_type column with default 'regular' for existing posts
    op.add_column('posts', sa.Column(
        'post_type',
        sa.String(length=20),
        nullable=False,
        server_default='regular',
        comment="post type: 'regular' for regular posts, 'health_record' for health records"
    ))
    
    # Add health_record_type column (nullable)
    op.add_column('posts', sa.Column(
        'health_record_type',
        sa.String(length=50),
        nullable=True,
        comment="health record type: 'diary', 'symptom', 'vital', 'meal', 'medication', 'exercise', etc."
    ))
    
    # Add health_record_data column (JSON, nullable)
    op.add_column('posts', sa.Column(
        'health_record_data',
        postgresql.JSON(astext_type=sa.Text()),
        nullable=True,
        comment="structured health record data (JSON format)"
    ))
    
    # Create indexes for performance
    op.create_index('ix_posts_post_type', 'posts', ['post_type'])
    op.create_index('ix_posts_health_record_type', 'posts', ['health_record_type'])


def downgrade() -> None:
    """Remove health record fields from posts table."""
    # Drop indexes
    op.drop_index('ix_posts_health_record_type', table_name='posts')
    op.drop_index('ix_posts_post_type', table_name='posts')
    
    # Drop columns
    op.drop_column('posts', 'health_record_data')
    op.drop_column('posts', 'health_record_type')
    op.drop_column('posts', 'post_type')

