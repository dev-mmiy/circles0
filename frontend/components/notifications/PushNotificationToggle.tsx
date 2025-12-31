'use client';

/**
 * Push notification toggle component
 *
 * Allows users to enable/disable push notifications
 */

import { useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePushNotifications } from '@/lib/hooks/usePushNotifications';

interface PushNotificationToggleProps {
  variant?: 'button' | 'switch';
  showLabel?: boolean;
  className?: string;
}

export function PushNotificationToggle({
  variant = 'button',
  showLabel = true,
  className = '',
}: PushNotificationToggleProps) {
  const t = useTranslations('pushNotifications');
  const { isSupported, permission, isSubscribed, isLoading, error, subscribe, unsubscribe } =
    usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  // Not supported
  if (!isSupported) {
    return (
      <div className={`text-gray-500 text-sm ${className}`}>
        <BellOff className="inline-block w-4 h-4 mr-1" />
        {showLabel && <span>{t('notSupported')}</span>}
      </div>
    );
  }

  // Permission denied
  if (permission === 'denied') {
    return (
      <div className={`text-red-500 text-sm ${className}`}>
        <BellOff className="inline-block w-4 h-4 mr-1" />
        {showLabel && <span>{t('permissionDenied')}</span>}
      </div>
    );
  }

  if (variant === 'switch') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {showLabel && <span className="text-sm text-gray-700">{t('pushNotifications')}</span>}
        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full
            transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${isSubscribed ? 'bg-blue-600' : 'bg-gray-300'}
            ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          aria-label={isSubscribed ? t('disable') : t('enable')}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${isSubscribed ? 'translate-x-6' : 'translate-x-1'}
            `}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          </span>
        </button>
      </div>
    );
  }

  // Button variant
  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
        ${
          isSubscribed
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      aria-label={isSubscribed ? t('disable') : t('enable')}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : isSubscribed ? (
        <Bell className="w-5 h-5" />
      ) : (
        <BellOff className="w-5 h-5" />
      )}
      {showLabel && <span>{isSubscribed ? t('enabled') : t('disabled')}</span>}
    </button>
  );
}

export default PushNotificationToggle;
