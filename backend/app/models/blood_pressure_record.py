"""
Blood pressure record model.
"""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import relationship

from app.database import Base


class BloodPressureRecord(Base):
    """Blood pressure record model."""

    __tablename__ = "blood_pressure_records"

    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recorded_at = Column(DateTime, nullable=False, index=True, comment="When the measurement was taken")
    systolic = Column(Integer, nullable=False, comment="Systolic blood pressure (mmHg)")
    diastolic = Column(Integer, nullable=False, comment="Diastolic blood pressure (mmHg)")
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
    user = relationship("User", back_populates="blood_pressure_records")

