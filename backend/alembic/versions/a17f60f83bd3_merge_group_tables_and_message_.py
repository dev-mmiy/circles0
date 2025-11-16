"""merge group tables and message notification type

Revision ID: a17f60f83bd3
Revises: add_group_tables_20251115, da234c27655b
Create Date: 2025-11-17 02:05:17.380728

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a17f60f83bd3'
down_revision: Union[str, None] = ('add_group_tables_20251115', 'da234c27655b')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
