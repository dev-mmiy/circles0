"""create vital_records and meal_records tables

Revision ID: create_vital_meal_records
Revises: 7e35854b1d5
Create Date: 2025-01-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'create_vital_meal_records'
down_revision: Union[str, None] = '7e35854b1d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create vital_records table
    op.create_table(
        'vital_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.Column('blood_pressure_systolic', sa.Integer(), nullable=True),
        sa.Column('blood_pressure_diastolic', sa.Integer(), nullable=True),
        sa.Column('heart_rate', sa.Integer(), nullable=True),
        sa.Column('temperature', sa.Numeric(4, 1), nullable=True),
        sa.Column('weight', sa.Numeric(5, 2), nullable=True),
        sa.Column('body_fat_percentage', sa.Numeric(4, 1), nullable=True),
        sa.Column('blood_glucose', sa.Integer(), nullable=True),
        sa.Column('blood_glucose_timing', sa.String(20), nullable=True),
        sa.Column('spo2', sa.Integer(), nullable=True),
        sa.Column('additional_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_vital_records_user_id', 'vital_records', ['user_id'])
    op.create_index('ix_vital_records_recorded_at', 'vital_records', ['recorded_at'])
    
    # Create meal_records table
    op.create_table(
        'meal_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.Column('meal_type', sa.String(20), nullable=False),
        sa.Column('foods', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('nutrition', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_meal_records_user_id', 'meal_records', ['user_id'])
    op.create_index('ix_meal_records_recorded_at', 'meal_records', ['recorded_at'])


def downgrade() -> None:
    op.drop_index('ix_meal_records_recorded_at', table_name='meal_records')
    op.drop_index('ix_meal_records_user_id', table_name='meal_records')
    op.drop_table('meal_records')
    op.drop_index('ix_vital_records_recorded_at', table_name='vital_records')
    op.drop_index('ix_vital_records_user_id', table_name='vital_records')
    op.drop_table('vital_records')

