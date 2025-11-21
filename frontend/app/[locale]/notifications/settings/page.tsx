'use client';

/**
 * Notification settings page
 *
 * Allows users to configure push notification preferences
 */

import { useAuth0 } from '@auth0/auth0-react';
import { Bell, Settings, ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { PushNotificationToggle } from '@/components/notifications/PushNotificationToggle';
import { usePushNotifications } from '@/lib/hooks/usePushNotifications';

export default function NotificationSettingsPage() {
  const t = useTranslations('pushNotifications');
  const tNav = useTranslations('navigation');
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect } = useAuth0();
  const { isSupported, permission, isSubscribed } = usePushNotifications();

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {t('settingsTitle')}
            </h1>
            <p className="text-gray-600 mb-6">
              {t('settingsDescription')}
            </p>
            <button
              onClick={() => loginWithRedirect()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              ログイン
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/notifications"
            className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {tNav('back') || '戻る'}
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {t('settingsTitle')}
              </h1>
              <p className="text-gray-600 text-sm">
                {t('settingsDescription')}
              </p>
            </div>
          </div>
        </div>

        {/* Push Notifications Section */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Push Notification Toggle */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-800 mb-1">
                  {t('pushNotifications')}
                </h2>
                <p className="text-sm text-gray-600">
                  {t('enableDescription')}
                </p>
                {!isSupported && (
                  <p className="text-sm text-orange-600 mt-2">
                    {t('notSupported')}
                  </p>
                )}
                {permission === 'denied' && (
                  <p className="text-sm text-red-600 mt-2">
                    {t('permissionDenied')}
                  </p>
                )}
              </div>
              <div className="ml-4">
                <PushNotificationToggle variant="switch" showLabel={false} />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="p-6 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              ステータス
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">ブラウザサポート</span>
                <span className={isSupported ? 'text-green-600' : 'text-red-600'}>
                  {isSupported ? '対応' : '非対応'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">通知権限</span>
                <span className={
                  permission === 'granted' ? 'text-green-600' :
                  permission === 'denied' ? 'text-red-600' :
                  'text-yellow-600'
                }>
                  {permission === 'granted' ? '許可済み' :
                   permission === 'denied' ? '拒否' :
                   '未設定'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">購読状態</span>
                <span className={isSubscribed ? 'text-green-600' : 'text-gray-500'}>
                  {isSubscribed ? '有効' : '無効'}
                </span>
              </div>
            </div>
          </div>

          {/* Help text */}
          {permission === 'denied' && (
            <div className="p-6 bg-yellow-50 border-t border-yellow-100">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">
                通知を有効にするには
              </h3>
              <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
                <li>ブラウザのアドレスバー左側の鍵アイコンをクリック</li>
                <li>「サイトの設定」を開く</li>
                <li>「通知」を「許可」に変更</li>
                <li>ページを再読み込み</li>
              </ol>
            </div>
          )}
        </div>

        {/* Future: Notification type toggles */}
        {isSubscribed && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              通知タイプの設定
            </h2>
            <p className="text-sm text-gray-500">
              今後のアップデートで、通知タイプごとの設定が可能になります。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
