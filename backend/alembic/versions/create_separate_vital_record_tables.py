"""create separate vital record tables

Revision ID: create_separate_vital_tables
Revises: create_vital_meal_records
Create Date: 2025-01-02 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'create_separate_vital_tables'
down_revision: Union[str, None] = 'create_vital_meal_records'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop old vital_records table if it exists
    op.drop_table('vital_records', if_exists=True)
    
    # Create blood_pressure_records table
    op.create_table(
        'blood_pressure_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.Column('systolic', sa.Integer(), nullable=False),
        sa.Column('diastolic', sa.Integer(), nullable=False),
        sa.Column('visibility', sa.String(20), nullable=False, server_default='public'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_blood_pressure_records_user_id', 'blood_pressure_records', ['user_id'])
    op.create_index('ix_blood_pressure_records_recorded_at', 'blood_pressure_records', ['recorded_at'])
    
    # Create heart_rate_records table
    op.create_table(
        'heart_rate_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.Column('bpm', sa.Integer(), nullable=False),
        sa.Column('visibility', sa.String(20), nullable=False, server_default='public'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_heart_rate_records_user_id', 'heart_rate_records', ['user_id'])
    op.create_index('ix_heart_rate_records_recorded_at', 'heart_rate_records', ['recorded_at'])
    
    # Create temperature_records table
    op.create_table(
        'temperature_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.Column('value', sa.Numeric(4, 1), nullable=False),
        sa.Column('unit', sa.String(10), nullable=False, server_default='celsius'),
        sa.Column('visibility', sa.String(20), nullable=False, server_default='public'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_temperature_records_user_id', 'temperature_records', ['user_id'])
    op.create_index('ix_temperature_records_recorded_at', 'temperature_records', ['recorded_at'])
    
    # Create weight_records table
    op.create_table(
        'weight_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.Column('value', sa.Numeric(5, 2), nullable=False),
        sa.Column('unit', sa.String(10), nullable=False, server_default='kg'),
        sa.Column('visibility', sa.String(20), nullable=False, server_default='public'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_weight_records_user_id', 'weight_records', ['user_id'])
    op.create_index('ix_weight_records_recorded_at', 'weight_records', ['recorded_at'])
    
    # Create body_fat_records table
    op.create_table(
        'body_fat_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.Column('percentage', sa.Numeric(4, 1), nullable=False),
        sa.Column('visibility', sa.String(20), nullable=False, server_default='public'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_body_fat_records_user_id', 'body_fat_records', ['user_id'])
    op.create_index('ix_body_fat_records_recorded_at', 'body_fat_records', ['recorded_at'])
    
    # Create blood_glucose_records table
    op.create_table(
        'blood_glucose_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.Column('value', sa.Integer(), nullable=False),
        sa.Column('timing', sa.String(20), nullable=True),
        sa.Column('visibility', sa.String(20), nullable=False, server_default='public'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_blood_glucose_records_user_id', 'blood_glucose_records', ['user_id'])
    op.create_index('ix_blood_glucose_records_recorded_at', 'blood_glucose_records', ['recorded_at'])
    
    # Create spo2_records table
    op.create_table(
        'spo2_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.Column('percentage', sa.Integer(), nullable=False),
        sa.Column('visibility', sa.String(20), nullable=False, server_default='public'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_spo2_records_user_id', 'spo2_records', ['user_id'])
    op.create_index('ix_spo2_records_recorded_at', 'spo2_records', ['recorded_at'])


def downgrade() -> None:
    op.drop_index('ix_spo2_records_recorded_at', table_name='spo2_records')
    op.drop_index('ix_spo2_records_user_id', table_name='spo2_records')
    op.drop_table('spo2_records')
    
    op.drop_index('ix_blood_glucose_records_recorded_at', table_name='blood_glucose_records')
    op.drop_index('ix_blood_glucose_records_user_id', table_name='blood_glucose_records')
    op.drop_table('blood_glucose_records')
    
    op.drop_index('ix_body_fat_records_recorded_at', table_name='body_fat_records')
    op.drop_index('ix_body_fat_records_user_id', table_name='body_fat_records')
    op.drop_table('body_fat_records')
    
    op.drop_index('ix_weight_records_recorded_at', table_name='weight_records')
    op.drop_index('ix_weight_records_user_id', table_name='weight_records')
    op.drop_table('weight_records')
    
    op.drop_index('ix_temperature_records_recorded_at', table_name='temperature_records')
    op.drop_index('ix_temperature_records_user_id', table_name='temperature_records')
    op.drop_table('temperature_records')
    
    op.drop_index('ix_heart_rate_records_recorded_at', table_name='heart_rate_records')
    op.drop_index('ix_heart_rate_records_user_id', table_name='heart_rate_records')
    op.drop_table('heart_rate_records')
    
    op.drop_index('ix_blood_pressure_records_recorded_at', table_name='blood_pressure_records')
    op.drop_index('ix_blood_pressure_records_user_id', table_name='blood_pressure_records')
    op.drop_table('blood_pressure_records')

