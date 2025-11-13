'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth0 } from '@auth0/auth0-react';
import AuthButton from './AuthButton';
import NotificationBell from './notifications/NotificationBell';
import NotificationDropdown from './notifications/NotificationDropdown';

/**
 * アプリケーション共通ヘッダーコンポーネント
 */
export default function Header() {
  const { isAuthenticated, user } = useAuth0();
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

          {/* ナビゲーション */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                href="/"
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                ホーム
              </Link>
              <Link
                href="/feed"
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                フィード
              </Link>
              <Link
                href="/users/search"
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                ユーザー検索
              </Link>
              <Link
                href="/profile/me"
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                マイページ
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
