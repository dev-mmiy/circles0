"""
API endpoints for vital records.

DEPRECATED: This API is deprecated. Use separate vital record APIs instead:
- /api/v1/blood-pressure-records
- /api/v1/heart-rate-records
- /api/v1/temperature-records
- /api/v1/weight-records
- /api/v1/body-fat-records
- /api/v1/blood-glucose-records
- /api/v1/spo2-records

This file is kept for reference but should not be used.
"""

# DEPRECATED: All endpoints have been moved to separate API files.
# This file is kept for reference only.

from fastapi import APIRouter

router = APIRouter(prefix="/vital-records", tags=["vital-records-deprecated"])

# All endpoints have been moved to separate API files.
# This router is not registered in main.py.
