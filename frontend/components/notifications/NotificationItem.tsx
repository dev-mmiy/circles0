'use client';

import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { X } from 'lucide-react';
import {
  Notification,
  getNotificationText,
  getNotificationIcon,
  getNotificationLink,
  markNotificationAsRead,
  deleteNotification,
} from '@/lib/api/notifications';
import { useState } from 'react';

interface NotificationItemProps {
  notification: Notification;
  onRead?: () => void;
  onDelete?: () => void;
}

/**
 * 個別の通知アイテムコンポーネント
 */
export default function NotificationItem({
  notification,
  onRead,
  onDelete,
}: NotificationItemProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  // 通知クリック時の処理
  const handleClick = async () => {
    try {
      // 未読の場合は既読にする
      if (!notification.is_read) {
        await markNotificationAsRead(notification.id);
        onRead?.();
      }

      // 遷移先URLへ移動
      const link = getNotificationLink(notification);
      router.push(link);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // 削除ボタンクリック時の処理
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // 親要素のクリックイベントを阻止

    if (isDeleting) return;

    try {
      setIsDeleting(true);
      await deleteNotification(notification.id);
      onDelete?.();
    } catch (error) {
      console.error('Failed to delete notification:', error);
      setIsDeleting(false);
    }
  };

  // 相対時間を取得
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ja,
  });

  return (
    <div
      onClick={handleClick}
      className={`relative flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
        !notification.is_read ? 'bg-blue-50' : ''
      }`}
    >
      {/* アイコン */}
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-white rounded-full border border-gray-200 text-xl">
        {getNotificationIcon(notification.type)}
      </div>

      {/* 通知内容 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{getNotificationText(notification)}</p>

        {/* 投稿内容のプレビュー（あれば） */}
        {notification.post && (
          <p className="mt-1 text-xs text-gray-500 line-clamp-2">
            「{notification.post.content}」
          </p>
        )}

        {/* コメント内容のプレビュー（あれば） */}
        {notification.comment && !notification.post && (
          <p className="mt-1 text-xs text-gray-500 line-clamp-2">
            「{notification.comment.content}」
          </p>
        )}

        {/* 時間 */}
        <p className="mt-1 text-xs text-gray-400">{timeAgo}</p>
      </div>

      {/* 未読インジケーター */}
      {!notification.is_read && (
        <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full" />
      )}

      {/* 削除ボタン */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
        aria-label="削除"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
