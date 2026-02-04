"""
Admin audit log schemas.
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class AuditLogEntry(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    admin_user_id: UUID
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[UUID] = None
    details: Optional[dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime


class AuditLogList(BaseModel):
    items: list[AuditLogEntry]
    total: int
    page: int
    per_page: int
    total_pages: int
