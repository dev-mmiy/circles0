'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useState } from 'react';

export default function AuthButton() {
  const { loginWithRedirect, logout, user, isAuthenticated, isLoading, error } = useAuth0();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // デバッグ用ログ
  console.log('AuthButton state:', {
    isLoading,
    isAuthenticated,
    user,
    error,
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

  const handleLogin = () => {
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

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  if (error) {
    console.error('Auth0 error in AuthButton:', error);
    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="text-red-600 text-sm">Auth Error: {error.message}</div>
        <div className="text-xs text-gray-500">Error type: {error.name}</div>
        <button
          onClick={() => {
            // Clear Auth0 cache and reload
            localStorage.removeItem('@@auth0spajs@@::' + process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID);
            window.location.reload();
          }}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          Clear Cache & Retry
        </button>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          {user.picture && (
            <img
              src={user.picture}
              alt={user.name || 'User'}
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

  return (
    <button
      onClick={handleLogin}
      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
    >
      Login
    </button>
  );
}
