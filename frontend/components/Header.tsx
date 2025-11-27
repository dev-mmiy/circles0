'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { Menu, X } from 'lucide-react';
import AuthButton from './AuthButton';
import NotificationBell from './notifications/NotificationBell';
import NotificationDropdown from './notifications/NotificationDropdown';
import { getTotalUnreadCount } from '@/lib/api/messages';
import { setAuthToken } from '@/lib/api/client';
import { useMessageStream, MessageEvent } from '@/lib/hooks/useMessageStream';

/**
 * Application Header Component with i18n support and mobile hamburger menu
 */
export default function Header() {
  const { isAuthenticated, isLoading: authLoading, user, getAccessTokenSilently } = useAuth0();
  const t = useTranslations('navigation');
  const pathname = usePathname();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // 認証状態をチェック（authLoadingがtrueでもuserが存在すれば認証済みとみなす）
  // Edgeなど一部ブラウザでisAuthenticatedがfalseのままになる問題への対策
  const showAuthenticatedUI = isAuthenticated || (!!user && !authLoading);

  // デバッグログ（開発環境のみ）
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Header] Auth state:', { authLoading, isAuthenticated, hasUser: !!user, showAuthenticatedUI });
    }
  }, [authLoading, isAuthenticated, user, showAuthenticatedUI]);

  // Load unread message count
  const loadUnreadCount = useCallback(async () => {
    // authLoadingがtrueでも、isAuthenticatedがtrueなら続行
    if (authLoading && !isAuthenticated) {
      return;
    }
    if (!isAuthenticated) {
      setUnreadMessageCount(0);
      return;
    }

    try {
      const token = await getAccessTokenSilently();
      setAuthToken(token);
      // Re-enabled after performance optimization of unread count calculation
      const count = await getTotalUnreadCount();
      setUnreadMessageCount(count);
    } catch (error) {
      console.error('Failed to load unread message count:', error);
      setUnreadMessageCount(0);
    }
  }, [authLoading, isAuthenticated, getAccessTokenSilently]);

  // Handle new messages from SSE
  const handleNewMessage = useCallback((_message: MessageEvent) => {
    // Increment unread count if message is not from current user
    // Note: We can't determine current user ID here, so we'll reload the count
    loadUnreadCount();
  }, [loadUnreadCount]);

  // Use message stream for real-time updates
  // Skip connection in pages that have their own useMessageStream to avoid duplicate connections
  const isMessagePage = pathname?.startsWith('/messages');
  const isGroupPage = pathname?.match(/\/groups\/[^/]+$/);
  const skipMessageStream = isMessagePage || isGroupPage;
  useMessageStream(handleNewMessage, !skipMessageStream);

  // Load unread count on mount and when authentication state changes
  useEffect(() => {
    loadUnreadCount();
    
    // Refresh unread count every 30 seconds
    const interval = setInterval(() => {
      loadUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* 左側: ハンバーガーメニュー + ロゴ */}
          <div className="flex items-center gap-4">
            {/* ハンバーガーメニューボタン（モバイルのみ） */}
            {showAuthenticatedUI && (
              <button
                onClick={handleMobileMenuToggle}
                className="md:hidden p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label={isMobileMenuOpen ? t('closeMenu') : t('openMenu')}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            )}

            {/* ロゴ・ホーム */}
            <Link href="/" className="text-xl font-bold text-gray-900 hover:text-gray-700">
              Lifry
            </Link>
          </div>

          {/* Navigation (デスクトップ) */}
          {showAuthenticatedUI && (
            <nav className="hidden md:flex items-center space-x-6">
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
                href="/messages"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium relative ${pathname.startsWith('/messages')
                  ? 'border-blue-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
              >
                {t('messages')}
                {unreadMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-600 rounded-full border-2 border-white"></span>
                )}
              </Link>
            </nav>
          )}

          {/* 右側のアクション */}
          <div className="flex items-center gap-4">
            {/* 通知ベル */}
            {showAuthenticatedUI && (
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

      {/* モバイルメニュー */}
      {showAuthenticatedUI && isMobileMenuOpen && (
        <>
          {/* オーバーレイ */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={handleMobileMenuClose}
          />

          {/* メニューコンテンツ */}
          <div
            ref={mobileMenuRef}
            className="fixed top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50 md:hidden"
          >
            <nav className="flex flex-col py-2">
              <Link
                href="/feed"
                onClick={handleMobileMenuClose}
                className="px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 font-medium transition-colors"
              >
                {t('feed')}
              </Link>
              <Link
                href="/search"
                onClick={handleMobileMenuClose}
                className="px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 font-medium transition-colors"
              >
                {t('userSearch')}
              </Link>

              <Link
                href="/messages"
                onClick={handleMobileMenuClose}
                className="px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 font-medium transition-colors relative"
              >
                {t('messages')}
                {unreadMessageCount > 0 && (
                  <span className="absolute top-2 right-4 h-2 w-2 bg-red-600 rounded-full border-2 border-white"></span>
                )}
              </Link>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
