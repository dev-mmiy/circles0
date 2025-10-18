'use client';

import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Link from 'next/link';
import { useApiService } from '../contexts/ApiContext';

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
  const apiService = useApiService();
  const { isAuthenticated, loginWithRedirect, logout, user, isLoading } = useAuth0();
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
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">Hello World!</h1>
        <p className="text-center text-gray-600 mb-8">Disease Community Platform</p>

        {loading && (
          <div className="text-center">
            <p className="text-blue-600">Loading...</p>
          </div>
        )}

        {error && (
          <div className="text-center">
            <p className="text-red-600">Error: {error}</p>
            <p className="text-sm text-gray-500 mt-2">
              Make sure the backend is running on {apiService.getBaseUrl()}
            </p>
            <div className="mt-4 p-4 bg-yellow-100 rounded">
              <p className="text-sm text-gray-700">
                <strong>Debug Info:</strong>
              </p>
              <p className="text-xs text-gray-600">API URL: {apiService.getBaseUrl()}</p>
              <p className="text-xs text-gray-600">
                Environment: {process.env.NODE_ENV || 'unknown'}
              </p>
              <p className="text-xs text-gray-600">Build Time: {new Date().toISOString()}</p>
            </div>
          </div>
        )}

        {apiData && (
          <div className="bg-gray-100 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">API Response:</h2>
            <div className="space-y-2">
              <p>
                <strong>Message:</strong> {apiData.message}
              </p>
              <p>
                <strong>Environment:</strong> {apiData.environment}
              </p>
              <p>
                <strong>Version:</strong> {apiData.version}
              </p>
              {apiData.market && (
                <p>
                  <strong>Market:</strong> {apiData.market}
                </p>
              )}
              {apiData.timezone && (
                <p>
                  <strong>Timezone:</strong> {apiData.timezone}
                </p>
              )}
              {apiData.currency && (
                <p>
                  <strong>Currency:</strong> {apiData.currency}
                </p>
              )}
              {apiData.timestamp && (
                <p>
                  <strong>Timestamp:</strong> {new Date(apiData.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div className="mt-8 space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Get Started</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* Auth buttons */}
              {!isAuthenticated ? (
                <button
                  onClick={() => loginWithRedirect()}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Login
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <span className="text-gray-700">{user?.name || user?.email}</span>
                  <button
                    onClick={() =>
                      logout({
                        logoutParams: { returnTo: isClient ? window.location.origin : '/' },
                      })
                    }
                    className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Logout
                  </button>
                </div>
              )}
              <Link
                href="/register"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Create Account
              </Link>
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
                    API Documentation
                  </Link>
                )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
