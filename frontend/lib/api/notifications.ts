/**
 * Notification API client
 */

import { apiClient } from './client';

export enum NotificationType {
  FOLLOW = 'follow',
  COMMENT = 'comment',
  REPLY = 'reply',
  LIKE = 'like',
  COMMENT_LIKE = 'comment_like',
  MESSAGE = 'message',
}

export interface UserSummary {
  id: string;
  member_id: string;
  nickname: string;
  username: string | null;
  avatar_url: string | null;
}

export interface PostSummary {
  id: string;
  content: string;
}

export interface CommentSummary {
  id: string;
  content: string;
  post_id: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: NotificationType;
  post_id: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
  actor: UserSummary | null;
  post: PostSummary | null;
  comment: CommentSummary | null;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

/**
 * 通知一覧を取得
 */
export async function getNotifications(
  skip: number = 0,
  limit: number = 20,
  unreadOnly: boolean = false
): Promise<NotificationListResponse> {
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
    unread_only: unreadOnly.toString(),
  });

  const response = await apiClient.get<NotificationListResponse>(
    `/notifications?${params.toString()}`
  );
  return response.data;
}

/**
 * 未読通知数を取得
 */
export async function getUnreadCount(): Promise<number> {
  console.log('[getUnreadCount] Calling API with baseURL:', apiClient.defaults.baseURL);
  console.log('[getUnreadCount] Full URL will be:', `${apiClient.defaults.baseURL}/notifications/unread-count`);
  const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
  return response.data.unread_count;
}

/**
 * 通知を既読にする
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await apiClient.put(`/notifications/${notificationId}/read`);
}

/**
 * 全ての通知を既読にする
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  await apiClient.put('/notifications/mark-all-read');
}

/**
 * 通知を削除
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  await apiClient.delete(`/notifications/${notificationId}`);
}

/**
 * 通知タイプから表示用テキストを取得
 */
export function getNotificationText(notification: Notification): string {
  const actorName = notification.actor?.nickname || '誰か';

  switch (notification.type) {
    case NotificationType.FOLLOW:
      return `${actorName}があなたをフォローしました`;
    case NotificationType.COMMENT:
      return `${actorName}があなたの投稿にコメントしました`;
    case NotificationType.REPLY:
      return `${actorName}があなたのコメントに返信しました`;
    case NotificationType.LIKE:
      return `${actorName}があなたの投稿にいいねしました`;
    case NotificationType.COMMENT_LIKE:
      return `${actorName}があなたのコメントにいいねしました`;
    case NotificationType.MESSAGE:
      return `${actorName}からメッセージが届きました`;
    default:
      return '新しい通知があります';
  }
}

/**
 * 通知タイプからアイコンの絵文字を取得
 */
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case NotificationType.FOLLOW:
      return '👤';
    case NotificationType.COMMENT:
      return '💬';
    case NotificationType.REPLY:
      return '↩️';
    case NotificationType.LIKE:
      return '❤️';
    case NotificationType.COMMENT_LIKE:
      return '❤️';
    case NotificationType.MESSAGE:
      return '✉️';
    default:
      return '🔔';
  }
}

/**
 * 通知から遷移先URLを取得
 */
export function getNotificationLink(notification: Notification): string {
  switch (notification.type) {
    case NotificationType.FOLLOW:
      // フォロー通知 - アクターのプロフィールへ
      return `/profile/${notification.actor_id}`;
    case NotificationType.COMMENT:
    case NotificationType.REPLY:
    case NotificationType.LIKE:
      // 投稿関連の通知 - 投稿詳細へ
      if (notification.post_id) {
        return `/posts/${notification.post_id}`;
      }
      return '/feed';
    case NotificationType.MESSAGE:
      // メッセージ通知 - メッセージ一覧へ
      return '/messages';
    default:
      return '/feed';
  }
}
