"""add_food_and_menu_tables

Revision ID: be08f6e06a2d
Revises: change_spo2_percentage_to_decimal
Create Date: 2026-01-03 11:59:58.005906

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'be08f6e06a2d'
down_revision: Union[str, None] = 'change_spo2_percentage_to_decimal'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create foods table
    op.create_table(
        'foods',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_foods_user_id', 'foods', ['user_id'])
    op.create_index('ix_foods_name', 'foods', ['name'])
    
    # Create food_nutrition table
    op.create_table(
        'food_nutrition',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('food_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('unit', sa.String(20), nullable=False),
        sa.Column('base_amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('calories', sa.Numeric(10, 2), nullable=True),
        sa.Column('protein', sa.Numeric(10, 2), nullable=True),
        sa.Column('carbs', sa.Numeric(10, 2), nullable=True),
        sa.Column('fat', sa.Numeric(10, 2), nullable=True),
        sa.Column('fiber', sa.Numeric(10, 2), nullable=True),
        sa.Column('sodium', sa.Numeric(10, 2), nullable=True),
        sa.Column('potassium', sa.Numeric(10, 2), nullable=True),
        sa.Column('phosphorus', sa.Numeric(10, 2), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['food_id'], ['foods.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_food_nutrition_food_id', 'food_nutrition', ['food_id'])
    
    # Create menus table
    op.create_table(
        'menus',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('image_url', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_menus_user_id', 'menus', ['user_id'])
    op.create_index('ix_menus_name', 'menus', ['name'])
    
    # Create menu_ingredients table
    op.create_table(
        'menu_ingredients',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('menu_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('food_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('unit', sa.String(20), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['menu_id'], ['menus.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['food_id'], ['foods.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_menu_ingredients_menu_id', 'menu_ingredients', ['menu_id'])
    op.create_index('ix_menu_ingredients_food_id', 'menu_ingredients', ['food_id'])
    
    # Create menu_nutrition table
    op.create_table(
        'menu_nutrition',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('menu_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('unit', sa.String(20), nullable=False),
        sa.Column('base_amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('calories', sa.Numeric(10, 2), nullable=True),
        sa.Column('protein', sa.Numeric(10, 2), nullable=True),
        sa.Column('carbs', sa.Numeric(10, 2), nullable=True),
        sa.Column('fat', sa.Numeric(10, 2), nullable=True),
        sa.Column('fiber', sa.Numeric(10, 2), nullable=True),
        sa.Column('sodium', sa.Numeric(10, 2), nullable=True),
        sa.Column('potassium', sa.Numeric(10, 2), nullable=True),
        sa.Column('phosphorus', sa.Numeric(10, 2), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['menu_id'], ['menus.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_menu_nutrition_menu_id', 'menu_nutrition', ['menu_id'])
    
    # Add items column to meal_records table
    op.add_column(
        'meal_records',
        sa.Column('items', postgresql.JSONB(astext_type=sa.Text()), nullable=True)
    )


def downgrade() -> None:
    # Remove items column from meal_records
    op.drop_column('meal_records', 'items')
    
    # Drop menu_nutrition table
    op.drop_index('ix_menu_nutrition_menu_id', table_name='menu_nutrition')
    op.drop_table('menu_nutrition')
    
    # Drop menu_ingredients table
    op.drop_index('ix_menu_ingredients_food_id', table_name='menu_ingredients')
    op.drop_index('ix_menu_ingredients_menu_id', table_name='menu_ingredients')
    op.drop_table('menu_ingredients')
    
    # Drop menus table
    op.drop_index('ix_menus_name', table_name='menus')
    op.drop_index('ix_menus_user_id', table_name='menus')
    op.drop_table('menus')
    
    # Drop food_nutrition table
    op.drop_index('ix_food_nutrition_food_id', table_name='food_nutrition')
    op.drop_table('food_nutrition')
    
    # Drop foods table
    op.drop_index('ix_foods_name', table_name='foods')
    op.drop_index('ix_foods_user_id', table_name='foods')
    op.drop_table('foods')
