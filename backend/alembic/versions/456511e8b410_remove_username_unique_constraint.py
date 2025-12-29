"""Remove username unique constraint

Revision ID: 456511e8b410
Revises: 2fd15ce9c14b
Create Date: 2025-12-29 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '456511e8b410'
down_revision: Union[str, None] = '2fd15ce9c14b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove unique constraint from username column.
    
    Username no longer needs to be unique - multiple users can have the same username.
    Only nickname remains unique for user identification.
    """
    # Drop the unique index on username
    op.drop_index('ix_users_username', table_name='users')
    
    # Create a non-unique index for performance (username is still searchable)
    op.create_index('ix_users_username', 'users', ['username'], unique=False)


def downgrade() -> None:
    """Restore unique constraint on username column."""
    # Drop the non-unique index
    op.drop_index('ix_users_username', table_name='users')
    
    # Recreate the unique index
    op.create_index('ix_users_username', 'users', ['username'], unique=True)

