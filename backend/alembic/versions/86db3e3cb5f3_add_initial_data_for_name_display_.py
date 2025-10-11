"""Add initial data for name display orders and locale formats

Revision ID: 86db3e3cb5f3
Revises: 9a1ff639466b
Create Date: 2025-10-11 04:38:44.818658

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "86db3e3cb5f3"
down_revision: Union[str, None] = "9a1ff639466b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Insert name display orders
    name_display_orders_table = sa.table(
        "name_display_orders",
        sa.column("order_code", sa.String),
        sa.column("display_name", sa.String),
        sa.column("format_template", sa.String),
        sa.column("description", sa.Text),
        sa.column("is_active", sa.Boolean),
    )

    op.bulk_insert(
        name_display_orders_table,
        [
            {
                "order_code": "western",
                "display_name": "Western (First Middle Last)",
                "format_template": "{first} {middle} {last}",
                "description": "英語圏の標準形式",
                "is_active": True,
            },
            {
                "order_code": "eastern",
                "display_name": "Eastern (Last First Middle)",
                "format_template": "{last} {first} {middle}",
                "description": "東アジアの標準形式",
                "is_active": True,
            },
            {
                "order_code": "japanese",
                "display_name": "Japanese (Last First)",
                "format_template": "{last} {first}",
                "description": "日本の標準形式",
                "is_active": True,
            },
            {
                "order_code": "korean",
                "display_name": "Korean (Last First Middle)",
                "format_template": "{last} {first} {middle}",
                "description": "韓国の標準形式",
                "is_active": True,
            },
            {
                "order_code": "chinese",
                "display_name": "Chinese (Last First Middle)",
                "format_template": "{last} {first} {middle}",
                "description": "中国の標準形式",
                "is_active": True,
            },
            {
                "order_code": "custom",
                "display_name": "Custom Format",
                "format_template": "{custom}",
                "description": "ユーザー定義の形式",
                "is_active": True,
            },
        ],
    )

    # Insert locale name formats
    locale_name_formats_table = sa.table(
        "locale_name_formats",
        sa.column("locale", sa.String),
        sa.column("default_order_code", sa.String),
        sa.column("is_active", sa.Boolean),
    )

    op.bulk_insert(
        locale_name_formats_table,
        [
            {
                "locale": "ja-jp",
                "default_order_code": "japanese",
                "is_active": True,
            },
            {
                "locale": "en-us",
                "default_order_code": "western",
                "is_active": True,
            },
            {
                "locale": "en-gb",
                "default_order_code": "western",
                "is_active": True,
            },
            {
                "locale": "ko-kr",
                "default_order_code": "korean",
                "is_active": True,
            },
            {
                "locale": "zh-cn",
                "default_order_code": "chinese",
                "is_active": True,
            },
            {
                "locale": "zh-tw",
                "default_order_code": "chinese",
                "is_active": True,
            },
        ],
    )


def downgrade() -> None:
    # Delete locale name formats
    op.execute("DELETE FROM locale_name_formats")

    # Delete name display orders
    op.execute("DELETE FROM name_display_orders")
