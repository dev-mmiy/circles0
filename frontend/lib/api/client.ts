/**
 * API Client Configuration
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { extractErrorInfo, requiresAuthRedirect, ErrorType } from '../utils/errorHandler';
import { addLocalePrefix } from '../utils/locale';

// API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/**
 * Axios instance for API calls
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
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
      
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      // Request made but no response received (network error)
      console.error('Network Error:', error.message);
    } else {
      // Error in request setup
      console.error('Request Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
