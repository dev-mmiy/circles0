/**
 * API Client Configuration
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { extractErrorInfo, requiresAuthRedirect, ErrorType } from '../utils/errorHandler';
import { addLocalePrefix } from '../utils/locale';
import { getApiBaseUrl } from '../config';
import { debugLog } from '../utils/debug';

/**
 * Get API base URL dynamically at runtime
 * This ensures the correct URL is used in both SSR and client-side rendering
 */
function getApiBaseUrlDynamic(): string {
  return getApiBaseUrl();
}

/**
 * Retry configuration for timeout errors
 */
const RETRY_CONFIG = {
  maxRetries: 2, // Maximum number of retries for timeout errors
  retryDelay: 1000, // Initial delay in milliseconds (exponential backoff)
  retryableStatusCodes: [408, 429, 500, 502, 503, 504], // HTTP status codes to retry
};

/**
 * Check if an error should be retried
 */
function shouldRetry(error: AxiosError, retryCount: number): boolean {
  if (retryCount >= RETRY_CONFIG.maxRetries) {
    return false;
  }

  // Retry on timeout errors
  const isTimeout = error.code === 'ECONNABORTED' || 
                   error.message?.includes('timeout') ||
                   error.message?.includes('exceeded');
  
  if (isTimeout) {
    return true;
  }

  // Retry on specific HTTP status codes
  if (error.response && RETRY_CONFIG.retryableStatusCodes.includes(error.response.status)) {
    return true;
  }

  // Retry on network errors (no response)
  if (error.request && !error.response) {
    // Check for DNS resolution errors
    const isDnsError = error.code === 'ENOTFOUND' || 
                       error.code === 'EAI_AGAIN' ||
                       error.message?.includes('ERR_NAME_NOT_RESOLVED') ||
                       error.message?.includes('getaddrinfo') ||
                       error.message?.includes('ENOTFOUND');
    
    // Retry DNS errors (temporary DNS issues)
    if (isDnsError) {
      return true;
    }
    
    // Retry other network errors
    return true;
  }

  return false;
}

/**
 * Calculate retry delay with exponential backoff
 */
function getRetryDelay(retryCount: number): number {
  return RETRY_CONFIG.retryDelay * Math.pow(2, retryCount);
}

/**
 * Axios instance for API calls
 * baseURL is set dynamically in request interceptor to ensure correct URL at runtime
 */
export const apiClient = axios.create({
  baseURL: '', // Will be set dynamically in request interceptor
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30秒のタイムアウト (increased for Cloud Run cold starts and network latency)
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
 * Request interceptor to add auth token and set baseURL dynamically
 */
apiClient.interceptors.request.use(
  (config) => {
    // Set baseURL dynamically at request time to ensure correct URL
    if (!config.baseURL || config.baseURL === '') {
      config.baseURL = getApiBaseUrlDynamic();
    }
    
    // Initialize retry count if not set
    if (!(config as any).__retryCount) {
      (config as any).__retryCount = 0;
    }
    
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
        baseURL: config.baseURL,
        retryCount: (config as any).__retryCount,
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
      const status = error.response.status;
      const retryCount = (error.config as any)?.__retryCount || 0;
      
      // Check if we should retry this error
      if (shouldRetry(error, retryCount)) {
        const delay = getRetryDelay(retryCount);
        (error.config as any).__retryCount = retryCount + 1;
        
        debugLog.warn('[apiClient] API Error - Will retry:', {
          status,
          statusText: error.response.statusText,
          url: error.config?.url,
          retryCount: retryCount + 1,
          maxRetries: RETRY_CONFIG.maxRetries,
          retryDelay: delay,
        });
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the request
        return apiClient.request(error.config!);
      }
      
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
      
      // For 503 Service Unavailable (feature not available), log as warning instead of error
      // This is expected when features require database migrations
      const errorData = error.response.data as any;
      const isServiceUnavailable = status === 503;
      const isFeatureNotAvailable = isServiceUnavailable && 
        (errorData?.detail?.includes('not available') || 
         errorData?.detail?.includes('migrations'));
      
      if (isFeatureNotAvailable) {
        // Log as warning for expected service unavailable errors
        debugLog.warn('[apiClient] Feature Not Available:', {
          status,
          message: errorData?.detail || error.response.statusText,
          url: error.config?.url,
        });
      } else {
        // Log other errors normally
        debugLog.error('[apiClient] API Error:', {
          status,
          statusText: error.response.statusText,
          data: error.response.data,
          url: error.config?.url,
        });
      }
    } else if (error.request) {
      // Request made but no response received (network error, timeout, etc.)
      const isTimeout = error.code === 'ECONNABORTED' || 
                       error.message?.includes('timeout') ||
                       error.message?.includes('exceeded');
      
      const requestStartTime = (error.config as any)?.__requestStartTime;
      const elapsed = requestStartTime ? Date.now() - requestStartTime : undefined;
      const retryCount = (error.config as any)?.__retryCount || 0;
      
      // Log network errors concisely
      const fullUrl = error.config?.baseURL && error.config?.url
        ? `${error.config.baseURL}${error.config.url}`
        : error.config?.url || 'unknown';
      
      // Check if we should retry this request
      if (shouldRetry(error, retryCount)) {
        const delay = getRetryDelay(retryCount);
        (error.config as any).__retryCount = retryCount + 1;
        
        debugLog.warn('[apiClient] Network Error - Will retry:', {
          message: error.message,
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          fullURL: fullUrl,
          isTimeout,
          retryCount: retryCount + 1,
          maxRetries: RETRY_CONFIG.maxRetries,
          retryDelay: delay,
          ...(isTimeout && elapsed && {
            elapsed: `${elapsed}ms`,
            timeout: error.config?.timeout,
          }),
        });
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the request
        return apiClient.request(error.config!);
      }
      
      debugLog.error('[apiClient] Network Error:', {
        message: error.message,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: fullUrl,
        isTimeout,
        retryCount,
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
