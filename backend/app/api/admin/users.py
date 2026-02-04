"""
Admin users API: list, get, update, status, delete.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.admin_dependencies import require_admin_user
from app.database import get_db
from app.models.user import User
from app.schemas.admin.user import (
    AdminUserDetail,
    AdminUserListItem,
    AdminUserListResponse,
    AdminUserStats,
    AdminUserStatusUpdate,
    AdminUserUpdate,
)
from app.services.admin.audit_service import AdminAuditService
from app.services.admin.user_service import AdminUserService

router = APIRouter(prefix="/users", tags=["admin-users"])


def _client_ip(request: Request) -> Optional[str]:
    v = request.headers.get("X-Forwarded-For") or request.headers.get("X-Real-IP")
    if v and "," in v:
        v = v.split(",")[0].strip()
    return v or None


def _user_agent(request: Request) -> Optional[str]:
    return request.headers.get("User-Agent")


def _to_list_item(u: User, *, stats: AdminUserStats | None = None) -> AdminUserListItem:
    """List item: stats are omitted (zeros) to avoid N+1. Pass stats only when precomputed."""
    return AdminUserListItem(
        id=u.id,
        member_id=u.member_id,
        email=u.email,
        nickname=u.nickname,
        first_name=u.first_name,
        last_name=u.last_name,
        is_active=u.is_active,
        email_verified=u.email_verified,
        created_at=u.created_at,
        updated_at=u.updated_at,
        last_login_at=u.last_login_at,
        deleted_at=getattr(u, "deleted_at", None),
        stats=stats if stats is not None else AdminUserStats(),
    )


def _to_detail(db: Session, u: User) -> AdminUserDetail:
    stats = AdminUserService.stats(db, u.id)
    return AdminUserDetail(
        id=u.id,
        member_id=u.member_id,
        email=u.email,
        nickname=u.nickname,
        first_name=u.first_name,
        last_name=u.last_name,
        phone=u.phone,
        bio=u.bio,
        avatar_url=u.avatar_url,
        date_of_birth=u.date_of_birth,
        gender=getattr(u.gender, "value", None) if u.gender is not None else None,
        is_active=u.is_active,
        email_verified=u.email_verified,
        profile_visibility=getattr(u.profile_visibility, "value", None) if u.profile_visibility is not None else None,
        preferred_language=u.preferred_language,
        timezone=u.timezone,
        created_at=u.created_at,
        updated_at=u.updated_at,
        last_login_at=u.last_login_at,
        deleted_at=getattr(u, "deleted_at", None),
        stats=stats,
    )


@router.get("", response_model=AdminUserListResponse)
def list_users(
    admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    include_deleted: bool = Query(False),
    sort: str = Query("created_at"),
    order: str = Query("desc", regex="^(asc|desc)$"),
) -> AdminUserListResponse:
    items, total = AdminUserService.list_users(
        db,
        page=page,
        per_page=per_page,
        search=search,
        is_active=is_active,
        include_deleted=include_deleted,
        sort=sort,
        order=order,
    )
    total_pages = max(1, (total + per_page - 1) // per_page)
    return AdminUserListResponse(
        items=[_to_list_item(u) for u in items],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/{user_id}", response_model=AdminUserDetail)
def get_user(
    user_id: UUID,
    admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> AdminUserDetail:
    u = AdminUserService.get_user(db, user_id, include_deleted=True)
    if not u:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _to_detail(db, u)


@router.put("/{user_id}", response_model=AdminUserDetail)
def update_user(
    user_id: UUID,
    body: AdminUserUpdate,
    request: Request,
    admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> AdminUserDetail:
    u = AdminUserService.get_user(db, user_id, include_deleted=True)
    if not u:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    before = {k: getattr(u, k) for k in body.model_dump(exclude_unset=True)}
    u = AdminUserService.update_user(db, u, body)
    AdminAuditService.log(
        db,
        admin_user_id=admin.id,
        action="user_update",
        resource_type="user",
        resource_id=user_id,
        details={"before": before, "after": body.model_dump(exclude_unset=True)},
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
        commit=False,
    )
    try:
        db.commit()
        db.refresh(u)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate value for a unique field (e.g. email or nickname).",
        )
    return _to_detail(db, u)


@router.patch("/{user_id}/status", response_model=AdminUserDetail)
def set_status(
    user_id: UUID,
    body: AdminUserStatusUpdate,
    request: Request,
    admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> AdminUserDetail:
    u = AdminUserService.get_user(db, user_id, include_deleted=True)
    if not u:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    u = AdminUserService.set_status(db, u, body.is_active)
    AdminAuditService.log(
        db,
        admin_user_id=admin.id,
        action="user_status",
        resource_type="user",
        resource_id=user_id,
        details={"is_active": body.is_active, "reason": body.reason},
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
        commit=False,
    )
    db.commit()
    db.refresh(u)
    return _to_detail(db, u)


@router.delete("/{user_id}", status_code=200)
def delete_user(
    user_id: UUID,
    request: Request,
    reason: Optional[str] = Query(None, description="Reason for deletion (stored in audit log)"),
    admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> dict:
    u = AdminUserService.get_user(db, user_id, include_deleted=True)
    if not u:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    AdminUserService.delete_user(db, u)
    AdminAuditService.log(
        db,
        admin_user_id=admin.id,
        action="user_delete",
        resource_type="user",
        resource_id=user_id,
        details={"reason": reason},
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
        commit=False,
    )
    db.commit()
    return {"message": "User deleted successfully", "user_id": str(user_id)}
