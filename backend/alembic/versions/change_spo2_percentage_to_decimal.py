"""change spo2 percentage to decimal

Revision ID: change_spo2_percentage_to_decimal
Revises: create_separate_vital_tables
Create Date: 2025-01-02 02:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'change_spo2_percentage_to_decimal'
down_revision: Union[str, None] = 'create_separate_vital_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Change spo2_records.percentage from Integer to Numeric(4, 1)
    op.alter_column(
        'spo2_records',
        'percentage',
        type_=sa.Numeric(4, 1),
        existing_type=sa.Integer(),
        existing_nullable=False,
    )


def downgrade() -> None:
    # Revert spo2_records.percentage from Numeric(4, 1) to Integer
    # Note: This will truncate decimal values
    op.alter_column(
        'spo2_records',
        'percentage',
        type_=sa.Integer(),
        existing_type=sa.Numeric(4, 1),
        existing_nullable=False,
    )

