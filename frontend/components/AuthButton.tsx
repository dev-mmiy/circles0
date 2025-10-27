'use client';

import { useAuth0 } from '@auth0/auth0-react';
import React, { useState } from 'react';
import Image from 'next/image';

export default function AuthButton() {
  const { loginWithRedirect, logout, user, isAuthenticated, isLoading, error } = useAuth0();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated' | 'error'>('loading');

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

  // 認証状態の判定
  React.useEffect(() => {
    if (isLoading) {
      setAuthState('loading');
    } else if (isAuthenticated && user) {
      setAuthState('authenticated');
    } else if (error && !isAuthenticated) {
      setAuthState('error');
    } else {
      setAuthState('unauthenticated');
    }
  }, [isLoading, isAuthenticated, user, error]);

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
    return (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          {user.picture && (
            <Image
              src={user.picture}
              alt={user.name || 'User'}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="text-sm text-gray-700">
            {user.name || user.email}
          </span>
        </div>
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
    // "Invalid state"エラーは認証フロー中に発生する一時的なエラーなので無視
    if (error?.message && error.message.includes('Invalid state')) {
      console.log('Auth0 temporary state error (ignoring):', error.message);
      return null; // エラーを表示せずに何も表示しない
    }
    
    console.error('Auth0 error in AuthButton:', error);
    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="text-red-600 text-sm">Auth Error: {error?.message || 'Unknown error'}</div>
        <div className="text-xs text-gray-500">Error type: {error?.name || 'Unknown'}</div>
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

  return (
    <button
      onClick={handleLogin}
      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
    >
      Login
    </button>
  );
}
