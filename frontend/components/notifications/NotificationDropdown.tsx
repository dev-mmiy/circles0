'use client';

import { useEffect, useState, useRef } from 'react';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  getNotifications,
  markAllNotificationsAsRead,
  Notification,
} from '@/lib/api/notifications';
import { useNotificationContext } from '@/contexts/NotificationContext';
import NotificationItem from './NotificationItem';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 通知ドロップダウンコンポーネント
 * リアルタイム通知に対応
 */
export default function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const t = useTranslations('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Contextから未読数とリアルタイム通知を取得
  const { unreadCount, setUnreadCount, lastNotification } = useNotificationContext();

  // 通知を取得
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await getNotifications(0, 20, false);
      setNotifications(response.notifications);
      // Contextの未読数を更新
      setUnreadCount(response.unread_count);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ドロップダウンが開いたら通知を取得
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // リアルタイム通知を受信したらリストを更新
  useEffect(() => {
    if (lastNotification && isOpen) {
      // 新しい通知をリストの先頭に追加
      fetchNotifications();
    }
  }, [lastNotification, isOpen]);

  // 外部クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // 全て既読にする
  const handleMarkAllAsRead = async () => {
    if (isMarkingAllRead || unreadCount === 0) return;

    try {
      setIsMarkingAllRead(true);
      await markAllNotificationsAsRead();
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  // 通知が既読になったらリロード
  const handleNotificationRead = () => {
    fetchNotifications();
  };

  // 通知が削除されたらリロード
  const handleNotificationDelete = () => {
    fetchNotifications();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{t('title')}</h3>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAllRead}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {t('markAllAsRead')}
          </button>
        )}
      </div>

      {/* 通知リスト */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <p className="text-sm">{t('noNotifications')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={handleNotificationRead}
                onDelete={handleNotificationDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* フッター */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 text-center">
          <Link
            href="/notifications"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            onClick={onClose}
          >
            {t('viewAll')}
          </Link>
        </div>
      )}
    </div>
  );
}
