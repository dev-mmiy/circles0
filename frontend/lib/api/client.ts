/**
 * API Client Configuration
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { extractErrorInfo, requiresAuthRedirect, ErrorType } from '../utils/errorHandler';
import { addLocalePrefix } from '../utils/locale';
import { getApiBaseUrl } from '../config';
import { debugLog } from '../utils/debug';

// API base URL - use getApiBaseUrl() for consistency with other API clients
// Note: This does NOT include /api/v1 - each endpoint should include it in the path
const API_BASE_URL = getApiBaseUrl();

/**
 * Axios instance for API calls
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000, // 20秒のタイムアウト (increased for initial load stability)
  // Add adapter to handle requests in WSL2 environment
  adapter: typeof window !== 'undefined' ? undefined : undefined, // Use default adapter
  // Ensure requests are not blocked
  validateStatus: (status) => status < 500, // Don't throw on 4xx errors
});

/**
 * Set authorization token for API requests
 */
export function setAuthToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
}

/**
 * Request interceptor to add auth token
 */
apiClient.interceptors.request.use(
  (config) => {
    // Token will be set via setAuthToken function
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const requestStartTime = Date.now();
    (config as any).__requestId = requestId;
    (config as any).__requestStartTime = requestStartTime;
    
    // Only log requests in verbose mode (set via localStorage.debugApiClient = 'true')
    if (typeof window !== 'undefined' && localStorage.getItem('debugApiClient') === 'true') {
      debugLog.log('[apiClient] Request:', {
        method: config.method,
        url: config.url,
      });
    }
    
    return config;
  },
  (error) => {
    debugLog.error('[apiClient] Request interceptor error:', error, {
      timestamp: new Date().toISOString(),
    });
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling
 */
apiClient.interceptors.response.use(
  (response) => {
    const requestStartTime = (response.config as any).__requestStartTime;
    const elapsed = requestStartTime ? Date.now() - requestStartTime : undefined;
    
    // Only log slow requests (>1000ms) or when verbose mode is enabled
    const isVerbose = typeof window !== 'undefined' && localStorage.getItem('debugApiClient') === 'true';
    const isSlow = elapsed && elapsed > 1000;
    
    if (isVerbose || isSlow) {
      const url = response.config.url || '';
      debugLog.log('[apiClient] Response:', {
        status: response.status,
        url,
        elapsed: elapsed ? `${elapsed}ms` : undefined,
        ...(isSlow && { warning: 'Slow request detected' }),
      });
    }
    
    return response;
  },
  async (error: AxiosError) => {
    // Only log verbose error details in verbose mode
    const isVerbose = typeof window !== 'undefined' && localStorage.getItem('debugApiClient') === 'true';
    
    if (isVerbose) {
      debugLog.log('[apiClient] Error handler called', {
        hasResponse: !!error.response,
        hasRequest: !!error.request,
        message: error.message,
        url: error.config?.url,
      });
    }

    if (error.response) {
      // Server responded with error status
      const errorInfo = extractErrorInfo(error);
      
      // Handle 401/403 errors - redirect to login
      if (requiresAuthRedirect(errorInfo)) {
        // Only redirect if we're in the browser
        if (typeof window !== 'undefined') {
          // Clear any stored auth tokens
          setAuthToken(null);
          
          // Store the current URL to redirect back after login
          const currentPath = window.location.pathname;
          // Check if current path is not just a locale prefix (e.g., /ja or /en)
          const isLocaleOnly = /^\/[a-z]{2}\/?$/.test(currentPath);
          if (currentPath && !isLocaleOnly) {
            sessionStorage.setItem('redirectAfterLogin', currentPath);
          }
          
          // Redirect to home page (which will show login button)
          // In a real app, you might want to redirect to a dedicated login page
          // Add locale prefix to home URL
          const homeUrl = addLocalePrefix('/');
          if (!isLocaleOnly) {
            window.location.href = homeUrl;
          }
        }
      }
      
      debugLog.error('[apiClient] API Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url,
      });
    } else if (error.request) {
      // Request made but no response received (network error, timeout, etc.)
      const isTimeout = error.code === 'ECONNABORTED' || 
                       error.message?.includes('timeout') ||
                       error.message?.includes('exceeded');
      
      const requestStartTime = (error.config as any)?.__requestStartTime;
      const elapsed = requestStartTime ? Date.now() - requestStartTime : undefined;
      
      // Log network errors concisely
      debugLog.error('[apiClient] Network Error:', {
        message: error.message,
        url: error.config?.url,
        isTimeout,
        ...(isTimeout && elapsed && {
          elapsed: `${elapsed}ms`,
          timeout: error.config?.timeout,
        }),
      });
    } else {
      // Error in request setup
      debugLog.error('[apiClient] Request Error:', {
        message: error.message,
        url: error.config?.url,
      });
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
