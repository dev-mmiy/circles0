"""merge saved_posts and post_comment_images migrations

Revision ID: 8afa0a853b70
Revises: add_saved_posts_table_20251127, afe9f38822ff
Create Date: 2025-12-04 14:22:18.632344

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8afa0a853b70'
down_revision: Union[str, None] = ('add_saved_posts_table_20251127', 'afe9f38822ff')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
