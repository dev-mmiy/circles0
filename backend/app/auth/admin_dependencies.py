"""
Admin authentication: require admin:access and resolve to DB User for audit.

Development 時:
- JWT の permissions に admin:access があれば許可（Auth0 API/ルールで付与）
- または ADMIN_AUTH0_IDS（Auth0 sub のカンマ区切り）に含まれれば許可
- または ADMIN_EMAILS（メールのカンマ区切り）に含まれれば許可（JWT の email を使用）
- 上記いずれも未設定なら、DB の User.email が miyasaka@gmail.com のとき許可（初期値）
  ※API 用 Access Token に email が入らないことが多いため、デフォルト判定は DB の email を参照
"""

import os

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.user_service import UserService
from app.utils.auth_utils import extract_auth0_id

_DEFAULT_ADMIN_EMAIL = "miyasaka@gmail.com"


def require_admin_user(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """
    Require admin:access and return the DB User for the current admin.
    Used for audit (admin_user_id) and authorization.
    """
    auth0_id = extract_auth0_id(current_user)
    perms = current_user.get("permissions") or []
    env = os.getenv("ENVIRONMENT", "")
    ids_raw = (os.getenv("ADMIN_AUTH0_IDS") or "").strip()
    emails_raw = (os.getenv("ADMIN_EMAILS") or "").strip()

    allowed = False

    if "admin:access" in perms:
        allowed = True
    elif env == "development":
        if ids_raw:
            subs = [s.strip() for s in ids_raw.split(",") if s.strip()]
            if subs and current_user.get("sub") in subs:
                allowed = True
        if not allowed and emails_raw:
            jwt_email = (current_user.get("email") or "").strip().lower()
            allowed_emails = [e.strip().lower() for e in emails_raw.split(",") if e.strip()]
            if jwt_email and jwt_email in allowed_emails:
                allowed = True
        if not allowed and not ids_raw and not emails_raw:
            # デフォルト: DB の User.email で判定（Access Token に email が無いことが多いため）
            user = UserService.get_user_by_auth0_id(db, auth0_id)
            if user and (user.email or "").strip().lower() == _DEFAULT_ADMIN_EMAIL.lower():
                allowed = True
            elif user is None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin user not found in database",
                )

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    user = UserService.get_user_by_auth0_id(db, auth0_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin user not found in database",
        )
    return user
