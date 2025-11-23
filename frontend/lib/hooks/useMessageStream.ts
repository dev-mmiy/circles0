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
      // Only log if we were connected (not just cleanup)
      if (wasConnectedRef.current) {
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
      debugLog.log('[Message SSE] Not authenticated, skipping connection');
      return;
    }

    if (eventSourceRef.current) {
      // Connection already exists, skip
      return;
    }

    try {
      // Get authentication token using tokenManager to prevent conflicts with other API calls
      debugLog.log('[Message SSE] Getting token for SSE connection...', { timestamp: new Date().toISOString() });
      const tokenStartTime = Date.now();
      
      let token: string;
      try {
        token = await getAccessTokenFromManager(getAccessTokenSilently);
        const tokenElapsed = Date.now() - tokenStartTime;
        debugLog.log('[Message SSE] Token retrieved successfully', { elapsed: tokenElapsed, timestamp: new Date().toISOString() });
      } catch (tokenError: any) {
        const tokenElapsed = Date.now() - tokenStartTime;
        debugLog.error('[Message SSE] Failed to get token for SSE connection:', tokenError, {
          elapsed: tokenElapsed,
          timestamp: new Date().toISOString()
        });
        
        // Don't throw - just set error and return
        // The connection will be retried automatically by the error handler
        setError(tokenError instanceof Error ? tokenError : new Error('Failed to get token'));
        return;
      }

      // EventSource doesn't support custom headers natively
      // We'll append the token as a query parameter
      const urlWithAuth = `${SSE_ENDPOINT}?token=${encodeURIComponent(token)}`;

      console.log('[Message SSE] Connecting to message stream...');
      const eventSource = new EventSource(urlWithAuth);
      eventSourceRef.current = eventSource;

      // Connection established
      eventSource.addEventListener('connected', (event) => {
        console.log('[Message SSE] Connected:', event.data);
        setIsConnected(true);
        wasConnectedRef.current = true;
        setError(null);
        // Reset retry delay on successful connection
        retryDelayRef.current = INITIAL_RETRY_DELAY;
      });

      // New message received
      eventSource.addEventListener('message', (event) => {
        try {
          const message: MessageEvent = JSON.parse(event.data);
          console.log('[Message SSE] New message:', message);
          setLastMessage(message);

          if (onMessageRef.current) {
            onMessageRef.current(message);
          }
        } catch (error) {
          console.error('[Message SSE] Failed to parse message:', error);
        }
      });

      // New group message received
      eventSource.addEventListener('group_message', (event) => {
        try {
          const message: MessageEvent = JSON.parse(event.data);
          console.log('[Message SSE] New group message:', message);
          setLastMessage(message);

          if (onMessageRef.current) {
            onMessageRef.current(message);
          }
        } catch (error) {
          console.error('[Message SSE] Failed to parse group message:', error);
        }
      });

      // Heartbeat (keep-alive ping)
      eventSource.addEventListener('ping', (event) => {
        // Heartbeat received - no need to log every ping
      });

      // Server requests reconnection (before timeout)
      eventSource.addEventListener('reconnect', (event) => {
        console.log('[Message SSE] Server requested reconnection:', event.data);
        closeConnection();
        scheduleReconnectRef.current?.();
      });

      // Error event
      eventSource.addEventListener('error', (errorEvent) => {
        const eventSource = errorEvent.target as EventSource;
        const readyState = eventSource.readyState;
        
        // EventSource readyState:
        // 0 = CONNECTING
        // 1 = OPEN
        // 2 = CLOSED
        
        // Connection closed - check if it was a normal disconnect or an error
        if (readyState === EventSource.CLOSED) {
          // Only log if we were previously connected (unexpected disconnect)
          if (wasConnectedRef.current) {
            console.log('[Message SSE] Connection closed, will reconnect');
          } else {
            // Connection failed to establish - log as warning, not error
            // This is common during initial connection attempts
            console.warn('[Message SSE] Connection failed to establish, will retry');
          }
        } else {
          // Unexpected state
          console.error('[Message SSE] Unexpected error state:', readyState, errorEvent);
        }
        
        setIsConnected(false);
        wasConnectedRef.current = false;
        closeConnection();

        // Schedule reconnection with exponential backoff
        const delay = retryDelayRef.current;
        retryDelayRef.current = Math.min(
          retryDelayRef.current * RETRY_BACKOFF_MULTIPLIER,
          MAX_RETRY_DELAY
        );

        console.log(`[Message SSE] Scheduling reconnection in ${delay}ms`);
        setTimeout(() => {
          if (!eventSourceRef.current && isAuthenticated) {
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

  // Connect on mount and when authentication changes
  // Add a delay to avoid conflicts with other initial API calls (UserProvider, etc.)
  useEffect(() => {
    if (enabled && isAuthenticated) {
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

