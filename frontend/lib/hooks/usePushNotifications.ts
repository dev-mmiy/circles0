/**
 * React hook for managing push notifications
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isSubscribedToPushNotifications,
} from '@/lib/utils/pushNotifications';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: Error | null;
  requestPermission: () => Promise<void>;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check support and permission on mount
  useEffect(() => {
    const checkSupport = () => {
      const supported = isPushNotificationSupported();
      setIsSupported(supported);

      if (supported) {
        setPermission(getNotificationPermission());
      }
    };

    checkSupport();
  }, []);

  // Register service worker and check subscription status
  useEffect(() => {
    if (!isSupported || !isAuthenticated) {
      return;
    }

    const initialize = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Register service worker
        const swRegistration = await registerServiceWorker();
        if (!swRegistration) {
          throw new Error('Failed to register service worker');
        }
        setRegistration(swRegistration);

        // Check subscription status
        const subscribed = await isSubscribedToPushNotifications(swRegistration);
        setIsSubscribed(subscribed);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize push notifications'));
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [isSupported, isAuthenticated]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      setError(new Error('Push notifications are not supported'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);

      if (newPermission !== 'granted') {
        setError(new Error('Notification permission denied'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to request permission'));
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported || !registration || !isAuthenticated) {
      setError(new Error('Push notifications not available'));
      return;
    }

    if (permission !== 'granted') {
      await requestPermission();
      if (permission !== 'granted') {
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessTokenSilently();
      const subscription = await subscribeToPushNotifications(registration, token);

      if (subscription) {
        setIsSubscribed(true);
      } else {
        throw new Error('Failed to subscribe to push notifications');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to subscribe'));
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, registration, isAuthenticated, permission, requestPermission, getAccessTokenSilently]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!registration || !isAuthenticated) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessTokenSilently();
      const success = await unsubscribeFromPushNotifications(registration, token);

      if (success) {
        setIsSubscribed(false);
      } else {
        throw new Error('Failed to unsubscribe from push notifications');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to unsubscribe'));
    } finally {
      setIsLoading(false);
    }
  }, [registration, isAuthenticated, getAccessTokenSilently]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
  };
}

