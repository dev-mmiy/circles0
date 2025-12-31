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
import { getApiBaseUrl } from '@/lib/config';

const SSE_ENDPOINT = `${getApiBaseUrl()}/api/v1/notifications/stream`;

// Reconnection configuration
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const RETRY_BACKOFF_MULTIPLIER = 1.5;

export interface NotificationEvent {
  id: string;
  type: 'follow' | 'comment' | 'reply' | 'like' | 'comment_like' | 'message';
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
  const scheduleReconnectRef = useRef<(() => void) | null>(null);

  const closeConnection = useCallback(() => {
    if (eventSourceRef.current) {
      const isVerbose =
        typeof window !== 'undefined' && localStorage.getItem('debugSSE') === 'true';
      if (isVerbose) {
        console.log('[SSE] Closing connection');
      }
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    const isVerbose = typeof window !== 'undefined' && localStorage.getItem('debugSSE') === 'true';

    if (!isAuthenticated) {
      if (isVerbose) {
        console.log('[SSE] Not authenticated, skipping connection');
      }
      return;
    }

    if (eventSourceRef.current) {
      if (isVerbose) {
        console.log('[SSE] Connection already exists');
      }
      return;
    }

    try {
      // Get authentication token
      const token = await getAccessTokenSilently();

      // EventSource doesn't support custom headers natively
      // We'll append the token as a query parameter
      const urlWithAuth = `${SSE_ENDPOINT}?token=${encodeURIComponent(token)}`;

      if (isVerbose) {
        console.log('[SSE] Connecting to notification stream...');
      }
      const eventSource = new EventSource(urlWithAuth);
      eventSourceRef.current = eventSource;

      // Connection established
      eventSource.addEventListener('connected', event => {
        if (isVerbose) {
          console.log('[SSE] Connected:', event.data);
        }
        setIsConnected(true);
        setError(null);
        // Reset retry delay on successful connection
        retryDelayRef.current = INITIAL_RETRY_DELAY;
      });

      // New notification received
      eventSource.addEventListener('notification', event => {
        try {
          const notification: NotificationEvent = JSON.parse(event.data);
          if (isVerbose) {
            console.log('[SSE] New notification:', notification);
          }
          setLastNotification(notification);

          if (onNotification) {
            onNotification(notification);
          }
        } catch (error) {
          // Only log parsing errors in verbose mode
          if (isVerbose) {
            console.error('[SSE] Failed to parse notification:', error);
          }
        }
      });

      // Heartbeat (keep-alive ping)
      eventSource.addEventListener('ping', event => {
        // Silently handle ping events (no logging needed)
      });

      // Server requests reconnection (before timeout)
      eventSource.addEventListener('reconnect', event => {
        if (isVerbose) {
          console.log('[SSE] Server requested reconnection:', event.data);
        }
        closeConnection();
        scheduleReconnectRef.current?.();
      });

      // Error event (custom event listener)
      eventSource.addEventListener('error', event => {
        // This is a custom error event from the server, not the standard EventSource error
        const isVerbose =
          typeof window !== 'undefined' && localStorage.getItem('debugSSE') === 'true';
        if (isVerbose) {
          console.log('[SSE] Server error event:', event);
        }
      });

      // Standard open event
      eventSource.onopen = () => {
        const isVerbose =
          typeof window !== 'undefined' && localStorage.getItem('debugSSE') === 'true';
        if (isVerbose) {
          console.log('[SSE] EventSource opened');
        }
        setIsConnected(true);
        setError(null);
        // Reset retry delay on successful connection
        retryDelayRef.current = INITIAL_RETRY_DELAY;
      };

      // Standard error handler
      eventSource.onerror = event => {
        const eventSource = event.target as EventSource;
        const readyState = eventSource.readyState;

        // EventSource readyState:
        // 0 = CONNECTING
        // 1 = OPEN
        // 2 = CLOSED

        // Check if page is visible (not in background)
        const isPageVisible = typeof document !== 'undefined' && !document.hidden;

        // Only log errors in verbose mode to reduce console noise
        const isVerbose =
          typeof window !== 'undefined' && localStorage.getItem('debugSSE') === 'true';

        if (readyState === EventSource.CLOSED) {
          // Connection closed - ERR_NETWORK_IO_SUSPENDED is normal when page goes to background
          if (isVerbose) {
            console.log('[SSE] Connection closed, will reconnect when page is visible');
          }
          setIsConnected(false);

          // Only reconnect if page is visible
          if (!isPageVisible) {
            // Page is in background, don't reconnect yet
            return;
          }
        } else if (readyState === EventSource.CONNECTING) {
          // Connection attempt failed - this is normal during reconnection
          if (isVerbose) {
            console.log('[SSE] Connection attempt failed, will retry');
          }
          setIsConnected(false);
        } else {
          // Unexpected error state - only log in verbose mode
          if (isVerbose) {
            console.error('[SSE] Unexpected error state:', readyState, event);
          }
          setIsConnected(false);
        }

        // Connection lost, schedule reconnection only if page is visible
        if (shouldReconnectRef.current && isPageVisible) {
          closeConnection();
          scheduleReconnectRef.current?.();
        }
      };
    } catch (error) {
      // Only log errors in verbose mode (SSE is non-critical, errors are expected)
      const isVerbose =
        typeof window !== 'undefined' && localStorage.getItem('debugSSE') === 'true';
      if (isVerbose) {
        const errorMessage = error instanceof Error ? error.message : 'Connection failed';
        console.error('[SSE] Failed to connect:', errorMessage);
      }

      // Set error state but don't block the app
      setError(error instanceof Error ? error : new Error('Connection failed'));
      setIsConnected(false);

      // Schedule reconnection
      if (shouldReconnectRef.current) {
        scheduleReconnectRef.current?.();
      }
    }
  }, [isAuthenticated, getAccessTokenSilently, onNotification, closeConnection]);

  const scheduleReconnect = useCallback(() => {
    if (!shouldReconnectRef.current) {
      return;
    }

    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    const delay = retryDelayRef.current;
    const isVerbose = typeof window !== 'undefined' && localStorage.getItem('debugSSE') === 'true';
    if (isVerbose) {
      console.log(`[SSE] Scheduling reconnection in ${delay}ms`);
    }

    retryTimeoutRef.current = setTimeout(() => {
      if (isVerbose) {
        console.log('[SSE] Attempting to reconnect...');
      }
      connect();

      // Increase retry delay with backoff (up to max)
      retryDelayRef.current = Math.min(delay * RETRY_BACKOFF_MULTIPLIER, MAX_RETRY_DELAY);
    }, delay);
  }, [connect]);

  // Store scheduleReconnect in ref to avoid circular dependency
  scheduleReconnectRef.current = scheduleReconnect;

  // Handle page visibility changes (pause/resume SSE when page goes to background/foreground)
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;

      if (isVisible) {
        // Page became visible, reconnect if authenticated
        if (isAuthenticated && !eventSourceRef.current) {
          const isVerbose =
            typeof window !== 'undefined' && localStorage.getItem('debugSSE') === 'true';
          if (isVerbose) {
            console.log('[SSE] Page became visible, reconnecting...');
          }
          shouldReconnectRef.current = true;
          connect();
        }
      } else {
        // Page went to background, connection will be suspended by browser
        // ERR_NETWORK_IO_SUSPENDED will occur, which is normal
        const isVerbose =
          typeof window !== 'undefined' && localStorage.getItem('debugSSE') === 'true';
        if (isVerbose && isConnected) {
          console.log('[SSE] Page went to background, connection will be suspended');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, isConnected, connect]);

  // Initial connection on mount
  useEffect(() => {
    if (isAuthenticated) {
      // Only connect if page is visible
      const isPageVisible = typeof document !== 'undefined' && !document.hidden;
      if (!isPageVisible) {
        // Page is in background, don't connect yet
        return;
      }

      shouldReconnectRef.current = true;
      connect();
    }

    // Cleanup on unmount
    return () => {
      const isVerbose =
        typeof window !== 'undefined' && localStorage.getItem('debugSSE') === 'true';
      if (isVerbose) {
        console.log('[SSE] Component unmounting, cleaning up');
      }
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
