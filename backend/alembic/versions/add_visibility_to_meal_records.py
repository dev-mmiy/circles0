"""add visibility to meal_records

Revision ID: add_visibility_to_meal_records
Revises: create_separate_vital_tables
Create Date: 2025-01-02 02:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'add_visibility_to_meal_records'
down_revision: Union[str, None] = 'create_separate_vital_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('meal_records', sa.Column(
        'visibility',
        sa.String(20),
        nullable=False,
        server_default='public',
        comment="public, followers_only, private"
    ))


def downgrade() -> None:
    op.drop_column('meal_records', 'visibility')

