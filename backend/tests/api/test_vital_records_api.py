"""
API endpoint tests for Vital Records (Blood Pressure, Heart Rate, Temperature, etc.).
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models.blood_pressure_record import BloodPressureRecord
from app.models.heart_rate_record import HeartRateRecord
from app.models.temperature_record import TemperatureRecord
from app.models.weight_record import WeightRecord
from app.models.body_fat_record import BodyFatRecord
from app.models.blood_glucose_record import BloodGlucoseRecord
from app.models.spo2_record import SpO2Record


class TestVitalRecordsAPI:
    """Test cases for Vital Records API endpoints."""

    def setup_method(self):
        """Set up test client for each test."""
        self.client = TestClient(app)

    @pytest.fixture(autouse=True)
    def override_db(self, db_session):
        """Override database dependency for tests."""
        app.dependency_overrides[get_db] = lambda: db_session
        yield
        app.dependency_overrides.clear()


    def test_get_blood_pressure_records_without_date_range(self, db_session, test_user):
        """Test getting blood pressure records without date range filter."""
        # Create test records
        now = datetime.now(timezone.utc)
        record1 = BloodPressureRecord(
            id=uuid4(),
            user_id=test_user.id,
            recorded_at=now - timedelta(days=5),
            systolic=120,
            diastolic=80,
            visibility="private",
        )
        record2 = BloodPressureRecord(
            id=uuid4(),
            user_id=test_user.id,
            recorded_at=now - timedelta(days=10),
            systolic=130,
            diastolic=85,
            visibility="private",
        )
        db_session.add_all([record1, record2])
        db_session.commit()

        mock_user = {"sub": test_user.auth0_id}
        with patch("app.api.blood_pressure_records.get_current_user", return_value=mock_user):
            response = self.client.get("/api/v1/blood-pressure-records")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2

    def test_get_blood_pressure_records_with_date_range(self, db_session, test_user):
        """Test getting blood pressure records with date range filter."""
        # Create test records at different dates
        now = datetime.now(timezone.utc)
        record_in_range = BloodPressureRecord(
            id=uuid4(),
            user_id=test_user.id,
            recorded_at=now - timedelta(days=5),
            systolic=120,
            diastolic=80,
            visibility="private",
        )
        record_out_of_range = BloodPressureRecord(
            id=uuid4(),
            user_id=test_user.id,
            recorded_at=now - timedelta(days=20),
            systolic=130,
            diastolic=85,
            visibility="private",
        )
        db_session.add_all([record_in_range, record_out_of_range])
        db_session.commit()

        # Filter by date range (last 7 days)
        start_date = (now - timedelta(days=7)).isoformat()
        end_date = now.isoformat()

        mock_user = {"sub": test_user.auth0_id}
        with patch("app.api.blood_pressure_records.get_current_user", return_value=mock_user):
            response = self.client.get(
                f"/api/v1/blood-pressure-records?start_date={start_date}&end_date={end_date}"
            )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should only return record_in_range
        assert len(data) == 1
        assert data[0]["id"] == str(record_in_range.id)

    def test_get_blood_pressure_records_date_range_inclusive(self, db_session, test_user):
        """Test that date range filter is inclusive of start and end dates."""
        # Create records at start and end of date range
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=7)
        end_date = now - timedelta(days=1)

        # Record at start of range (00:00:00)
        record_at_start = BloodPressureRecord(
            id=uuid4(),
            user_id=test_user.id,
            recorded_at=start_date.replace(hour=0, minute=0, second=0, microsecond=0),
            systolic=120,
            diastolic=80,
            visibility="private",
        )
        # Record at end of range (23:59:59)
        record_at_end = BloodPressureRecord(
            id=uuid4(),
            user_id=test_user.id,
            recorded_at=end_date.replace(hour=23, minute=59, second=59, microsecond=999999),
            systolic=130,
            diastolic=85,
            visibility="private",
        )
        # Record outside range
        record_outside = BloodPressureRecord(
            id=uuid4(),
            user_id=test_user.id,
            recorded_at=end_date + timedelta(days=1),
            systolic=140,
            diastolic=90,
            visibility="private",
        )
        db_session.add_all([record_at_start, record_at_end, record_outside])
        db_session.commit()

        start_date_str = start_date.isoformat()
        end_date_str = end_date.isoformat()

        mock_user = {"sub": test_user.auth0_id}
        with patch("app.api.blood_pressure_records.get_current_user", return_value=mock_user):
            response = self.client.get(
                f"/api/v1/blood-pressure-records?start_date={start_date_str}&end_date={end_date_str}"
            )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should return both record_at_start and record_at_end, but not record_outside
        assert len(data) == 2
        record_ids = {record["id"] for record in data}
        assert str(record_at_start.id) in record_ids
        assert str(record_at_end.id) in record_ids
        assert str(record_outside.id) not in record_ids

    def test_get_heart_rate_records_with_date_range(self, db_session, test_user):
        """Test getting heart rate records with date range filter."""
        now = datetime.now(timezone.utc)
        record_in_range = HeartRateRecord(
            id=uuid4(),
            user_id=test_user.id,
            recorded_at=now - timedelta(days=5),
            bpm=72,
            visibility="private",
        )
        record_out_of_range = HeartRateRecord(
            id=uuid4(),
            user_id=test_user.id,
            recorded_at=now - timedelta(days=20),
            bpm=80,
            visibility="private",
        )
        db_session.add_all([record_in_range, record_out_of_range])
        db_session.commit()

        start_date = (now - timedelta(days=7)).isoformat()
        end_date = now.isoformat()

        mock_user = {"sub": test_user.auth0_id}
        with patch("app.api.heart_rate_records.get_current_user", return_value=mock_user):
            response = self.client.get(
                f"/api/v1/heart-rate-records?start_date={start_date}&end_date={end_date}"
            )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == str(record_in_range.id)

    def test_get_temperature_records_with_date_range(self, db_session, test_user):
        """Test getting temperature records with date range filter."""
        now = datetime.now(timezone.utc)
        record_in_range = TemperatureRecord(
            id=uuid4(),
            user_id=test_user.id,
            recorded_at=now - timedelta(days=5),
            value=36.5,
            unit="celsius",
            visibility="private",
        )
        record_out_of_range = TemperatureRecord(
            id=uuid4(),
            user_id=test_user.id,
            recorded_at=now - timedelta(days=20),
            value=37.0,
            unit="celsius",
            visibility="private",
        )
        db_session.add_all([record_in_range, record_out_of_range])
        db_session.commit()

        start_date = (now - timedelta(days=7)).isoformat()
        end_date = now.isoformat()

        mock_user = {"sub": test_user.auth0_id}
        with patch("app.api.temperature_records.get_current_user", return_value=mock_user):
            response = self.client.get(
                f"/api/v1/temperature-records?start_date={start_date}&end_date={end_date}"
            )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == str(record_in_range.id)

    def test_get_weight_records_with_date_range(self, db_session, test_user):
        """Test getting weight records with date range filter."""
        now = datetime.now(timezone.utc)
        record_in_range = WeightRecord(
            id=uuid4(),
            user_id=test_user.id,
            recorded_at=now - timedelta(days=5),
            value=70.0,
            unit="kg",
            visibility="private",
        )
        record_out_of_range = WeightRecord(
            id=uuid4(),
            user_id=test_user.id,
            recorded_at=now - timedelta(days=20),
            value=71.0,
            unit="kg",
            visibility="private",
        )
        db_session.add_all([record_in_range, record_out_of_range])
        db_session.commit()

        start_date = (now - timedelta(days=7)).isoformat()
        end_date = now.isoformat()

        mock_user = {"sub": test_user.auth0_id}
        with patch("app.api.weight_records.get_current_user", return_value=mock_user):
            response = self.client.get(
                f"/api/v1/weight-records?start_date={start_date}&end_date={end_date}"
            )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == str(record_in_range.id)

    def test_get_body_fat_records_with_date_range(self, db_session, test_user):
        """Test getting body fat records with date range filter."""
        now = datetime.now(timezone.utc)
        record_in_range = BodyFatRecord(
            id=uuid4(),
            user_id=test_user.id,
            recorded_at=now - timedelta(days=5),
            percentage=15.0,
            visibility="private",
        )
        record_out_of_range = BodyFatRecord(
            id=uuid4(),
            user_id=test_user.id,
            recorded_at=now - timedelta(days=20),
            percentage=16.0,
            visibility="private",
        )
        db_session.add_all([record_in_range, record_out_of_range])
        db_session.commit()

        start_date = (now - timedelta(days=7)).isoformat()
        end_date = now.isoformat()

        mock_user = {"sub": test_user.auth0_id}
        with patch("app.api.body_fat_records.get_current_user", return_value=mock_user):
            response = self.client.get(
                f"/api/v1/body-fat-records?start_date={start_date}&end_date={end_date}"
            )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == str(record_in_range.id)

    def test_get_blood_glucose_records_with_date_range(self, db_session, test_user):
        """Test getting blood glucose records with date range filter."""
        now = datetime.now(timezone.utc)
        record_in_range = BloodGlucoseRecord(
            id=uuid4(),
            user_id=test_user.id,
            recorded_at=now - timedelta(days=5),
            value=100,
            visibility="private",
        )
        record_out_of_range = BloodGlucoseRecord(
            id=uuid4(),
            user_id=test_user.id,
            recorded_at=now - timedelta(days=20),
            value=110,
            visibility="private",
        )
        db_session.add_all([record_in_range, record_out_of_range])
        db_session.commit()

        start_date = (now - timedelta(days=7)).isoformat()
        end_date = now.isoformat()

        mock_user = {"sub": test_user.auth0_id}
        with patch("app.api.blood_glucose_records.get_current_user", return_value=mock_user):
            response = self.client.get(
                f"/api/v1/blood-glucose-records?start_date={start_date}&end_date={end_date}"
            )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == str(record_in_range.id)

    def test_get_spo2_records_with_date_range(self, db_session, test_user):
        """Test getting SpO2 records with date range filter."""
        now = datetime.now(timezone.utc)
        record_in_range = SpO2Record(
            id=uuid4(),
            user_id=test_user.id,
            recorded_at=now - timedelta(days=5),
            percentage=98.0,
            visibility="private",
        )
        record_out_of_range = SpO2Record(
            id=uuid4(),
            user_id=test_user.id,
            recorded_at=now - timedelta(days=20),
            percentage=97.0,
            visibility="private",
        )
        db_session.add_all([record_in_range, record_out_of_range])
        db_session.commit()

        start_date = (now - timedelta(days=7)).isoformat()
        end_date = now.isoformat()

        mock_user = {"sub": test_user.auth0_id}
        with patch("app.api.spo2_records.get_current_user", return_value=mock_user):
            response = self.client.get(
                f"/api/v1/spo2-records?start_date={start_date}&end_date={end_date}"
            )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == str(record_in_range.id)

    def test_get_records_pagination_with_date_range(self, db_session, test_user):
        """Test pagination works correctly with date range filter."""
        now = datetime.now(timezone.utc)
        # Create 5 records within date range
        records = []
        for i in range(5):
            record = BloodPressureRecord(
                id=uuid4(),
                user_id=test_user.id,
                recorded_at=now - timedelta(days=i),
                systolic=120 + i,
                diastolic=80 + i,
                visibility="private",
            )
            records.append(record)
        db_session.add_all(records)
        db_session.commit()

        start_date = (now - timedelta(days=7)).isoformat()
        end_date = now.isoformat()

        mock_user = {"sub": test_user.auth0_id}
        with patch("app.api.blood_pressure_records.get_current_user", return_value=mock_user):
            # First page
            response = self.client.get(
                f"/api/v1/blood-pressure-records?start_date={start_date}&end_date={end_date}&skip=0&limit=2"
            )
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2

            # Second page
            response = self.client.get(
                f"/api/v1/blood-pressure-records?start_date={start_date}&end_date={end_date}&skip=2&limit=2"
            )
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2

            # Third page
            response = self.client.get(
                f"/api/v1/blood-pressure-records?start_date={start_date}&end_date={end_date}&skip=4&limit=2"
            )
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
