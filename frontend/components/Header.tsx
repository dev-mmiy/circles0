'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { Menu, X, Newspaper, Search, MessageCircle } from 'lucide-react';
import AuthButton from './AuthButton';
import NotificationBell from './notifications/NotificationBell';
import NotificationDropdown from './notifications/NotificationDropdown';
import { getTotalUnreadCount } from '@/lib/api/messages';
import { setAuthToken } from '@/lib/api/client';
import { useMessageStream, MessageEvent } from '@/lib/hooks/useMessageStream';
import { debugLog } from '@/lib/utils/debug';

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

  // デバッグログ（verbose modeのみ）
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('debugHeader') === 'true') {
      debugLog.log('[Header] Auth state:', { authLoading, isAuthenticated, hasUser: !!user, showAuthenticatedUI });
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
      debugLog.error('Failed to load unread message count:', error);
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
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* 左側: ハンバーガーメニュー + ロゴ */}
          <div className="flex items-center gap-4">
            {/* ハンバーガーメニューボタン（モバイルのみ） */}
            {showAuthenticatedUI && (
              <button
                onClick={handleMobileMenuToggle}
                className="md:hidden p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
            <Link href="/" className="text-xl font-bold text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300">
              Lifry
            </Link>
          </div>

          {/* Navigation (デスクトップ) */}
          {showAuthenticatedUI && (
            <nav className="hidden md:flex items-center space-x-4">
              <Link
                href="/feed"
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                  pathname.startsWith('/feed')
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                aria-label={t('feed')}
                title={t('feed')}
              >
                <Newspaper className="w-5 h-5" />
                <span className="text-xs font-medium">{t('feed')}</span>
              </Link>
              <Link
                href="/search"
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                  pathname.startsWith('/search')
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                aria-label={t('userSearch')}
                title={t('userSearch')}
              >
                <Search className="w-5 h-5" />
                <span className="text-xs font-medium">{t('userSearch')}</span>
              </Link>

              <Link
                href="/daily"
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                  pathname.startsWith('/daily')
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                aria-label={t('daily')}
                title={t('daily')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-xs font-medium">{t('daily')}</span>
              </Link>

              <Link
                href="/messages"
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors relative ${
                  pathname.startsWith('/messages')
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                aria-label={t('messages')}
                title={t('messages')}
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-xs font-medium">{t('messages')}</span>
                {unreadMessageCount > 0 && (
                  <span className="absolute top-0 right-0 h-2 w-2 bg-red-600 rounded-full border-2 border-white dark:border-gray-800"></span>
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

            {/* Sign Up リンク（ログインしていない時のみ表示） */}
            {!showAuthenticatedUI && !authLoading && (
              <Link
                href="/signup"
                className="px-4 py-2 text-blue-600 dark:text-blue-400 font-medium rounded-md hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                {t('signUp')}
              </Link>
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
            className="fixed top-16 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg z-50 md:hidden"
          >
            <nav className="flex flex-col py-2">
              <Link
                href="/feed"
                onClick={handleMobileMenuClose}
                className="px-4 py-3 flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors"
              >
                <Newspaper className="w-5 h-5" />
                {t('feed')}
              </Link>
              <Link
                href="/search"
                onClick={handleMobileMenuClose}
                className="px-4 py-3 flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors"
              >
                <Search className="w-5 h-5" />
                {t('userSearch')}
              </Link>
              <Link
                href="/daily"
                onClick={handleMobileMenuClose}
                className="px-4 py-3 flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {t('daily')}
              </Link>

              <Link
                href="/messages"
                onClick={handleMobileMenuClose}
                className="px-4 py-3 flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors relative"
              >
                <MessageCircle className="w-5 h-5" />
                {t('messages')}
                {unreadMessageCount > 0 && (
                  <span className="absolute top-2 right-4 h-2 w-2 bg-red-600 rounded-full border-2 border-white dark:border-gray-800"></span>
                )}
              </Link>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
