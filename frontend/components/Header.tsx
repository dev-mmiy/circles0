'use client';

import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import AuthButton from './AuthButton';
import NotificationBell from './notifications/NotificationBell';
import NotificationDropdown from './notifications/NotificationDropdown';
import LanguageSwitcher from './LanguageSwitcher';

/**
 * Application Header Component with i18n support
 */
export default function Header() {
  const { isAuthenticated } = useAuth0();
  const t = useTranslations('navigation');
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
                {t('home')}
              </Link>
              <Link
                href="/feed"
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                {t('feed')}
              </Link>
              <Link
                href="/search"
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                {t('userSearch')}
              </Link>
              <Link
                href="/profile/me"
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                {t('myPage')}
              </Link>
            </nav>
          )}

          {/* 右側のアクション */}
          <div className="flex items-center gap-4">
            {/* 言語切り替え */}
            <LanguageSwitcher />

            {/* 通知ベル */}
            {isAuthenticated && (
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
            )}

            {/* 認証ボタン */}
            <AuthButton />
          </div>
        </div>
      </div>
    </header>
  );
}
