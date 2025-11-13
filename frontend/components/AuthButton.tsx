'use client';

import { useAuth0 } from '@auth0/auth0-react';
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createOrGetUser } from '@/lib/api/users';
import { useUser } from '@/contexts/UserContext';

export default function AuthButton() {
  const { loginWithRedirect, logout, user, isAuthenticated, isLoading, error } = useAuth0();
  const { user: currentUser } = useUser();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authState, setAuthState] = useState<
    'loading' | 'authenticated' | 'unauthenticated' | 'error'
  >('loading');
  const [userCreated, setUserCreated] = useState(false);

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
        console.log('User profile created/retrieved successfully');
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
        console.log('Auth0 temporary state error (ignoring):', error.message);
        setAuthState('loading'); // 一時的なエラーはローディング状態として扱う
      } else {
        setAuthState('error');
      }
    } else {
      setAuthState('unauthenticated');
    }
  }, [isLoading, isAuthenticated, user, error]);

  // デバッグ用ログ
  console.log('AuthButton state:', {
    isLoading,
    isAuthenticated,
    user,
    error,
    authState,
    loginWithRedirect: typeof loginWithRedirect,
    logout: typeof logout,
  });

  // エラー状態の詳細ログ
  if (error) {
    console.log('Auth0 Error Details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
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
        <div className="text-red-600 text-sm">Auth0 not initialized</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // 状態ベースの表示ロジック
  if (authState === 'loading') {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  if (authState === 'authenticated' && user) {
    // Display nickname from UserContext if available, fallback to Auth0 user data
    const displayName = currentUser?.nickname || user.name || user.email || 'User';
    const avatarUrl = currentUser?.avatar_url || user.picture;

    return (
      <div className="flex items-center space-x-4">
        <Link
          href="/profile/me"
          className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
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
          <span className="text-sm text-gray-700">{displayName}</span>
        </Link>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    );
  }

  if (authState === 'error') {
    // 認証フロー中や一時的なエラーは表示しない
    if (isLoading || (error?.message && error.message.includes('Invalid state'))) {
      console.log('Auth0 temporary error during authentication flow (ignoring)');
      return (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Loading...</span>
        </div>
      );
    }

    console.error('Auth0 error in AuthButton:', error);
    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="text-red-600 text-sm font-bold">Login Error</div>
        <div className="text-red-600 text-sm">Auth Error: {error?.message || 'Unknown error'}</div>
        <div className="text-xs text-gray-500">Error type: {error?.name || 'Unknown'}</div>
        <div className="text-xs text-gray-500">Timestamp: {new Date().toISOString()}</div>
        <div className="text-xs text-blue-500">Auto-clearing cache and reloading...</div>
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
          Clear Cache & Retry
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
    >
      Login
    </button>
  );
}
