'use client';

import { useAuth0 } from '@auth0/auth0-react';
import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { createOrGetUser } from '@/lib/api/users';
import { useUser } from '@/contexts/UserContext';

export default function AuthButton() {
  const { loginWithRedirect, logout, user, isAuthenticated, isLoading, error } = useAuth0();
  const { user: currentUser } = useUser();
  const t = useTranslations('auth');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authState, setAuthState] = useState<
    'loading' | 'authenticated' | 'unauthenticated' | 'error'
  >('loading');
  const [userCreated, setUserCreated] = useState(false);

  // Dropdown state (Must be at top level)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // ユーザー作成（初回ログイン時）
  React.useEffect(() => {
    const createUser = async () => {
      if (!isAuthenticated || !user || userCreated) {
        return;
      }

      try {
        await createOrGetUser({
          auth0_id: user.sub || '',
          email: user.email || '',
          email_verified: user.email_verified || false,
          nickname: user.name || user.email || 'User',
          avatar_url: user.picture,
        });

        setUserCreated(true);
        // User profile created/retrieved successfully
      } catch (err) {
        console.error('Failed to create user profile:', err);
      }
    };

    if (isAuthenticated && user && !userCreated) {
      createUser();
    }
  }, [isAuthenticated, user, userCreated]);

  // 認証状態の判定（Hooksは常に最初に呼び出す）
  React.useEffect(() => {
    // 認証成功時は最優先
    if (isAuthenticated && user) {
      setAuthState('authenticated');
    } else if (isLoading) {
      setAuthState('loading');
    } else if (error && !isAuthenticated) {
      // エラーが認証フロー中（isLoading中）の場合は無視
      if (error.message && error.message.includes('Invalid state')) {
        // Auth0 temporary state error (ignoring) - this is normal during auth flow
        setAuthState('loading'); // 一時的なエラーはローディング状態として扱う
      } else {
        setAuthState('error');
      }
    } else {
      setAuthState('unauthenticated');
    }
  }, [isLoading, isAuthenticated, user, error]);

  // デバッグ用ログ（開発環境のみ）
  if (process.env.NODE_ENV === 'development') {
    // Only log in development mode
    if (error) {
      console.log('[AuthButton] Error state:', {
        message: error.message,
        name: error.name,
        authState,
      });
    }
  }

  // 関数の定義
  const handleLogin = () => {
    // Clear any existing Auth0 cache before login to prevent state issues
    localStorage.removeItem(`@@auth0spajs@@::${process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID}`);

    loginWithRedirect({
      appState: {
        returnTo: window.location.pathname,
      },
    });
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout({
        logoutParams: {
          returnTo: window.location.origin,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Auth0Providerが正しく初期化されていない場合のフォールバック
  if (typeof loginWithRedirect !== 'function') {
    console.error('Auth0Provider not properly initialized');
    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="text-red-600 text-sm">{t('notInitialized')}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  // 状態ベースの表示ロジック
  if (authState === 'loading') {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-gray-600 dark:text-gray-400">{t('loading')}</span>
      </div>
    );
  }

  if (authState === 'authenticated' && user) {
    // Display nickname from UserContext if available, fallback to Auth0 user data
    const displayName = currentUser?.nickname || user.name || user.email || 'User';
    const avatarUrl = currentUser?.avatar_url || user.picture;

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-2 hover:opacity-80 transition-opacity focus:outline-none"
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
        >
          {avatarUrl && (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
            {displayName}
          </span>
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700 ring-1 ring-black dark:ring-gray-700 ring-opacity-5">
            <Link
              href="/profile/me"
              className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
              onClick={() => setIsDropdownOpen(false)}
            >
              {t('profile') || 'Profile'} {/* Fallback string if key missing */}
            </Link>
            <button
              onClick={() => {
                setIsDropdownOpen(false);
                handleLogout();
              }}
              disabled={isLoggingOut}
              className="block px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left disabled:opacity-50"
            >
              {isLoggingOut ? t('loggingOut') : t('logout')}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (authState === 'error') {
    // 認証フロー中や一時的なエラーは表示しない
    if (isLoading || (error?.message && error.message.includes('Invalid state'))) {
      // Auth0 temporary error during authentication flow (ignoring)
      return (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">{t('loading')}</span>
        </div>
      );
    }

    console.error('Auth0 error in AuthButton:', error);
    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="text-red-600 dark:text-red-400 text-sm font-bold">{t('loginError')}</div>
        <div className="text-red-600 dark:text-red-400 text-sm">
          {t('authError')}: {error?.message || t('unknownError')}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {t('errorType')}: {error?.name || t('unknown')}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {t('timestamp')}: {new Date().toISOString()}
        </div>
        <div className="text-xs text-blue-500 dark:text-blue-400">{t('autoClearingCache')}</div>
        <button
          onClick={() => {
            // Clear all Auth0 related cache and reload
            const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
            if (clientId) {
              localStorage.removeItem(`@@auth0spajs@@::${clientId}`);
            }
            // Clear all Auth0 related keys
            Object.keys(localStorage).forEach(key => {
              if (key.includes('auth0') || key.includes('@@auth0spajs@@')) {
                localStorage.removeItem(key);
              }
            });
            window.location.reload();
          }}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          {t('clearCacheRetry')}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
    >
      {t('login')}
    </button>
  );
}
