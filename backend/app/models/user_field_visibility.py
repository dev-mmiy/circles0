"""
User field visibility model for fine-grained privacy control.
"""

from sqlalchemy import Column, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID

from app.database import Base


class UserFieldVisibility(Base):
    """
    Model for field-level visibility settings.

    Allows users to control visibility of individual profile fields
    independently from the overall profile visibility.
    """

    __tablename__ = "user_field_visibility"

    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True)
    user_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    field_name = Column(
        String(50),
        nullable=False,
        comment="Field name: email, phone, date_of_birth, gender, bio, avatar_url, country, language, timezone, etc.",
    )
    visibility = Column(
        Enum(
            "public",
            "limited",
            "private",
            "same_disease_only",
            name="field_visibility_enum",
        ),
        nullable=False,
        default="limited",
        comment="Visibility level: public (everyone), limited (authenticated users), private (owner only), same_disease_only (users with same diseases)",
    )

    # Ensure one visibility setting per user-field combination
    __table_args__ = (
        UniqueConstraint("user_id", "field_name", name="uq_user_field_visibility"),
    )

    def __repr__(self) -> str:
        return f"<UserFieldVisibility(user_id={self.user_id}, field={self.field_name}, visibility={self.visibility})>"
