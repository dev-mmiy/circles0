"""
Notification Broadcaster Service

This service manages Server-Sent Events (SSE) connections for real-time notifications.
It maintains a registry of active connections and broadcasts notification events to connected users.
"""

import asyncio
import json
from typing import Dict, Set
from uuid import UUID
import logging

logger = logging.getLogger(__name__)


class NotificationBroadcaster:
    """
    Manages SSE connections and broadcasts notifications to connected users.

    This is a singleton service that maintains a registry of user_id -> event queues.
    When a notification is created, it broadcasts to all active connections for that user.
    """

    def __init__(self):
        # Dictionary mapping user_id to set of asyncio.Queues
        # Each queue represents one SSE connection for that user
        self._connections: Dict[UUID, Set[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: UUID) -> asyncio.Queue:
        """
        Register a new SSE connection for a user.

        Args:
            user_id: The UUID of the user connecting

        Returns:
            asyncio.Queue: A queue that will receive notification events
        """
        queue = asyncio.Queue(maxsize=100)  # Limit queue size to prevent memory issues

        async with self._lock:
            if user_id not in self._connections:
                self._connections[user_id] = set()
            self._connections[user_id].add(queue)

        logger.info(
            f"User {user_id} connected to notification stream. "
            f"Total connections for user: {len(self._connections[user_id])}"
        )

        return queue

    async def disconnect(self, user_id: UUID, queue: asyncio.Queue):
        """
        Unregister an SSE connection for a user.

        Args:
            user_id: The UUID of the user disconnecting
            queue: The queue to remove
        """
        async with self._lock:
            if user_id in self._connections:
                self._connections[user_id].discard(queue)

                # Clean up empty sets
                if not self._connections[user_id]:
                    del self._connections[user_id]
                    logger.info(f"User {user_id} has no more active connections")
                else:
                    logger.info(
                        f"User {user_id} disconnected. "
                        f"Remaining connections: {len(self._connections[user_id])}"
                    )

    async def broadcast_to_user(self, user_id: UUID, event_type: str, data: dict):
        """
        Broadcast a notification event to all active connections for a specific user.

        Args:
            user_id: The UUID of the recipient user
            event_type: The type of event (e.g., "notification", "ping")
            data: The event data (will be JSON-serialized)
        """
        if user_id not in self._connections:
            logger.debug(
                f"No active connections for user {user_id}, skipping broadcast"
            )
            return

        # Serialize data once
        try:
            json_data = json.dumps(data)
        except (TypeError, ValueError) as e:
            logger.error(f"Failed to serialize notification data: {e}")
            return

        event = {"event": event_type, "data": json_data}

        # Broadcast to all connections for this user
        disconnected_queues = []
        for queue in self._connections[user_id].copy():
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                logger.warning(f"Queue full for user {user_id}, dropping event")
                disconnected_queues.append(queue)
            except Exception as e:
                logger.error(f"Error broadcasting to user {user_id}: {e}")
                disconnected_queues.append(queue)

        # Clean up disconnected queues
        if disconnected_queues:
            async with self._lock:
                for queue in disconnected_queues:
                    self._connections[user_id].discard(queue)
                if not self._connections[user_id]:
                    del self._connections[user_id]

        logger.debug(
            f"Broadcast {event_type} to user {user_id}, "
            f"{len(self._connections[user_id])} active connections"
        )

    async def broadcast_to_all(self, event_type: str, data: dict):
        """
        Broadcast an event to all connected users.

        Args:
            event_type: The type of event
            data: The event data
        """
        user_ids = list(self._connections.keys())
        logger.info(f"Broadcasting {event_type} to {len(user_ids)} users")

        for user_id in user_ids:
            await self.broadcast_to_user(user_id, event_type, data)

    def get_connection_count(self, user_id: UUID = None) -> int:
        """
        Get the number of active connections.

        Args:
            user_id: If provided, returns count for specific user. Otherwise returns total.

        Returns:
            int: Number of active connections
        """
        if user_id:
            return len(self._connections.get(user_id, set()))
        return sum(len(queues) for queues in self._connections.values())


# Global singleton instance
broadcaster = NotificationBroadcaster()
