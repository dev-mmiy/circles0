"""add_food_search_columns

Revision ID: 5240491fccb0
Revises: add_admin_audit_deleted
Create Date: 2026-02-08 10:17:43.494241

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '5240491fccb0'
down_revision: Union[str, None] = 'add_admin_audit_deleted'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add food search/soft-delete columns only.
    op.add_column(
        'foods',
        sa.Column('name_kana', sa.String(length=200), nullable=True, comment='Food name in Kana for sorting/searching'),
    )
    op.add_column(
        'foods',
        sa.Column('search_keywords', sa.Text(), nullable=True, comment='Keywords for searching (e.g., aliases)'),
    )
    op.add_column(
        'foods',
        sa.Column('is_deleted', sa.Integer(), nullable=False, server_default=sa.text('0'), comment='0: Active, 1: Deleted'),
    )


def downgrade() -> None:
    op.drop_column('foods', 'is_deleted')
    op.drop_column('foods', 'search_keywords')
    op.drop_column('foods', 'name_kana')
