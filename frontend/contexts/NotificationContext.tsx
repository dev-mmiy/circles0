'use client';

/**
 * NotificationContext
 *
 * Global context for managing real-time notifications across the application.
 * Provides:
 * - Real-time notification stream via SSE
 * - Unread notification count
 * - Notification list management
 * - Mark as read/delete functionality
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  useNotificationStream,
  NotificationEvent,
} from '@/lib/hooks/useNotificationStream';
import { getUnreadCount } from '@/lib/api/notifications';

interface NotificationContextValue {
  // Real-time connection status
  isConnected: boolean;

  // Unread count
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;

  // Latest notification (for triggering UI updates)
  lastNotification: NotificationEvent | null;

  // Error state
  error: Error | null;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotificationContext must be used within a NotificationProvider'
    );
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { isAuthenticated } = useAuth0();
  const [unreadCount, setUnreadCount] = useState(0);

  // Handle incoming real-time notifications
  const handleNotification = useCallback((notification: NotificationEvent) => {
    console.log('[NotificationContext] New notification received:', notification);

    // Increment unread count (notification is unread by default)
    if (!notification.is_read) {
      setUnreadCount((prev) => prev + 1);
    }

    // You can add more logic here, such as:
    // - Show browser notification
    // - Play sound
    // - Update notification list in state
  }, []);

  // Connect to SSE stream
  const { isConnected, error, lastNotification } = useNotificationStream(
    handleNotification
  );

  // Fetch initial unread count on mount
  useEffect(() => {
    if (isAuthenticated) {
      getUnreadCount()
        .then((count) => {
          console.log('[NotificationContext] Initial unread count:', count);
          setUnreadCount(count);
        })
        .catch((error) => {
          console.error('[NotificationContext] Failed to fetch unread count:', error);
        });
    } else {
      setUnreadCount(0);
    }
  }, [isAuthenticated]);

  const incrementUnreadCount = useCallback(() => {
    setUnreadCount((prev) => prev + 1);
  }, []);

  const decrementUnreadCount = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const value: NotificationContextValue = {
    isConnected,
    unreadCount,
    setUnreadCount,
    incrementUnreadCount,
    decrementUnreadCount,
    lastNotification,
    error,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
