'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { getUnreadCount } from '@/lib/api/notifications';
import { useAuth0 } from '@auth0/auth0-react';

interface NotificationBellProps {
  onClick: () => void;
  isOpen: boolean;
}

/**
 * 通知ベルアイコンコンポーネント（未読バッジ付き）
 */
export default function NotificationBell({ onClick, isOpen }: NotificationBellProps) {
  const { isAuthenticated } = useAuth0();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // 未読数を取得
  const fetchUnreadCount = async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 初回ロードと定期的な更新
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();

      // 30秒ごとに未読数を更新
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // 外部から未読数を更新できるように
  useEffect(() => {
    if (isOpen) {
      // ドロップダウンを開いたら未読数をリフレッシュ
      fetchUnreadCount();
    }
  }, [isOpen]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-full hover:bg-gray-100 transition-colors ${
        isOpen ? 'bg-gray-100' : ''
      }`}
      aria-label="通知"
    >
      <Bell className="w-6 h-6 text-gray-700" />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
