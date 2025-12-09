"""add user_disease_id to posts table

Revision ID: 2fd15ce9c14b
Revises: 8afa0a853b70
Create Date: 2025-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '2fd15ce9c14b'
down_revision: Union[str, None] = '8afa0a853b70'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add user_disease_id column to posts table
    op.add_column(
        'posts',
        sa.Column(
            'user_disease_id',
            sa.Integer(),
            nullable=True,
            comment='Optional: Link post to a specific user disease'
        )
    )
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_posts_user_disease_id_user_diseases',
        'posts',
        'user_diseases',
        ['user_disease_id'],
        ['id'],
        ondelete='SET NULL'
    )
    
    # Create index for better query performance
    op.create_index(
        'ix_posts_user_disease_id',
        'posts',
        ['user_disease_id'],
        unique=False
    )


def downgrade() -> None:
    # Drop index
    op.drop_index('ix_posts_user_disease_id', table_name='posts')
    
    # Drop foreign key constraint
    op.drop_constraint('fk_posts_user_disease_id_user_diseases', 'posts', type_='foreignkey')
    
    # Drop column
    op.drop_column('posts', 'user_disease_id')

