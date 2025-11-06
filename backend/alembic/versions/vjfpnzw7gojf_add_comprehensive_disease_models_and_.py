"""add comprehensive disease models and update user model

Revision ID: vjfpnzw7gojf
Revises: 000000000000
Create Date: 2025-11-03 09:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "vjfpnzw7gojf"
down_revision: Union[str, None] = "000000000000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### User model updates ###

    # Add member_id (12-digit member ID)
    op.add_column("users", sa.Column("member_id", sa.String(length=12), nullable=True))

    # Add IDP abstraction fields
    op.add_column("users", sa.Column("idp_id", sa.String(length=255), nullable=True))
    op.add_column(
        "users",
        sa.Column(
            "idp_provider", sa.String(length=50), nullable=False, server_default="auth0"
        ),
    )

    # Alter existing name fields from base migration (VARCHAR(50) to VARCHAR(100))
    # first_name, last_name, phone already exist from 000000000000 migration
    op.alter_column(
        "users",
        "first_name",
        existing_type=sa.String(length=50),
        type_=sa.String(length=100),
        existing_nullable=True,
    )
    op.alter_column(
        "users",
        "last_name",
        existing_type=sa.String(length=50),
        type_=sa.String(length=100),
        existing_nullable=True,
    )
    # phone already exists - keep as is (VARCHAR(20))

    # Add nickname (public name)
    op.add_column("users", sa.Column("nickname", sa.String(length=50), nullable=True))

    # Add preferred_language
    op.add_column(
        "users",
        sa.Column(
            "preferred_language",
            sa.String(length=5),
            nullable=False,
            server_default="ja",
        ),
    )

    # Create indexes for new user fields
    op.create_index(op.f("ix_users_member_id"), "users", ["member_id"], unique=True)
    op.create_index(op.f("ix_users_idp_id"), "users", ["idp_id"], unique=True)
    op.create_index(op.f("ix_users_nickname"), "users", ["nickname"], unique=True)

    # ### Disease model updates ###

    # Add disease_code to diseases table
    op.add_column(
        "diseases", sa.Column("disease_code", sa.String(length=20), nullable=True)
    )
    op.add_column("diseases", sa.Column("severity_level", sa.Integer(), nullable=True))

    # Add constraint for severity_level
    op.create_check_constraint(
        "ck_diseases_severity_level",
        "diseases",
        "severity_level >= 1 AND severity_level <= 5",
    )

    # Create index for disease_code
    op.create_index(
        op.f("ix_diseases_disease_code"), "diseases", ["disease_code"], unique=True
    )

    # ### New tables ###

    # Create disease_translations table
    op.create_table(
        "disease_translations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("disease_id", sa.Integer(), nullable=False),
        sa.Column("language_code", sa.String(length=5), nullable=False),
        sa.Column("translated_name", sa.String(length=200), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["disease_id"], ["diseases.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "disease_id",
            "language_code",
            name="uq_disease_translations_disease_language",
        ),
    )
    op.create_index(
        op.f("ix_disease_translations_id"), "disease_translations", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_disease_translations_disease_id"),
        "disease_translations",
        ["disease_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_disease_translations_language_code"),
        "disease_translations",
        ["language_code"],
        unique=False,
    )

    # Create disease_categories table
    op.create_table(
        "disease_categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("category_code", sa.String(length=50), nullable=False),
        sa.Column("parent_category_id", sa.Integer(), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["parent_category_id"], ["disease_categories.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("category_code"),
    )
    op.create_index(
        op.f("ix_disease_categories_id"), "disease_categories", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_disease_categories_category_code"),
        "disease_categories",
        ["category_code"],
        unique=True,
    )
    op.create_index(
        op.f("ix_disease_categories_parent_category_id"),
        "disease_categories",
        ["parent_category_id"],
        unique=False,
    )

    # Create disease_category_translations table
    op.create_table(
        "disease_category_translations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("language_code", sa.String(length=5), nullable=False),
        sa.Column("translated_name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(
            ["category_id"], ["disease_categories.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "category_id",
            "language_code",
            name="uq_category_translations_category_language",
        ),
    )
    op.create_index(
        op.f("ix_disease_category_translations_id"),
        "disease_category_translations",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_disease_category_translations_category_id"),
        "disease_category_translations",
        ["category_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_disease_category_translations_language_code"),
        "disease_category_translations",
        ["language_code"],
        unique=False,
    )

    # Create disease_category_mappings table
    op.create_table(
        "disease_category_mappings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("disease_id", sa.Integer(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["disease_id"], ["diseases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["category_id"], ["disease_categories.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "disease_id",
            "category_id",
            name="uq_disease_category_mappings_disease_category",
        ),
    )
    op.create_index(
        op.f("ix_disease_category_mappings_id"),
        "disease_category_mappings",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_disease_category_mappings_disease_id"),
        "disease_category_mappings",
        ["disease_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_disease_category_mappings_category_id"),
        "disease_category_mappings",
        ["category_id"],
        unique=False,
    )

    # Create disease_statuses table
    op.create_table(
        "disease_statuses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("status_code", sa.String(length=50), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("status_code"),
    )
    op.create_index(
        op.f("ix_disease_statuses_id"), "disease_statuses", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_disease_statuses_status_code"),
        "disease_statuses",
        ["status_code"],
        unique=True,
    )

    # Create disease_status_translations table
    op.create_table(
        "disease_status_translations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("status_id", sa.Integer(), nullable=False),
        sa.Column("language_code", sa.String(length=5), nullable=False),
        sa.Column("translated_name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(
            ["status_id"], ["disease_statuses.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "status_id", "language_code", name="uq_status_translations_status_language"
        ),
    )
    op.create_index(
        op.f("ix_disease_status_translations_id"),
        "disease_status_translations",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_disease_status_translations_status_id"),
        "disease_status_translations",
        ["status_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_disease_status_translations_language_code"),
        "disease_status_translations",
        ["language_code"],
        unique=False,
    )

    # ### UserDisease model updates ###

    # Add status_id foreign key
    op.add_column("user_diseases", sa.Column("status_id", sa.Integer(), nullable=True))

    # Add detailed medical information fields
    op.add_column(
        "user_diseases",
        sa.Column("diagnosis_doctor", sa.String(length=200), nullable=True),
    )
    op.add_column(
        "user_diseases",
        sa.Column("diagnosis_hospital", sa.String(length=200), nullable=True),
    )
    op.add_column(
        "user_diseases", sa.Column("severity_level", sa.Integer(), nullable=True)
    )
    op.add_column("user_diseases", sa.Column("symptoms", sa.Text(), nullable=True))
    op.add_column("user_diseases", sa.Column("limitations", sa.Text(), nullable=True))
    op.add_column("user_diseases", sa.Column("medications", sa.Text(), nullable=True))

    # Add privacy settings
    op.add_column(
        "user_diseases",
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "user_diseases",
        sa.Column("is_searchable", sa.Boolean(), nullable=False, server_default="true"),
    )

    # Change diagnosis_date from DateTime to Date
    op.alter_column(
        "user_diseases",
        "diagnosis_date",
        existing_type=sa.DateTime(),
        type_=sa.Date(),
        existing_nullable=True,
    )

    # Add foreign key constraint for status_id
    op.create_foreign_key(
        "fk_user_diseases_status_id",
        "user_diseases",
        "disease_statuses",
        ["status_id"],
        ["id"],
    )

    # Add severity_level constraint
    op.create_check_constraint(
        "ck_user_diseases_severity_level",
        "user_diseases",
        "severity_level >= 1 AND severity_level <= 5",
    )

    # Create indexes for user_diseases
    op.create_index(
        op.f("ix_user_diseases_status_id"), "user_diseases", ["status_id"], unique=False
    )
    op.create_index(
        op.f("ix_user_diseases_is_public"), "user_diseases", ["is_public"], unique=False
    )
    op.create_index(
        op.f("ix_user_diseases_is_searchable"),
        "user_diseases",
        ["is_searchable"],
        unique=False,
    )

    # Add unique constraint for user_id and disease_id
    op.create_unique_constraint(
        "uq_user_diseases_user_disease", "user_diseases", ["user_id", "disease_id"]
    )


def downgrade() -> None:
    # ### UserDisease downgrades ###
    op.drop_constraint("uq_user_diseases_user_disease", "user_diseases", type_="unique")
    op.drop_index(op.f("ix_user_diseases_is_searchable"), table_name="user_diseases")
    op.drop_index(op.f("ix_user_diseases_is_public"), table_name="user_diseases")
    op.drop_index(op.f("ix_user_diseases_status_id"), table_name="user_diseases")
    op.drop_constraint(
        "ck_user_diseases_severity_level", "user_diseases", type_="check"
    )
    op.drop_constraint(
        "fk_user_diseases_status_id", "user_diseases", type_="foreignkey"
    )

    op.alter_column(
        "user_diseases",
        "diagnosis_date",
        existing_type=sa.Date(),
        type_=sa.DateTime(),
        existing_nullable=True,
    )

    op.drop_column("user_diseases", "is_searchable")
    op.drop_column("user_diseases", "is_public")
    op.drop_column("user_diseases", "medications")
    op.drop_column("user_diseases", "limitations")
    op.drop_column("user_diseases", "symptoms")
    op.drop_column("user_diseases", "severity_level")
    op.drop_column("user_diseases", "diagnosis_hospital")
    op.drop_column("user_diseases", "diagnosis_doctor")
    op.drop_column("user_diseases", "status_id")

    # ### Drop new tables ###
    op.drop_index(
        op.f("ix_disease_status_translations_language_code"),
        table_name="disease_status_translations",
    )
    op.drop_index(
        op.f("ix_disease_status_translations_status_id"),
        table_name="disease_status_translations",
    )
    op.drop_index(
        op.f("ix_disease_status_translations_id"),
        table_name="disease_status_translations",
    )
    op.drop_table("disease_status_translations")

    op.drop_index(
        op.f("ix_disease_statuses_status_code"), table_name="disease_statuses"
    )
    op.drop_index(op.f("ix_disease_statuses_id"), table_name="disease_statuses")
    op.drop_table("disease_statuses")

    op.drop_index(
        op.f("ix_disease_category_mappings_category_id"),
        table_name="disease_category_mappings",
    )
    op.drop_index(
        op.f("ix_disease_category_mappings_disease_id"),
        table_name="disease_category_mappings",
    )
    op.drop_index(
        op.f("ix_disease_category_mappings_id"), table_name="disease_category_mappings"
    )
    op.drop_table("disease_category_mappings")

    op.drop_index(
        op.f("ix_disease_category_translations_language_code"),
        table_name="disease_category_translations",
    )
    op.drop_index(
        op.f("ix_disease_category_translations_category_id"),
        table_name="disease_category_translations",
    )
    op.drop_index(
        op.f("ix_disease_category_translations_id"),
        table_name="disease_category_translations",
    )
    op.drop_table("disease_category_translations")

    op.drop_index(
        op.f("ix_disease_categories_parent_category_id"),
        table_name="disease_categories",
    )
    op.drop_index(
        op.f("ix_disease_categories_category_code"), table_name="disease_categories"
    )
    op.drop_index(op.f("ix_disease_categories_id"), table_name="disease_categories")
    op.drop_table("disease_categories")

    op.drop_index(
        op.f("ix_disease_translations_language_code"), table_name="disease_translations"
    )
    op.drop_index(
        op.f("ix_disease_translations_disease_id"), table_name="disease_translations"
    )
    op.drop_index(op.f("ix_disease_translations_id"), table_name="disease_translations")
    op.drop_table("disease_translations")

    # ### Disease model downgrades ###
    op.drop_index(op.f("ix_diseases_disease_code"), table_name="diseases")
    op.drop_constraint("ck_diseases_severity_level", "diseases", type_="check")
    op.drop_column("diseases", "severity_level")
    op.drop_column("diseases", "disease_code")

    # ### User model downgrades ###
    op.drop_index(op.f("ix_users_nickname"), table_name="users")
    op.drop_index(op.f("ix_users_idp_id"), table_name="users")
    op.drop_index(op.f("ix_users_member_id"), table_name="users")

    op.drop_column("users", "preferred_language")
    op.drop_column("users", "nickname")
    op.drop_column("users", "phone")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
    op.drop_column("users", "idp_provider")
    op.drop_column("users", "idp_id")
    op.drop_column("users", "member_id")
