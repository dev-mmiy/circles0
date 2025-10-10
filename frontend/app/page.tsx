'use client';

import { useState, useEffect } from 'react';

interface ApiResponse {
  message: string;
  environment: string;
  version: string;
}

export default function Home() {
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiData = async () => {
      try {
        // 環境変数を取得
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        console.log('API URL:', apiUrl);
        console.log('Environment variables:', process.env);
        console.log('NODE_ENV:', process.env.NODE_ENV);
        const response = await fetch(`${apiUrl}/`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setApiData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchApiData();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">Hello World!</h1>
        <p className="text-center text-gray-600 mb-8">
          Disease Community Platform
        </p>

        {loading && (
          <div className="text-center">
            <p className="text-blue-600">Loading API data...</p>
          </div>
        )}

        {error && (
          <div className="text-center">
            <p className="text-red-600">Error: {error}</p>
            <p className="text-sm text-gray-500 mt-2">
              Make sure the backend is running on{' '}
              {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
            </p>
            <div className="mt-4 p-4 bg-yellow-100 rounded">
              <p className="text-sm text-gray-700">
                <strong>Debug Info:</strong>
              </p>
              <p className="text-xs text-gray-600">
                API URL:{' '}
                {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
              </p>
              <p className="text-xs text-gray-600">
                Environment: {process.env.NODE_ENV || 'unknown'}
              </p>
              <p className="text-xs text-gray-600">
                Build Time: {new Date().toISOString()}
              </p>
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
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
