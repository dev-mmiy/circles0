'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth0 } from '@auth0/auth0-react';
import { useUser } from '@/contexts/UserContext';
import { useTranslations } from '@/lib/i18n/translations';
import AuthButton from './AuthButton';
import NotificationBell from './notifications/NotificationBell';
import NotificationDropdown from './notifications/NotificationDropdown';

/**
 * Application Header Component with i18n support
 */
export default function Header() {
  const { isAuthenticated } = useAuth0();
  const { user } = useUser();
  const { t } = useTranslations(user?.preferred_language);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* ロゴ・ホーム */}
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900 hover:text-gray-700">
              Disease Community
            </Link>
          </div>

          {/* Navigation */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                href="/"
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                {t('navigation.home')}
              </Link>
              <Link
                href="/feed"
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                {t('navigation.feed')}
              </Link>
              <Link
                href="/users/search"
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                {t('navigation.userSearch')}
              </Link>
              <Link
                href="/profile/me"
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                {t('navigation.myPage')}
              </Link>
            </nav>
          )}

          {/* 右側のアクション */}
          <div className="flex items-center gap-4">
            {/* 通知ベル */}
            <div className="relative">
              <NotificationBell
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                isOpen={isNotificationOpen}
              />
              <NotificationDropdown
                isOpen={isNotificationOpen}
                onClose={() => setIsNotificationOpen(false)}
              />
            </div>

            {/* 認証ボタン */}
            <AuthButton />
          </div>
        </div>
      </div>
    </header>
  );
}
