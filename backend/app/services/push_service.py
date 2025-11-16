"""
Push service for managing Web Push API subscriptions and sending push notifications.
"""

import json
import logging
from typing import Optional
from uuid import UUID

from pywebpush import WebPushException, webpush
from sqlalchemy.orm import Session

from app.models.push_subscription import PushSubscription
from app.models.user import User

logger = logging.getLogger(__name__)


class PushService:
    """Service for push notification operations."""

    def __init__(self, vapid_private_key: str, vapid_public_key: str, vapid_email: str):
        """
        Initialize PushService with VAPID keys.

        Args:
            vapid_private_key: VAPID private key (PEM format)
            vapid_public_key: VAPID public key (URL-safe base64)
            vapid_email: VAPID email (mailto: format)
        """
        self.vapid_private_key = vapid_private_key
        self.vapid_public_key = vapid_public_key
        self.vapid_email = vapid_email
        self.vapid_claims = {
            "sub": vapid_email,
        }

    @staticmethod
    def register_subscription(
        db: Session,
        user_id: UUID,
        endpoint: str,
        p256dh: str,
        auth: str,
        user_agent: Optional[str] = None,
        device_info: Optional[dict] = None,
    ) -> PushSubscription:
        """
        Register a push subscription for a user.

        Args:
            db: Database session
            user_id: User ID
            endpoint: Push subscription endpoint
            p256dh: Public key
            auth: Auth secret
            user_agent: Browser user agent (optional)
            device_info: Device information (optional)

        Returns:
            Created or updated PushSubscription
        """
        # Check if subscription already exists
        existing = (
            db.query(PushSubscription)
            .filter(PushSubscription.endpoint == endpoint)
            .first()
        )

        if existing:
            # Update existing subscription
            existing.user_id = user_id
            existing.p256dh = p256dh
            existing.auth = auth
            if user_agent:
                existing.user_agent = user_agent
            if device_info:
                existing.device_info = device_info
            db.commit()
            db.refresh(existing)
            return existing

        # Create new subscription
        subscription = PushSubscription(
            user_id=user_id,
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth,
            user_agent=user_agent,
            device_info=device_info,
        )
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
        return subscription

    @staticmethod
    def unregister_subscription(db: Session, endpoint: str, user_id: UUID) -> bool:
        """
        Unregister a push subscription.

        Args:
            db: Database session
            endpoint: Push subscription endpoint
            user_id: User ID (for verification)

        Returns:
            True if successful, False otherwise
        """
        subscription = (
            db.query(PushSubscription)
            .filter(
                PushSubscription.endpoint == endpoint,
                PushSubscription.user_id == user_id,
            )
            .first()
        )

        if not subscription:
            return False

        db.delete(subscription)
        db.commit()
        return True

    @staticmethod
    def get_user_subscriptions(db: Session, user_id: UUID) -> list[PushSubscription]:
        """
        Get all push subscriptions for a user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            List of PushSubscription objects
        """
        return (
            db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()
        )

    def send_push_notification(
        self,
        subscription: PushSubscription,
        title: str,
        body: str,
        icon: Optional[str] = None,
        badge: Optional[str] = None,
        image: Optional[str] = None,
        url: Optional[str] = None,
        tag: Optional[str] = None,
        require_interaction: bool = False,
        silent: bool = False,
        data: Optional[dict] = None,
    ) -> bool:
        """
        Send a push notification to a subscription.

        Args:
            subscription: PushSubscription object
            title: Notification title
            body: Notification body
            icon: Notification icon URL (optional)
            badge: Notification badge URL (optional)
            image: Notification image URL (optional)
            url: URL to open when notification is clicked (optional)
            tag: Notification tag (for grouping/replacing)
            require_interaction: Require user interaction to dismiss
            silent: Silent notification (no sound/vibration)
            data: Additional data to include (optional)

        Returns:
            True if successful, False otherwise
        """
        # Build notification payload
        notification_data = {
            "title": title,
            "body": body,
        }

        if icon:
            notification_data["icon"] = icon
        if badge:
            notification_data["badge"] = badge
        if image:
            notification_data["image"] = image
        if url:
            notification_data["url"] = url
        if tag:
            notification_data["tag"] = tag

        notification_data["requireInteraction"] = require_interaction
        notification_data["silent"] = silent

        # Build subscription info
        subscription_info = {
            "endpoint": subscription.endpoint,
            "keys": {
                "p256dh": subscription.p256dh,
                "auth": subscription.auth,
            },
        }

        # Add data if provided
        payload = {
            "notification": notification_data,
        }
        if data:
            payload["data"] = data

        try:
            # Send push notification
            webpush(
                subscription_info=subscription_info,
                data=json.dumps(payload),
                vapid_private_key=self.vapid_private_key,
                vapid_claims=self.vapid_claims,
            )

            logger.info(
                f"Push notification sent successfully to {subscription.endpoint[:50]}..."
            )
            return True

        except WebPushException as e:
            logger.error(f"Failed to send push notification: {e}")
            # Handle expired/invalid subscriptions
            if e.response and e.response.status_code in [410, 404]:
                logger.warning(
                    f"Subscription expired or invalid: {subscription.endpoint[:50]}..."
                )
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending push notification: {e}")
            return False

    def send_notification_to_user(
        self,
        db: Session,
        user_id: UUID,
        title: str,
        body: str,
        icon: Optional[str] = None,
        badge: Optional[str] = None,
        image: Optional[str] = None,
        url: Optional[str] = None,
        tag: Optional[str] = None,
        require_interaction: bool = False,
        silent: bool = False,
        data: Optional[dict] = None,
    ) -> int:
        """
        Send a push notification to all subscriptions for a user.

        Args:
            db: Database session
            user_id: User ID
            title: Notification title
            body: Notification body
            icon: Notification icon URL (optional)
            badge: Notification badge URL (optional)
            image: Notification image URL (optional)
            url: URL to open when notification is clicked (optional)
            tag: Notification tag (for grouping/replacing)
            require_interaction: Require user interaction to dismiss
            silent: Silent notification (no sound/vibration)
            data: Additional data to include (optional)

        Returns:
            Number of successful sends
        """
        subscriptions = self.get_user_subscriptions(db, user_id)
        success_count = 0

        for subscription in subscriptions:
            if self.send_push_notification(
                subscription=subscription,
                title=title,
                body=body,
                icon=icon,
                badge=badge,
                image=image,
                url=url,
                tag=tag,
                require_interaction=require_interaction,
                silent=silent,
                data=data,
            ):
                success_count += 1
                # Update last_used_at
                from datetime import datetime, timezone

                subscription.last_used_at = datetime.now(timezone.utc)
                db.commit()

        return success_count
