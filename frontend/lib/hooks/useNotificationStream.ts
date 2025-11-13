/**
 * useNotificationStream Hook
 *
 * Manages Server-Sent Events (SSE) connection for real-time notifications.
 * Automatically handles:
 * - Connection establishment
 * - Authentication token injection
 * - Automatic reconnection on failure
 * - Connection timeout handling (reconnects before Cloud Run timeout)
 * - Cleanup on unmount
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const SSE_ENDPOINT = `${API_BASE_URL}/notifications/stream`;

// Reconnection configuration
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const RETRY_BACKOFF_MULTIPLIER = 1.5;

export interface NotificationEvent {
  id: string;
  type: 'follow' | 'comment' | 'reply' | 'like' | 'comment_like';
  recipient_id: string;
  actor_id: string;
  post_id: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface UseNotificationStreamReturn {
  isConnected: boolean;
  error: Error | null;
  lastNotification: NotificationEvent | null;
}

export function useNotificationStream(
  onNotification?: (notification: NotificationEvent) => void
): UseNotificationStreamReturn {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastNotification, setLastNotification] = useState<NotificationEvent | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryDelayRef = useRef(INITIAL_RETRY_DELAY);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('[SSE] Not authenticated, skipping connection');
      return;
    }

    if (eventSourceRef.current) {
      console.log('[SSE] Connection already exists');
      return;
    }

    try {
      // Get authentication token
      const token = await getAccessTokenSilently();

      // EventSource doesn't support custom headers natively
      // We'll append the token as a query parameter
      const urlWithAuth = `${SSE_ENDPOINT}?token=${encodeURIComponent(token)}`;

      console.log('[SSE] Connecting to notification stream...');
      const eventSource = new EventSource(urlWithAuth);
      eventSourceRef.current = eventSource;

      // Connection established
      eventSource.addEventListener('connected', (event) => {
        console.log('[SSE] Connected:', event.data);
        setIsConnected(true);
        setError(null);
        // Reset retry delay on successful connection
        retryDelayRef.current = INITIAL_RETRY_DELAY;
      });

      // New notification received
      eventSource.addEventListener('notification', (event) => {
        try {
          const notification: NotificationEvent = JSON.parse(event.data);
          console.log('[SSE] New notification:', notification);
          setLastNotification(notification);

          if (onNotification) {
            onNotification(notification);
          }
        } catch (error) {
          console.error('[SSE] Failed to parse notification:', error);
        }
      });

      // Heartbeat (keep-alive ping)
      eventSource.addEventListener('ping', (event) => {
        console.log('[SSE] Heartbeat received');
      });

      // Server requests reconnection (before timeout)
      eventSource.addEventListener('reconnect', (event) => {
        console.log('[SSE] Server requested reconnection:', event.data);
        closeConnection();
        scheduleReconnect();
      });

      // Error event
      eventSource.addEventListener('error', (event) => {
        console.log('[SSE] Error event:', event);
      });

      // Standard open event
      eventSource.onopen = () => {
        console.log('[SSE] EventSource opened');
      };

      // Standard error handler
      eventSource.onerror = (event) => {
        console.error('[SSE] EventSource error:', event);
        setIsConnected(false);

        // Connection lost, schedule reconnection
        if (shouldReconnectRef.current) {
          closeConnection();
          scheduleReconnect();
        }
      };

    } catch (error) {
      console.error('[SSE] Failed to connect:', error);
      setError(error instanceof Error ? error : new Error('Connection failed'));

      if (shouldReconnectRef.current) {
        scheduleReconnect();
      }
    }
  }, [isAuthenticated, getAccessTokenSilently, onNotification]);

  const closeConnection = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('[SSE] Closing connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!shouldReconnectRef.current) {
      return;
    }

    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    const delay = retryDelayRef.current;
    console.log(`[SSE] Scheduling reconnection in ${delay}ms`);

    retryTimeoutRef.current = setTimeout(() => {
      console.log('[SSE] Attempting to reconnect...');
      connect();

      // Increase retry delay with backoff (up to max)
      retryDelayRef.current = Math.min(
        delay * RETRY_BACKOFF_MULTIPLIER,
        MAX_RETRY_DELAY
      );
    }, delay);
  }, [connect]);

  // Initial connection on mount
  useEffect(() => {
    if (isAuthenticated) {
      shouldReconnectRef.current = true;
      connect();
    }

    // Cleanup on unmount
    return () => {
      console.log('[SSE] Component unmounting, cleaning up');
      shouldReconnectRef.current = false;
      closeConnection();
    };
  }, [isAuthenticated, connect, closeConnection]);

  return {
    isConnected,
    error,
    lastNotification,
  };
}
