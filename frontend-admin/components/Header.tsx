'use client';

import { useAuth0 } from '@auth0/auth0-react';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth0();

  return (
    <header className="h-14 border-b border-gray-200 bg-white px-4 flex items-center justify-between">
      <h1 className="text-lg font-semibold text-gray-800">管理画面 (work.lifry.com)</h1>
      {isAuthenticated && user && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user.email || user.name}</span>
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ログアウト
          </button>
        </div>
      )}
    </header>
  );
}
