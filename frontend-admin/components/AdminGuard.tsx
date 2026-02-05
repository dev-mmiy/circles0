'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { adminApi } from '@/lib/api/admin';
import { setAuthToken } from '@/lib/api/client';

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, getAccessTokenSilently, loginWithRedirect } = useAuth0();
  const router = useRouter();
  const loggedAccess = useRef(false);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || isLoading) {
      setReady(false);
      return;
    }

    (async () => {
      try {
        setAuthError(null);
        const token = await getAccessTokenSilently();
        setAuthToken(token);
        if (!loggedAccess.current) {
          await adminApi.logAccess();
          loggedAccess.current = true;
        }
        setReady(true);
      } catch (e: unknown) {
        const err = e as { error?: string; message?: string; response?: { status?: number } };
        if (err?.error === 'login_required' || err?.message?.includes('consent')) return;
        if (err?.response?.status === 403) {
          router.replace('/forbidden');
          return;
        }
        setAuthError('トークン取得に失敗しました。再ログインしてください。');
      }
    })();
  }, [isAuthenticated, isLoading, getAccessTokenSilently, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <span className="text-gray-500">読み込み中...</span>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
        <p className="text-red-600">{authError}</p>
        <button
          type="button"
          onClick={() => loginWithRedirect()}
          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
        >
          再ログイン
        </button>
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <span className="text-gray-500">認証中...</span>
      </div>
    );
  }

  return <>{children}</>;
}
