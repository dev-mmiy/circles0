"""Clean rebuild

Revision ID: clean_rebuild_001
Revises: 2b640183f173
Create Date: 2024-12-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'clean_rebuild_001'
down_revision = 'session_auth_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop existing tables (except users which is already created)
    op.drop_table('user_diseases')
    op.drop_table('posts')
    op.drop_table('diseases')
    
    # Create new simple diseases table
    op.create_table('diseases',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('category', sa.String(length=100), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_diseases_id'), 'diseases', ['id'], unique=False)
    op.create_index(op.f('ix_diseases_name'), 'diseases', ['name'], unique=True)
    
    # Create new simple user_diseases table
    op.create_table('user_diseases',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('disease_id', sa.Integer(), nullable=False),
    sa.Column('diagnosis_date', sa.DateTime(), nullable=True),
    sa.Column('severity', sa.String(length=50), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_diseases_id'), 'user_diseases', ['id'], unique=False)


def downgrade() -> None:
    # Drop new tables
    op.drop_index(op.f('ix_user_diseases_id'), table_name='user_diseases')
    op.drop_table('user_diseases')
    op.drop_index(op.f('ix_diseases_name'), table_name='diseases')
    op.drop_index(op.f('ix_diseases_id'), table_name='diseases')
    op.drop_table('diseases')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
