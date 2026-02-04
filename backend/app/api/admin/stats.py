"""
Admin stats API: GET /dashboard.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.admin_dependencies import require_admin_user
from app.database import get_db
from app.models.user import User
from app.services.admin.user_service import AdminUserService

router = APIRouter(prefix="/stats", tags=["admin-stats"])


@router.get("/dashboard")
def dashboard(
    admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> dict:
    return AdminUserService.dashboard_stats(db)
