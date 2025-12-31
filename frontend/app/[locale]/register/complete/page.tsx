'use client';

import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { createOrGetUser } from '@/lib/api/users';
import { debugLog } from '@/lib/utils/debug';

export default function RegisterCompletePage() {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();
  const t = useTranslations('registerComplete');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const completeRegistration = async () => {
      if (isLoading) {
        return;
      }

      if (!isAuthenticated || !user) {
        // Not authenticated, redirect to signup
        router.push('/signup');
        return;
      }

      try {
        // Get registration data from sessionStorage
        const registrationDataStr = sessionStorage.getItem('registration_data');
        if (!registrationDataStr) {
          // No registration data, redirect to signup
          router.push('/signup');
          return;
        }

        const registrationData = JSON.parse(registrationDataStr);

        // Verify email matches
        if (registrationData.email.toLowerCase() !== (user.email || '').toLowerCase()) {
          setError(t('errors.emailMismatch'));
          setStatus('error');
          return;
        }

        // Create user profile with registration data
        await createOrGetUser({
          auth0_id: user.sub || '',
          email: user.email || '',
          email_verified: user.email_verified || false,
          nickname: registrationData.nickname,
          username: registrationData.username,
          avatar_url: user.picture,
        });

        // Clear registration data
        sessionStorage.removeItem('registration_data');

        setStatus('success');

        // Redirect to profile page after a short delay
        setTimeout(() => {
          router.push('/profile/me');
        }, 2000);
      } catch (err) {
        debugLog.error('Failed to complete registration:', err);
        setError(err instanceof Error ? err.message : t('errors.registrationFailed'));
        setStatus('error');
      }
    };

    completeRegistration();
  }, [isAuthenticated, user, isLoading, router, t]);

  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('errorTitle')}</h1>
              <p className="text-gray-600 mb-6">{error || t('errors.unknown')}</p>
              <button
                onClick={() => router.push('/signup')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('retryButton')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('successTitle')}</h1>
            <p className="text-gray-600 mb-6">{t('successMessage')}</p>
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">{t('redirecting')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
