'use client';

import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export default function CallbackPage() {
  const { isLoading, isAuthenticated } = useAuth0();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      window.location.href = '/';
    }
  }, [isLoading, isAuthenticated]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">リダイレクト中...</p>
    </div>
  );
}
