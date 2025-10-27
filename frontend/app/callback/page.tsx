'use client';

import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useRouter } from 'next/navigation';

export default function CallbackPage() {
  const { handleRedirectCallback, isLoading, error } = useAuth0();
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await handleRedirectCallback();
        // Redirect to home page after successful authentication
        router.push('/');
      } catch (err) {
        // "Invalid state"エラーは認証フロー中に発生する一時的なエラーなので無視
        if (err instanceof Error && err.message.includes('Invalid state')) {
          console.log('Auth0 temporary state error (ignoring):', err.message);
          // エラーを無視してホームページにリダイレクト
          router.push('/');
          return;
        }
        
        console.error('Callback error:', err);
        // Redirect to home page even on error
        router.push('/');
      }
    };

    handleCallback();
  }, [handleRedirectCallback, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Completing login...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Login Error</h1>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
