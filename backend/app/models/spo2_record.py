"""
SpO2 (Blood Oxygen Saturation) record model.
"""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import relationship

from app.database import Base


class SpO2Record(Base):
    """SpO2 (Blood Oxygen Saturation) record model."""

    __tablename__ = "spo2_records"

    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recorded_at = Column(DateTime, nullable=False, index=True, comment="When the measurement was taken")
    percentage = Column(Numeric(4, 1), nullable=False, comment="Blood oxygen saturation (%)")
    visibility = Column(
        String(20),
        nullable=False,
        default="public",
        comment="public, followers_only, private",
    )
    notes = Column(Text, nullable=True, comment="Optional notes")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    user = relationship("User", back_populates="spo2_records")

