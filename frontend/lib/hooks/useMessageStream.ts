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
  onMessage?: (message: MessageEvent) => void
): UseMessageStreamReturn {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryDelayRef = useRef(INITIAL_RETRY_DELAY);
  const scheduleReconnectRef = useRef<(() => void) | null>(null);

  const closeConnection = () => {
    if (eventSourceRef.current) {
      console.log('[Message SSE] Closing connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  };

  const connect = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('[Message SSE] Not authenticated, skipping connection');
      return;
    }

    if (eventSourceRef.current) {
      console.log('[Message SSE] Connection already exists');
      return;
    }

    try {
      // Get authentication token
      const token = await getAccessTokenSilently();

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

          if (onMessage) {
            onMessage(message);
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

          if (onMessage) {
            onMessage(message);
          }
        } catch (error) {
          console.error('[Message SSE] Failed to parse group message:', error);
        }
      });

      // Heartbeat (keep-alive ping)
      eventSource.addEventListener('ping', (event) => {
        console.log('[Message SSE] Heartbeat received');
      });

      // Server requests reconnection (before timeout)
      eventSource.addEventListener('reconnect', (event) => {
        console.log('[Message SSE] Server requested reconnection:', event.data);
        closeConnection();
        scheduleReconnectRef.current?.();
      });

      // Error event
      eventSource.addEventListener('error', (errorEvent) => {
        console.error('[Message SSE] Error event:', errorEvent);
        setError(new Error('SSE connection error'));
        setIsConnected(false);
        closeConnection();

        // Schedule reconnection with exponential backoff
        const delay = retryDelayRef.current;
        retryDelayRef.current = Math.min(
          retryDelayRef.current * RETRY_BACKOFF_MULTIPLIER,
          MAX_RETRY_DELAY
        );

        console.log(`[Message SSE] Scheduling reconnection in ${delay}ms`);
        setTimeout(() => {
          if (!eventSourceRef.current) {
            connect();
          }
        }, delay);
      });
    } catch (err) {
      console.error('[Message SSE] Failed to connect:', err);
      setError(err instanceof Error ? err : new Error('Failed to connect'));
      setIsConnected(false);
    }
  }, [isAuthenticated, getAccessTokenSilently, onMessage]);

  // Schedule reconnect function
  useEffect(() => {
    scheduleReconnectRef.current = () => {
      const delay = INITIAL_RETRY_DELAY;
      console.log(`[Message SSE] Scheduling reconnection in ${delay}ms`);
      setTimeout(() => {
        if (!eventSourceRef.current && isAuthenticated) {
          connect();
        }
      }, delay);
    };
  }, [connect, isAuthenticated]);

  // Connect on mount and when authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      closeConnection();
    }

    // Cleanup on unmount
    return () => {
      closeConnection();
    };
  }, [isAuthenticated, connect]);

  return {
    isConnected,
    lastMessage,
    error,
  };
}

