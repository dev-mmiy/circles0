/**
 * Configuration utilities for the frontend
 */

/**
 * Get the API base URL based on the environment
 */
export function getApiBaseUrl(): string {
  // In browser environment, use the runtime API URL from ApiContext
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:8000'
      : `https://${
          process.env.NEXT_PUBLIC_API_URL ||
          'disease-community-api-508246122017.asia-northeast1.run.app'
        }`;
  }

  // In server-side rendering, use environment variable or default
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}
