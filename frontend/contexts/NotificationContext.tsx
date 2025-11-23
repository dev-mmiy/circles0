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
import { setAuthToken } from '@/lib/api/client';
import { addLocalePrefix } from '@/lib/utils/locale';
import { getAccessToken as getAccessTokenFromManager } from '@/lib/utils/tokenManager';

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
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [unreadCount, setUnreadCount] = useState(0);

  // Handle incoming real-time notifications
  const handleNotification = useCallback((notification: NotificationEvent) => {
    console.log('[NotificationContext] New notification received:', notification);

    // Increment unread count (notification is unread by default)
    if (!notification.is_read) {
      setUnreadCount((prev) => prev + 1);
    }

    // Show browser notification if permission is granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      // Note: Browser notifications don't support i18n directly
      // We'll use English messages for now, or you can implement locale detection
      const messages: Record<string, { title: string; body: string }> = {
        follow: { title: 'New Follower', body: 'Someone started following you' },
        comment: { title: 'New Comment', body: 'Someone commented on your post' },
        reply: { title: 'New Reply', body: 'Someone replied to your comment' },
        like: { title: 'New Like', body: 'Someone liked your post' },
        comment_like: { title: 'New Like', body: 'Someone liked your comment' },
        message: { title: 'New Message', body: 'Someone sent you a message' },
      };

      const message = messages[notification.type] || { title: 'New Notification', body: 'You have a new notification' };
      
      // Build notification URL with locale prefix
      let url = '/notifications';
      if (notification.type === 'message') {
        url = '/messages';
      } else if (notification.post_id) {
        url = `/posts/${notification.post_id}`;
      }
      
      // Add locale prefix to URL
      const localizedUrl = addLocalePrefix(url);

      // Show browser notification
      const browserNotification = new Notification(message.title, {
        body: message.body,
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        tag: `notification-${notification.id}`,
        data: {
          notification_id: notification.id,
          type: notification.type,
          url: localizedUrl,
        },
      });

      // Handle notification click
      browserNotification.onclick = () => {
        window.focus();
        window.location.href = localizedUrl;
        browserNotification.close();
      };
    }

    // You can add more logic here, such as:
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
      const fetchUnreadCount = async () => {
        try {
          // Use tokenManager to prevent duplicate token requests
          const token = await getAccessTokenFromManager(getAccessTokenSilently);
          setAuthToken(token);
          
          const count = await getUnreadCount();
          console.log('[NotificationContext] Initial unread count:', count);
          setUnreadCount(count);
        } catch (error) {
          console.error('[NotificationContext] Failed to fetch unread count:', error);
          setUnreadCount(0);
        }
      };
      
      // Add a small delay to avoid conflicts with other initial API calls
      const timeoutId = setTimeout(() => {
        fetchUnreadCount();
      }, 100);
      return () => clearTimeout(timeoutId);
    } else {
      setUnreadCount(0);
    }
  }, [isAuthenticated, getAccessTokenSilently]);

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
