"""
Server-Sent Events (SSE) endpoint for real-time messages.
"""

import asyncio
import logging
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.notification_broadcaster import broadcaster

router = APIRouter()

logger = logging.getLogger(__name__)

# Cloud Run timeout is 10 minutes, we'll reconnect before that
HEARTBEAT_INTERVAL = 30  # Send heartbeat every 30 seconds
CONNECTION_TIMEOUT = 540  # 9 minutes (before Cloud Run's 10 min timeout)


async def event_generator(user_id: UUID, request: Request):
    """
    Generate Server-Sent Events for a user's messages.

    This generator:
    1. Registers the connection with the broadcaster
    2. Sends periodic heartbeats to keep the connection alive
    3. Sends message events when they occur
    4. Handles disconnection gracefully

    Args:
        user_id: The UUID of the authenticated user
        request: The FastAPI request object (used to detect client disconnection)

    Yields:
        dict: SSE event dictionaries with 'event' and 'data' keys
    """
    queue = await broadcaster.connect(user_id)
    logger.info(f"SSE connection established for user {user_id} (messages)")

    try:
        # Send initial connection event
        yield {
            "event": "connected",
            "data": {
                "message": "Connected to message stream",
                "user_id": str(user_id),
                "timestamp": datetime.utcnow().isoformat(),
            },
        }

        start_time = asyncio.get_event_loop().time()

        while True:
            # Check if client disconnected
            if await request.is_disconnected():
                logger.info(f"Client disconnected for user {user_id} (messages)")
                break

            # Check if we've exceeded the connection timeout
            elapsed = asyncio.get_event_loop().time() - start_time
            if elapsed > CONNECTION_TIMEOUT:
                logger.info(
                    f"Connection timeout reached for user {user_id} (messages), requesting reconnect"
                )
                yield {
                    "event": "reconnect",
                    "data": {
                        "message": "Connection timeout, please reconnect",
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                }
                break

            try:
                # Wait for message event with timeout (for heartbeat)
                event = await asyncio.wait_for(queue.get(), timeout=HEARTBEAT_INTERVAL)

                # Only forward message events (filter out notification events)
                if event.get("event") == "message":
                    yield event
                # Also forward ping events for heartbeat
                elif event.get("event") == "ping":
                    yield event

            except asyncio.TimeoutError:
                # No events received, send heartbeat
                yield {
                    "event": "ping",
                    "data": {"timestamp": datetime.utcnow().isoformat()},
                }

    except asyncio.CancelledError:
        logger.info(f"SSE connection cancelled for user {user_id} (messages)")
        raise

    except Exception as e:
        logger.error(f"Error in message SSE stream for user {user_id}: {e}", exc_info=True)

    finally:
        await broadcaster.disconnect(user_id, queue)
        logger.info(f"SSE connection closed for user {user_id} (messages)")


@router.get("/stream")
async def message_stream(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Server-Sent Events endpoint for real-time messages.

    This endpoint establishes a persistent connection that sends:
    - Initial 'connected' event when connection is established
    - 'message' events when new messages are received or sent
    - 'ping' events every 30 seconds (heartbeat)
    - 'reconnect' event after 9 minutes (before Cloud Run timeout)

    The client should:
    - Connect using EventSource API
    - Listen for 'message' events to update UI
    - Automatically reconnect on 'reconnect' event or connection loss

    Authentication:
    - Requires valid Bearer token (Auth0 JWT)

    Returns:
        EventSourceResponse: SSE stream with Content-Type: text/event-stream
    """
    logger.info(f"User {current_user.id} connecting to message stream")

    return EventSourceResponse(
        event_generator(current_user.id, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )

