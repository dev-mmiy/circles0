'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import Header from '@/components/Header';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { extractErrorInfo } from '@/lib/utils/errorHandler';
import {
  getNotifications,
  markAllNotificationsAsRead,
  Notification,
} from '@/lib/api/notifications';
import { useNotificationContext } from '@/contexts/NotificationContext';
import NotificationItem from '@/components/notifications/NotificationItem';
import { Check } from 'lucide-react';

export default function NotificationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth0();
  const router = useRouter();
  const t = useTranslations('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const NOTIFICATIONS_PER_PAGE = 20;

  // Contextから未読数とリアルタイム通知を取得
  // NotificationProviderはレイアウトで提供されているため、常に利用可能
  const { unreadCount, setUnreadCount, lastNotification } = useNotificationContext();

  // 通知を取得
  const loadNotifications = async (reset: boolean = false) => {
    try {
      const currentPage = reset ? 0 : page;
      setIsLoading(reset);
      setIsLoadingMore(!reset);

      const response = await getNotifications(
        currentPage * NOTIFICATIONS_PER_PAGE,
        NOTIFICATIONS_PER_PAGE,
        filterType === 'unread'
      );

      if (reset) {
        setNotifications(response.notifications);
        setPage(0);
      } else {
        setNotifications([...notifications, ...response.notifications]);
      }

      setUnreadCount(response.unread_count);
      setHasMore(response.notifications.length === NOTIFICATIONS_PER_PAGE);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
      const errorInfo = extractErrorInfo(err);
      setError(errorInfo);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // 認証チェックと初期読み込み
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      // 未認証の場合はホームにリダイレクト
      if (!isRedirecting) {
        setIsRedirecting(true);
        router.push('/');
      }
      return;
    }
    
    loadNotifications(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, filterType]);

  // リアルタイム通知を受信したらリストを更新
  useEffect(() => {
    if (lastNotification) {
      loadNotifications(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastNotification]);

  // さらに読み込む
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setPage(page + 1);
    loadNotifications(false);
  };

  // 全て既読にする
  const handleMarkAllAsRead = async () => {
    if (isMarkingAllRead || unreadCount === 0) return;

    try {
      setIsMarkingAllRead(true);
      await markAllNotificationsAsRead();
      await loadNotifications(true);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  // 通知が既読になったらリロード
  const handleNotificationRead = () => {
    loadNotifications(true);
  };

  // 通知が削除されたらリロード
  const handleNotificationDelete = () => {
    loadNotifications(true);
  };

  if (authLoading || isLoading || isRedirecting) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{t('pageTitle')}</h1>
            <p className="text-gray-600 mt-2">{t('pageSubtitle')}</p>
          </div>

          {/* Filter Tabs and Mark All Read */}
          <div className="mb-6 flex items-center justify-between border-b border-gray-200">
            <nav className="flex space-x-8" aria-label="Notification filter">
              <button
                onClick={() => setFilterType('all')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  filterType === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('filterAll')}
              </button>
              <button
                onClick={() => setFilterType('unread')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  filterType === 'unread'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('filterUnread')}
                {unreadCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium leading-none text-white bg-blue-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            </nav>

            {unreadCount > 0 && filterType === 'all' && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllRead}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
              >
                <Check className="w-4 h-4" />
                {t('markAllAsRead')}
              </button>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6">
              <ErrorDisplay
                error={error}
                onRetry={() => loadNotifications(true)}
                showDetails={false}
              />
            </div>
          )}

          {/* Notifications list */}
          <div className="bg-white rounded-lg shadow">
            {notifications.length === 0 ? (
              <div className="p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  {filterType === 'unread'
                    ? t('noUnreadNotifications')
                    : t('noNotifications')}
                </h3>
                <p className="mt-2 text-gray-500">
                  {filterType === 'unread'
                    ? t('noUnreadNotificationsMessage')
                    : t('noNotifications')}
                </p>
              </div>
            ) : (
              <>
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

                {/* Load more button */}
                {hasMore && (
                  <div className="flex justify-center p-6 border-t border-gray-200">
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                        isLoadingMore
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      {isLoadingMore ? (
                        <span className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          {t('loading')}
                        </span>
                      ) : (
                        t('loadMore')
                      )}
                    </button>
                  </div>
                )}

                {/* End of notifications message */}
                {!hasMore && notifications.length > 0 && (
                  <div className="text-center py-6 border-t border-gray-200">
                    <p className="text-gray-500">{t('allNotificationsShown')}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

