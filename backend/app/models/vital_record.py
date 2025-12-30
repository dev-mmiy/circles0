"""
Vital record models for daily health measurements.
"""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class VitalRecord(Base):
    """
    Vital record model for daily health measurements.
    
    Stores measurements like blood pressure, heart rate, temperature, weight, etc.
    Separate from posts to allow dedicated forms and better data structure.
    """

    __tablename__ = "vital_records"

    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recorded_at = Column(DateTime, nullable=False, index=True, comment="When the measurement was taken")
    
    # Blood Pressure
    blood_pressure_systolic = Column(Integer, nullable=True, comment="Systolic blood pressure (mmHg)")
    blood_pressure_diastolic = Column(Integer, nullable=True, comment="Diastolic blood pressure (mmHg)")
    
    # Heart Rate
    heart_rate = Column(Integer, nullable=True, comment="Heart rate (bpm)")
    
    # Temperature
    temperature = Column(Numeric(4, 1), nullable=True, comment="Body temperature (°C)")
    
    # Weight
    weight = Column(Numeric(5, 2), nullable=True, comment="Body weight (kg)")
    
    # Body Fat Percentage
    body_fat_percentage = Column(Numeric(4, 1), nullable=True, comment="Body fat percentage (%)")
    
    # Blood Glucose
    blood_glucose = Column(Integer, nullable=True, comment="Blood glucose level (mg/dL)")
    blood_glucose_timing = Column(
        String(20),
        nullable=True,
        comment="Timing: 'fasting' or 'postprandial'"
    )
    
    # SpO2 (Blood Oxygen Saturation)
    spo2 = Column(Integer, nullable=True, comment="Blood oxygen saturation (%)")
    
    # Additional data (for future extensions)
    additional_data = Column(
        JSONB,
        nullable=True,
        comment="Additional measurement data in JSON format"
    )
    
    # Notes
    notes = Column(Text, nullable=True, comment="Optional notes about the measurement")
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    user = relationship("User", back_populates="vital_records")

