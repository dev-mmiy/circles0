"""add_food_and_menu_tables

Revision ID: be08f6e06a2d
Revises: change_spo2_to_decimal
Create Date: 2026-01-03 11:59:58.005906

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'be08f6e06a2d'
down_revision: Union[str, None] = 'change_spo2_to_decimal'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
