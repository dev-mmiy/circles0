'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useApiService } from '@/contexts/ApiContext';
import AuthButton from '@/components/AuthButton';
import Header from '@/components/Header';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface ApiResponse {
  message: string;
  environment: string;
  version: string;
  market?: string;
  timestamp?: string;
  timezone?: string;
  currency?: string;
}

export default function Home() {
  const t = useTranslations('homePage');
  const apiService = useApiService();
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const fetchApiData = async () => {
      try {
        // Only fetch on client side
        if (typeof window === 'undefined') {
          return;
        }

        const apiUrl = apiService.getBaseUrl();
        console.log('API URL:', apiUrl);

        const response = await fetch(`${apiUrl}/?market=ja-jp`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setApiData(data);
      } catch (err) {
        console.error('API fetch error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchApiData();
  }, [apiService]);

  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
          <h1 className="text-4xl font-bold text-center mb-8">{t('title')}</h1>
          <p className="text-center text-gray-600 mb-8">{t('subtitle')}</p>

        {loading && (
          <div className="text-center">
            <p className="text-blue-600">{t('loading')}</p>
          </div>
        )}

        {error && (
          <div className="text-center">
            <p className="text-red-600">{t('error', { error })}</p>
            <p className="text-sm text-gray-500 mt-2">
              {t('errorMessage')}
            </p>
            <div className="mt-4 p-4 bg-yellow-100 rounded">
              <p className="text-sm text-gray-700">
                <strong>{t('debugInfo')}</strong>
              </p>
              <p className="text-xs text-gray-600">
                {t('environment')} {process.env.NODE_ENV || 'unknown'}
              </p>
              <p className="text-xs text-gray-600">{t('buildTime')} {new Date().toISOString()}</p>
            </div>
          </div>
        )}

        {apiData && (
          <div className="bg-gray-100 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">{t('apiResponse')}</h2>
            <div className="space-y-2">
              <p>
                <strong>{t('message')}</strong> {apiData.message}
              </p>
              <p>
                <strong>{t('environmentLabel')}</strong> {apiData.environment}
              </p>
              <p>
                <strong>{t('version')}</strong> {apiData.version}
              </p>
              {apiData.market && (
                <p>
                  <strong>{t('market')}</strong> {apiData.market}
                </p>
              )}
              {apiData.timestamp && (
                <p>
                  <strong>{t('timestamp')}</strong> {apiData.timestamp}
                </p>
              )}
              {apiData.timezone && (
                <p>
                  <strong>{t('timezone')}</strong> {apiData.timezone}
                </p>
              )}
              {apiData.currency && (
                <p>
                  <strong>{t('currency')}</strong> {apiData.currency}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('getStarted')}</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <AuthButton />
              {/* Auth0 handles account creation via AuthButton */}
              {/* Only show API Documentation link in development/local environment */}
              {isClient &&
                (window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1' ||
                  window.location.hostname.includes('dev')) && (
                  <Link
                    href={`${apiService.getBaseUrl()}/docs`}
                    className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    target="_blank"
                  >
                    {t('apiDocumentation')}
                  </Link>
                )}
            </div>
          </div>
        </div>
      </div>
      </main>
    </>
  );
}
