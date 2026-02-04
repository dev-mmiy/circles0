"""
Admin audit service: log and list access (login), changes, deletions.
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.admin_audit_log import AdminAuditLog


class AdminAuditService:
    @staticmethod
    def log(
        db: Session,
        *,
        admin_user_id: UUID,
        action: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[UUID] = None,
        details: Optional[dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        commit: bool = True,
    ) -> AdminAuditLog:
        row = AdminAuditLog(
            admin_user_id=admin_user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(row)
        if commit:
            db.commit()
            db.refresh(row)
        return row

    @staticmethod
    def list_logs(
        db: Session,
        *,
        page: int = 1,
        per_page: int = 20,
        action: Optional[str] = None,
        admin_user_id: Optional[UUID] = None,
    ) -> tuple[list[AdminAuditLog], int]:
        q = db.query(AdminAuditLog)
        if action:
            q = q.filter(AdminAuditLog.action == action)
        if admin_user_id:
            q = q.filter(AdminAuditLog.admin_user_id == admin_user_id)
        total = q.count()
        q = q.order_by(AdminAuditLog.created_at.desc())
        items = q.offset((page - 1) * per_page).limit(per_page).all()
        return items, total
