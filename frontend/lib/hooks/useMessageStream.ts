/**
 * useMessageStream Hook
 *
 * Manages Server-Sent Events (SSE) connection for real-time messages.
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
import { getAccessToken as getAccessTokenFromManager } from '@/lib/utils/tokenManager';
import { debugLog } from '@/lib/utils/debug';

const SSE_ENDPOINT = `${getApiBaseUrl()}/api/v1/messages/stream`;

// Reconnection configuration
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const RETRY_BACKOFF_MULTIPLIER = 1.5;

export interface MessageEvent {
  id: string;
  conversation_id?: string;
  group_id?: string;
  sender_id: string;
  content: string;
  image_url: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  sender: {
    id: string;
    nickname: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export interface UseMessageStreamReturn {
  isConnected: boolean;
  lastMessage: MessageEvent | null;
  error: Error | null;
}

export function useMessageStream(
  onMessage?: (message: MessageEvent) => void,
  enabled: boolean = true
): UseMessageStreamReturn {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryDelayRef = useRef(INITIAL_RETRY_DELAY);
  const scheduleReconnectRef = useRef<(() => void) | null>(null);
  const wasConnectedRef = useRef(false);
  // Keep onMessage callback in a ref to avoid recreating connection when it changes
  const onMessageRef = useRef(onMessage);

  // Update the ref when onMessage changes
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const closeConnection = () => {
    if (eventSourceRef.current) {
      // Only log in verbose mode
      if (
        wasConnectedRef.current &&
        typeof window !== 'undefined' &&
        localStorage.getItem('debugSSE') === 'true'
      ) {
        debugLog.log('[Message SSE] Closing connection');
      }
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      wasConnectedRef.current = false;
    }
  };

  const connect = useCallback(async () => {
    if (!enabled) {
      // Connection disabled, skip
      return;
    }

    if (!isAuthenticated) {
      // Silent skip, no log needed
      return;
    }

    if (eventSourceRef.current) {
      // Connection already exists, skip
      return;
    }

    try {
      // Get authentication token using tokenManager to prevent conflicts with other API calls
      const isVerbose =
        typeof window !== 'undefined' && localStorage.getItem('debugSSE') === 'true';
      let token: string;
      try {
        token = await getAccessTokenFromManager(getAccessTokenSilently);
      } catch (tokenError: any) {
        debugLog.error('[Message SSE] Failed to get token for SSE connection:', tokenError);

        // Don't throw - just set error and return
        // The connection will be retried automatically by the error handler
        setError(tokenError instanceof Error ? tokenError : new Error('Failed to get token'));
        return;
      }

      // EventSource doesn't support custom headers natively
      // We'll append the token as a query parameter
      const urlWithAuth = `${SSE_ENDPOINT}?token=${encodeURIComponent(token)}`;

      if (isVerbose) {
        debugLog.log('[Message SSE] Connecting to message stream...');
      }
      const eventSource = new EventSource(urlWithAuth);
      eventSourceRef.current = eventSource;

      // Connection established
      eventSource.addEventListener('connected', event => {
        if (isVerbose) {
          debugLog.log('[Message SSE] Connected:', event.data);
        }
        setIsConnected(true);
        wasConnectedRef.current = true;
        setError(null);
        // Reset retry delay on successful connection
        retryDelayRef.current = INITIAL_RETRY_DELAY;
      });

      // New message received
      eventSource.addEventListener('message', event => {
        try {
          const message: MessageEvent = JSON.parse(event.data);
          if (isVerbose) {
            debugLog.log('[Message SSE] New message:', message);
          }
          setLastMessage(message);

          if (onMessageRef.current) {
            onMessageRef.current(message);
          }
        } catch (error) {
          debugLog.error('[Message SSE] Failed to parse message:', error);
        }
      });

      // New group message received
      eventSource.addEventListener('group_message', event => {
        try {
          const message: MessageEvent = JSON.parse(event.data);
          if (isVerbose) {
            debugLog.log('[Message SSE] New group message:', message);
          }
          setLastMessage(message);

          if (onMessageRef.current) {
            onMessageRef.current(message);
          }
        } catch (error) {
          debugLog.error('[Message SSE] Failed to parse group message:', error);
        }
      });

      // Heartbeat (keep-alive ping)
      eventSource.addEventListener('ping', event => {
        // Heartbeat received - no need to log every ping
      });

      // Server requests reconnection (before timeout)
      eventSource.addEventListener('reconnect', event => {
        if (isVerbose) {
          debugLog.log('[Message SSE] Server requested reconnection:', event.data);
        }
        closeConnection();
        scheduleReconnectRef.current?.();
      });

      // Error event
      eventSource.addEventListener('error', errorEvent => {
        const eventSource = errorEvent.target as EventSource;
        const readyState = eventSource.readyState;
        const isVerbose =
          typeof window !== 'undefined' && localStorage.getItem('debugSSE') === 'true';

        // EventSource readyState:
        // 0 = CONNECTING (connection not yet established or lost)
        // 1 = OPEN (connection is open and data can be received)
        // 2 = CLOSED (connection is closed)

        // Check if page is visible (not in background)
        const isPageVisible = typeof document !== 'undefined' && !document.hidden;

        // Only log actual errors, not connection attempts
        if (readyState === EventSource.CLOSED) {
          // Connection was closed - this is normal if it was previously connected
          // ERR_NETWORK_IO_SUSPENDED is normal when page goes to background
          if (wasConnectedRef.current && isVerbose) {
            debugLog.log('[Message SSE] Connection closed, will reconnect when page is visible');
          }

          // Only reconnect if page is visible
          if (!isPageVisible) {
            // Page is in background, don't reconnect yet
            // Will reconnect when page becomes visible again
            setIsConnected(false);
            wasConnectedRef.current = false;
            return;
          }
        } else if (readyState === EventSource.CONNECTING) {
          // Connection attempt failed - this is normal during initial connection or reconnection
          // Don't log as error - this is expected behavior during connection attempts
          // Only log in verbose mode to avoid noise
          if (isVerbose) {
            debugLog.log('[Message SSE] Connection attempt failed, will retry');
          }
        } else {
          // Unexpected state (should not happen, but handle gracefully)
          // Only log in verbose mode to reduce console noise
          if (isVerbose) {
            debugLog.error('[Message SSE] Unexpected error state:', readyState, errorEvent);
          }
        }

        setIsConnected(false);
        wasConnectedRef.current = false;

        // Only reconnect if page is visible
        if (!isPageVisible) {
          // Page is in background, don't reconnect yet
          return;
        }

        closeConnection();

        // Schedule reconnection with exponential backoff
        const delay = retryDelayRef.current;
        retryDelayRef.current = Math.min(
          retryDelayRef.current * RETRY_BACKOFF_MULTIPLIER,
          MAX_RETRY_DELAY
        );

        // Silent reconnection, no log needed
        setTimeout(() => {
          if (!eventSourceRef.current && isAuthenticated && isPageVisible) {
            connect();
          }
        }, delay);
      });
    } catch (err) {
      console.error('[Message SSE] Failed to connect:', err);
      setError(err instanceof Error ? err : new Error('Failed to connect'));
      setIsConnected(false);
    }
  }, [isAuthenticated, getAccessTokenSilently, enabled]);

  // Schedule reconnect function
  useEffect(() => {
    scheduleReconnectRef.current = () => {
      if (!enabled) {
        return;
      }
      const delay = INITIAL_RETRY_DELAY;
      console.log(`[Message SSE] Scheduling reconnection in ${delay}ms`);
      setTimeout(() => {
        if (!eventSourceRef.current && isAuthenticated && enabled) {
          connect();
        }
      }, delay);
    };
  }, [connect, isAuthenticated, enabled]);

  // Handle page visibility changes (pause/resume SSE when page goes to background/foreground)
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;

      if (isVisible) {
        // Page became visible, reconnect if authenticated and enabled
        if (enabled && isAuthenticated && !eventSourceRef.current) {
          const isVerbose =
            typeof window !== 'undefined' && localStorage.getItem('debugSSE') === 'true';
          if (isVerbose) {
            debugLog.log('[Message SSE] Page became visible, reconnecting...');
          }
          connect();
        }
      } else {
        // Page went to background, close connection to save resources
        // ERR_NETWORK_IO_SUSPENDED will occur, which is normal
        const isVerbose =
          typeof window !== 'undefined' && localStorage.getItem('debugSSE') === 'true';
        if (isVerbose && wasConnectedRef.current) {
          debugLog.log('[Message SSE] Page went to background, connection will be suspended');
        }
        // Don't close connection immediately - let browser handle it naturally
        // Connection will be automatically suspended by browser
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, isAuthenticated, connect]);

  // Connect on mount and when authentication changes
  // Add a delay to avoid conflicts with other initial API calls (UserProvider, etc.)
  useEffect(() => {
    if (enabled && isAuthenticated) {
      // Only connect if page is visible
      const isPageVisible = typeof document !== 'undefined' && !document.hidden;
      if (!isPageVisible) {
        // Page is in background, don't connect yet
        return;
      }

      // Delay SSE connection to let other critical API calls complete first
      const timeoutId = setTimeout(() => {
        connect();
      }, 500); // 500ms delay to let UserProvider and other providers initialize first

      return () => {
        clearTimeout(timeoutId);
        closeConnection();
      };
    } else {
      closeConnection();
    }
  }, [enabled, isAuthenticated, connect]);

  return {
    isConnected,
    lastMessage,
    error,
  };
}
