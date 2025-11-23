/**
 * Combined hook for authentication and async loading
 * Combines useAuthToken and useAsyncLoader for common use cases
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { setAuthToken, apiClient } from '@/lib/api/client';
import { extractErrorInfo } from '@/lib/utils/errorHandler';
import { getAccessToken as getAccessTokenFromManager, clearToken } from '@/lib/utils/tokenManager';

interface UseAuthWithLoaderOptions {
  /**
   * Whether to require authentication
   * @default true
   */
  requireAuth?: boolean;
  /**
   * Timeout for auth loading in milliseconds
   * @default 5000
   */
  authTimeout?: number;
}

interface UseAuthWithLoaderReturn {
  /**
   * Whether data is currently loading
   */
  isLoading: boolean;
  /**
   * Whether more data is being loaded (for pagination)
   */
  isLoadingMore: boolean;
  /**
   * Error object if loading failed
   */
  error: any;
  /**
   * Set error state
   */
  setError: (error: any) => void;
  /**
   * Whether component is mounted
   */
  isMountedRef: React.MutableRefObject<boolean>;
  /**
   * Get and set authentication token
   */
  getAndSetToken: () => Promise<void>;
  /**
   * Execute async function with loading state management
   */
  executeWithLoading: <T>(
    fn: () => Promise<T>,
    options?: {
      reset?: boolean;
      skipLoadingState?: boolean;
    }
  ) => Promise<T | null>;
  /**
   * Clear error state
   */
  clearError: () => void;
}

/**
 * Hook that combines authentication token management and async loading
 * Provides a unified interface for common loading patterns
 */
export function useAuthWithLoader(
  options: UseAuthWithLoaderOptions = {}
): UseAuthWithLoaderReturn {
  const { requireAuth = true, authTimeout = 5000 } = options;
  const { isAuthenticated, isLoading: authLoading, getAccessTokenSilently } =
    useAuth0();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<any>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const getAndSetToken = useCallback(async (): Promise<void> => {
    console.log('[useAuthWithLoader] getAndSetToken called', { isAuthenticated, isMounted: isMountedRef.current });
    if (!isAuthenticated) {
      clearToken();
      setAuthToken(null);
      return;
    }

    try {
      console.log('[useAuthWithLoader] Calling getAccessTokenFromManager...');
      const startTime = Date.now();
      // Use centralized token manager to prevent duplicate requests
      const token = await getAccessTokenFromManager(getAccessTokenSilently);
      const elapsed = Date.now() - startTime;
      console.log('[useAuthWithLoader] Token retrieved successfully', { elapsed, hasToken: !!token });
      if (isMountedRef.current) {
        setAuthToken(token);
        console.log('[useAuthWithLoader] Token set in API client');
      }
    } catch (tokenError) {
      console.warn('[useAuthWithLoader] Failed to get access token:', tokenError);
      if (isMountedRef.current) {
        clearToken();
        setAuthToken(null);
      }
      // Don't throw - allow API calls to proceed without token if needed
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  const executeWithLoading = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      options: { reset?: boolean; skipLoadingState?: boolean } = {}
    ): Promise<T | null> => {
      const { reset = true, skipLoadingState = false } = options;

      // Check mount state before starting
      if (!isMountedRef.current) return null;

      // Set loading states
      if (!skipLoadingState) {
        setIsLoadingMore(!reset);
        if (reset) {
          setIsLoading(true);
        }
      }

      try {
        // Get token if authenticated (with timeout handling)
        // Only get token if not already set to avoid redundant calls
        if (isAuthenticated) {
          const currentToken = apiClient.defaults.headers.common['Authorization'];
          console.log('[useAuthWithLoader] Checking token', { hasToken: !!currentToken, tokenPrefix: currentToken?.substring(0, 20) });
          if (!currentToken || !currentToken.startsWith('Bearer ')) {
            try {
              console.log('[useAuthWithLoader] Token not set, getting token...', { timestamp: new Date().toISOString() });
              const tokenStartTime = Date.now();
              await getAndSetToken();
              const tokenElapsed = Date.now() - tokenStartTime;
              console.log('[useAuthWithLoader] Token retrieval completed', { elapsed: tokenElapsed, timestamp: new Date().toISOString() });
            } catch (tokenError) {
              console.error('[useAuthWithLoader] Token retrieval failed, continuing without token:', tokenError);
              // Continue execution even if token retrieval fails
              // The API call will handle authentication errors
              // Don't block the request - proceed without token
            }
          } else {
            console.log('[useAuthWithLoader] Token already set, skipping token retrieval');
          }
          if (!isMountedRef.current) {
            console.log('[useAuthWithLoader] Component unmounted after token check, returning null');
            if (!skipLoadingState) {
              setIsLoading(false);
              setIsLoadingMore(false);
            }
            return null;
          }
        } else {
          setAuthToken(null);
        }

        // Execute the function
        console.log('[useAuthWithLoader] Executing function', { timestamp: new Date().toISOString() });
        const fnStartTime = Date.now();
        const result = await fn();
        const fnElapsed = Date.now() - fnStartTime;
        console.log('[useAuthWithLoader] Function executed', { elapsed: fnElapsed, hasResult: !!result });
        console.log('[useAuthWithLoader] Function executed successfully', { hasResult: !!result, resultType: typeof result });

        // Check mount state after execution
        if (!isMountedRef.current) {
          console.log('[useAuthWithLoader] Not mounted after execution, clearing loading');
          if (!skipLoadingState) {
            setIsLoading(false);
            setIsLoadingMore(false);
          }
          return null;
        }

        setError(null);
        return result;
      } catch (err: any) {
        console.error('[useAuthWithLoader] Failed to execute function:', {
          message: err.message,
          code: err.code,
          response: err.response?.data,
          status: err.response?.status,
          isTimeout: err.code === 'ECONNABORTED' || err.message?.includes('timeout'),
          stack: err.stack,
        });
        if (isMountedRef.current) {
          const errorInfo = extractErrorInfo(err);
          setError(errorInfo);
        }
        return null;
      } finally {
        // Always clear loading states if mounted
        if (isMountedRef.current && !skipLoadingState) {
          console.log('[useAuthWithLoader] Clearing loading states');
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [isAuthenticated, getAndSetToken]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Handle auth timeout
  useEffect(() => {
    if (!requireAuth) return;

    let timeoutId: NodeJS.Timeout | null = null;

    if (authLoading && !isAuthenticated) {
      timeoutId = setTimeout(() => {
        if (isMountedRef.current && !isAuthenticated) {
          console.warn('Auth loading timeout');
          setIsLoading(false);
        }
      }, authTimeout);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [authLoading, isAuthenticated, requireAuth, authTimeout]);

  return {
    isLoading,
    isLoadingMore,
    error,
    setError,
    isMountedRef,
    getAndSetToken,
    executeWithLoading,
    clearError,
  };
}

