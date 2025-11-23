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
    
    debugLog.log('[apiClient] Request interceptor called:', {
      requestId,
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      hasAuth: !!config.headers?.Authorization,
      timeout: config.timeout,
      timestamp: new Date().toISOString(),
    });
    
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
    const requestId = (response.config as any).__requestId;
    const requestStartTime = (response.config as any).__requestStartTime;
    const elapsed = requestStartTime ? Date.now() - requestStartTime : undefined;
    
    debugLog.log('[apiClient] Response received:', {
      requestId,
      status: response.status,
      url: response.config.url,
      elapsed: elapsed ? `${elapsed}ms` : undefined,
      timestamp: new Date().toISOString(),
    });
    return response;
  },
  async (error: AxiosError) => {
    const requestId = error.config ? (error.config as any).__requestId : undefined;
    debugLog.log('[apiClient] Response interceptor error handler called', {
      requestId,
      hasResponse: !!error.response,
      hasRequest: !!error.request,
      message: error.message,
      code: error.code,
      url: error.config?.url,
      timestamp: new Date().toISOString(),
    });
    
    // Log more details about the request if available (debug only)
    if (error.request && process.env.NODE_ENV === 'development') {
      const xhr = error.request as XMLHttpRequest;
      debugLog.log('[apiClient] Request details:', {
        readyState: xhr?.readyState,
        status: xhr?.status,
        statusText: xhr?.statusText,
        responseText: xhr?.responseText?.substring(0, 100),
        responseURL: xhr?.responseURL,
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
      
      debugLog.error('[apiClient] Network Error:', {
        requestId,
        message: error.message,
        code: error.code,
        url: error.config?.url,
        fullURL: error.config ? `${error.config.baseURL}${error.config.url}` : undefined,
        method: error.config?.method,
        timeout: error.config?.timeout,
        isTimeout,
        elapsed: elapsed ? `${elapsed}ms` : undefined,
        timestamp: new Date().toISOString(),
        ...(isTimeout && {
          timeoutDetails: {
            configuredTimeout: error.config?.timeout,
            actualElapsed: elapsed,
            timeoutExceeded: elapsed && error.config?.timeout ? elapsed > error.config.timeout : undefined,
          },
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
