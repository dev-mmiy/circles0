'use client';

import { useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNotificationContext } from '@/contexts/NotificationContext';

interface NotificationBellProps {
  onClick: () => void;
  isOpen: boolean;
}

/**
 * 通知ベルアイコンコンポーネント（未読バッジ付き）
 * リアルタイム通知に対応
 */
export default function NotificationBell({ onClick, isOpen }: NotificationBellProps) {
  const { isAuthenticated } = useAuth0();
  const { unreadCount, isConnected } = useNotificationContext();

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
      title={isConnected ? 'リアルタイム接続中' : '接続中...'}
    >
      <Bell className="w-6 h-6 text-gray-700" />

      {/* 未読数バッジ */}
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}

      {/* リアルタイム接続インジケーター（デバッグ用、本番では非表示にできます） */}
      {isConnected && (
        <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white" />
      )}
    </button>
  );
}
