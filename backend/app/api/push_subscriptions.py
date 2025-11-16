"""
API endpoints for managing push subscriptions.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.push_service import PushService

logger = logging.getLogger(__name__)

router = APIRouter()


class PushSubscriptionRequest(BaseModel):
    """Request model for push subscription registration."""

    endpoint: str = Field(..., description="Push subscription endpoint")
    p256dh: str = Field(..., description="Public key")
    auth: str = Field(..., description="Auth secret")
    user_agent: str | None = Field(None, description="Browser user agent")
    device_info: dict | None = Field(None, description="Device information")


class PushSubscriptionResponse(BaseModel):
    """Response model for push subscription."""

    id: str
    user_id: str
    endpoint: str
    created_at: str

    class Config:
        from_attributes = True


@router.post(
    "/register",
    response_model=PushSubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_push_subscription(
    subscription_data: PushSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Register a push subscription for the current user.

    This endpoint registers a browser/device to receive push notifications.
    """
    try:
        import os

        from app.config import settings

        # Get VAPID keys from environment variables
        vapid_private_key = os.getenv("VAPID_PRIVATE_KEY")
        vapid_public_key = os.getenv("VAPID_PUBLIC_KEY")
        vapid_email = os.getenv("VAPID_EMAIL", "mailto:admin@example.com")

        if not vapid_private_key or not vapid_public_key:
            logger.error("VAPID keys not configured")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Push notifications not configured",
            )

        push_service = PushService(
            vapid_private_key=vapid_private_key,
            vapid_public_key=vapid_public_key,
            vapid_email=vapid_email,
        )

        subscription = PushService.register_subscription(
            db=db,
            user_id=current_user.id,
            endpoint=subscription_data.endpoint,
            p256dh=subscription_data.p256dh,
            auth=subscription_data.auth,
            user_agent=subscription_data.user_agent,
            device_info=subscription_data.device_info,
        )

        return PushSubscriptionResponse(
            id=str(subscription.id),
            user_id=str(subscription.user_id),
            endpoint=subscription.endpoint,
            created_at=subscription.created_at.isoformat(),
        )

    except Exception as e:
        logger.error(f"Failed to register push subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register push subscription",
        )


@router.delete("/unregister", status_code=status.HTTP_204_NO_CONTENT)
async def unregister_push_subscription(
    endpoint: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Unregister a push subscription for the current user.
    """
    try:
        success = PushService.unregister_subscription(
            db=db,
            endpoint=endpoint,
            user_id=current_user.id,
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Push subscription not found",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to unregister push subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unregister push subscription",
        )


@router.get("/public-key", response_model=dict)
async def get_vapid_public_key():
    """
    Get the VAPID public key for client-side subscription.

    This endpoint returns the public key that clients need to create
    a push subscription.
    """
    import os

    vapid_public_key = os.getenv("VAPID_PUBLIC_KEY")

    if not vapid_public_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Push notifications not configured",
        )

    return {"publicKey": vapid_public_key}
