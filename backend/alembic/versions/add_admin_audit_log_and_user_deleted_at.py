"""add admin_audit_log and users.deleted_at

Revision ID: add_admin_audit_deleted
Revises: be08f6e06a2d
Create Date: 2025-01-24

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "add_admin_audit_deleted"
down_revision: Union[str, None] = "be08f6e06a2d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # users.deleted_at for logical delete
    op.add_column(
        "users",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_deleted_at", "users", ["deleted_at"])

    # admin_audit_log
    op.create_table(
        "admin_audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("admin_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("resource_type", sa.String(50), nullable=True),
        sa.Column("resource_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("details", postgresql.JSONB(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["admin_user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
    )
    op.create_index(
        "ix_admin_audit_log_admin_user_id",
        "admin_audit_log",
        ["admin_user_id"],
    )
    op.create_index(
        "ix_admin_audit_log_resource",
        "admin_audit_log",
        ["resource_type", "resource_id"],
    )
    op.create_index(
        "ix_admin_audit_log_created_at",
        "admin_audit_log",
        ["created_at"],
    )
    op.create_index(
        "ix_admin_audit_log_action",
        "admin_audit_log",
        ["action"],
    )


def downgrade() -> None:
    op.drop_index("ix_admin_audit_log_action", "admin_audit_log")
    op.drop_index("ix_admin_audit_log_created_at", "admin_audit_log")
    op.drop_index("ix_admin_audit_log_resource", "admin_audit_log")
    op.drop_index("ix_admin_audit_log_admin_user_id", "admin_audit_log")
    op.drop_table("admin_audit_log")

    op.drop_index("ix_users_deleted_at", "users")
    op.drop_column("users", "deleted_at")
