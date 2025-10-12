"""Drop existing tables and create new user management structure

Revision ID: 9a1ff639466b
Revises: a225f1ecff0c
Create Date: 2025-10-11 04:38:20.636376

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9a1ff639466b"
down_revision: Union[str, None] = "a225f1ecff0c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop existing tables
    op.drop_table("user_diseases")
    op.drop_table("posts")
    op.drop_table("diseases")
    op.drop_table("users")

    # Create new users table with UUID
    op.create_table(
        "users",
        sa.Column(
            "id",
            sa.UUID(),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("member_id", sa.String(length=12), nullable=False, unique=True),
        sa.Column("idp_id", sa.String(length=255), nullable=False, unique=True),
        sa.Column("idp_provider", sa.String(length=50), default="auth0"),
        sa.Column("first_name", sa.String(length=100)),
        sa.Column("middle_name", sa.String(length=100)),
        sa.Column("last_name", sa.String(length=100)),
        sa.Column("name_display_order", sa.String(length=20), default="western"),
        sa.Column("custom_name_format", sa.String(length=50)),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("phone", sa.String(length=20)),
        sa.Column("birth_date", sa.DateTime()),
        sa.Column("country_code", sa.String(length=2)),
        sa.Column("timezone", sa.String(length=50), default="Asia/Tokyo"),
        sa.Column("nickname", sa.String(length=50), nullable=False, unique=True),
        sa.Column("display_name", sa.String(length=100)),
        sa.Column("bio", sa.Text()),
        sa.Column("avatar_url", sa.String(length=500)),
        sa.Column("is_profile_public", sa.Boolean(), default=True),
        sa.Column("show_age_range", sa.Boolean(), default=False),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("is_verified", sa.Boolean(), default=False),
        sa.Column("is_email_verified", sa.Boolean(), default=False),
        sa.Column("is_phone_verified", sa.Boolean(), default=False),
        sa.Column("account_type", sa.String(length=20), default="regular"),
        sa.Column("is_suspended", sa.Boolean(), default=False),
        sa.Column("suspension_reason", sa.Text()),
        sa.Column("suspension_until", sa.DateTime()),
        sa.Column("preferred_language", sa.String(length=5), default="ja"),
        sa.Column("preferred_locale", sa.String(length=10), default="ja-jp"),
        sa.Column("email_notifications", sa.Boolean(), default=True),
        sa.Column("push_notifications", sa.Boolean(), default=True),
        sa.Column("marketing_emails", sa.Boolean(), default=False),
        sa.Column("allow_direct_messages", sa.Boolean(), default=True),
        sa.Column("allow_friend_requests", sa.Boolean(), default=True),
        sa.Column("show_online_status", sa.Boolean(), default=True),
        sa.Column("last_active_at", sa.DateTime()),
        sa.Column("login_count", sa.Integer(), default=0),
        sa.Column("posts_count", sa.Integer(), default=0),
        sa.Column("comments_count", sa.Integer(), default=0),
        sa.Column("likes_received", sa.Integer(), default=0),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.Column("last_login_at", sa.DateTime()),
        sa.Column("email_verified_at", sa.DateTime()),
        sa.Column("phone_verified_at", sa.DateTime()),
    )

    # Create indexes
    op.create_index("ix_users_member_id", "users", ["member_id"], unique=True)
    op.create_index("ix_users_nickname", "users", ["nickname"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # Create name display orders table
    op.create_table(
        "name_display_orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_code", sa.String(length=20), nullable=False, unique=True),
        sa.Column("display_name", sa.String(length=100), nullable=False),
        sa.Column("format_template", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
    )

    # Create locale name formats table
    op.create_table(
        "locale_name_formats",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("locale", sa.String(length=10), nullable=False, unique=True),
        sa.Column(
            "default_order_code",
            sa.String(length=20),
            sa.ForeignKey("name_display_orders.order_code"),
        ),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
    )

    # Create user preferences table
    op.create_table(
        "user_preferences",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("preference_key", sa.String(length=100), nullable=False),
        sa.Column("preference_value", sa.Text()),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.UniqueConstraint("user_id", "preference_key"),
    )

    # Create user sessions table
    op.create_table(
        "user_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("session_token", sa.String(length=255), nullable=False, unique=True),
        sa.Column("device_info", sa.Text()),
        sa.Column("ip_address", sa.String(length=45)),
        sa.Column("user_agent", sa.Text()),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.Column(
            "last_accessed_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )

    # Create user activity logs table
    op.create_table(
        "user_activity_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("activity_type", sa.String(length=50), nullable=False),
        sa.Column("activity_data", sa.Text()),
        sa.Column("ip_address", sa.String(length=45)),
        sa.Column("user_agent", sa.Text()),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
    )


def downgrade() -> None:
    # Drop new tables
    op.drop_table("user_activity_logs")
    op.drop_table("user_sessions")
    op.drop_table("user_preferences")
    op.drop_table("locale_name_formats")
    op.drop_table("name_display_orders")
    op.drop_table("users")

    # Recreate original tables
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=50), nullable=False, unique=True),
        sa.Column("email", sa.String(length=100), nullable=False, unique=True),
        sa.Column("full_name", sa.String(length=100)),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
    )

    op.create_table(
        "diseases",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False, unique=True),
        sa.Column("description", sa.Text()),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
    )

    op.create_table(
        "posts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("disease_id", sa.Integer(), sa.ForeignKey("diseases.id")),
        sa.Column("is_published", sa.Boolean(), default=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
    )

    op.create_table(
        "user_diseases",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "disease_id", sa.Integer(), sa.ForeignKey("diseases.id"), nullable=False
        ),
        sa.Column("diagnosis_date", sa.DateTime()),
        sa.Column("severity", sa.String(length=20)),
        sa.Column("notes", sa.Text()),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
    )
