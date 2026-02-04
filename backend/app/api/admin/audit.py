"""
Admin audit API: POST /access (login), GET /logs.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.auth.admin_dependencies import require_admin_user
from app.database import get_db
from app.models.user import User
from app.schemas.admin.audit import AuditLogEntry, AuditLogList
from app.services.admin.audit_service import AdminAuditService

router = APIRouter(prefix="/audit", tags=["admin-audit"])


def _client_ip(request: Request) -> Optional[str]:
    v = request.headers.get("X-Forwarded-For") or request.headers.get("X-Real-IP")
    if v and "," in v:
        v = v.split(",")[0].strip()
    return v or None


def _user_agent(request: Request) -> Optional[str]:
    return request.headers.get("User-Agent")


@router.post("/access", status_code=204)
def log_access(
    request: Request,
    admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> None:
    """Record admin login (access). Call after successful Auth0 login on the admin frontend."""
    AdminAuditService.log(
        db,
        admin_user_id=admin.id,
        action="login",
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )


@router.get("/logs", response_model=AuditLogList)
def list_logs(
    admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    action: Optional[str] = Query(None),
    admin_user_id: Optional[UUID] = Query(None),
) -> AuditLogList:
    items, total = AdminAuditService.list_logs(
        db, page=page, per_page=per_page, action=action, admin_user_id=admin_user_id
    )
    tp = max(1, (total + per_page - 1) // per_page)
    return AuditLogList(
        items=[AuditLogEntry.model_validate(r) for r in items],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=tp,
    )
