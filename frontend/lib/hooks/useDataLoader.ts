/**
 * Unified data loading hook for consistent loading patterns across all pages
 * Provides error handling, retry logic, caching, and optimistic UI support
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { extractErrorInfo, ErrorInfo, ErrorType } from '@/lib/utils/errorHandler';
import { getAccessToken as getAccessTokenFromManager } from '@/lib/utils/tokenManager';
import { setAuthToken, apiClient } from '@/lib/api/client';
import { debugLog } from '@/lib/utils/debug';

export interface UseDataLoaderOptions<T> {
  /**
   * Function to load data
   * @param skip Number of items to skip
   * @param limit Number of items to load
   * @returns Promise resolving to items and optional total count
   */
  loadFn: (skip: number, limit: number) => Promise<{ items: T[]; total?: number }>;
  /**
   * Page size for pagination
   * @default 20
   */
  pageSize?: number;
  /**
   * Automatically load data on mount
   * @default true
   */
  autoLoad?: boolean;
  /**
   * Require authentication
   * @default true
   */
  requireAuth?: boolean;
  /**
   * Retry configuration
   */
  retryConfig?: {
    /**
     * Maximum number of retries
     * @default 3
     */
    maxRetries?: number;
    /**
     * Delay between retries in milliseconds (exponential backoff)
     * @default 1000
     */
    retryDelay?: number;
    /**
     * Automatically retry on network errors
     * @default true
     */
    autoRetry?: boolean;
  };
  /**
   * Cache configuration
   */
  cacheConfig?: {
    /**
     * Enable caching
     * @default true
     */
    enabled?: boolean;
    /**
     * Cache TTL in milliseconds
     * @default 5 * 60 * 1000 (5 minutes)
     */
    ttl?: number;
  };
}

export interface UseDataLoaderReturn<T> {
  /**
   * Loaded items
   */
  items: T[];
  /**
   * Loading state for initial load
   */
  isLoading: boolean;
  /**
   * Loading state for loading more (pagination)
   */
  isLoadingMore: boolean;
  /**
   * Loading state for refresh (updating existing data)
   */
  isRefreshing: boolean;
  /**
   * Error information
   */
  error: ErrorInfo | null;
  /**
   * Whether there are more items to load
   */
  hasMore: boolean;
  /**
   * Total number of items (if available)
   */
  total: number | null;
  /**
   * Load data (reset or append)
   */
  load: (reset?: boolean) => Promise<void>;
  /**
   * Load more items (pagination)
   */
  loadMore: () => Promise<void>;
  /**
   * Refresh data (keep existing data visible)
   */
  refresh: () => Promise<void>;
  /**
   * Retry last failed operation
   */
  retry: () => Promise<void>;
  /**
   * Clear error state
   */
  clearError: () => void;
}

/**
 * Unified data loading hook
 * 
 * Features:
 * - Consistent loading states (initial, more, refresh)
 * - Error handling with retry logic
 * - Caching support
 * - Optimistic UI (shows existing data even on error)
 * - Automatic token management
 */
/**
 * Unified data loading hook with pagination, error handling, retry logic, and caching.
 * 
 * This hook provides a consistent interface for loading paginated data across the application.
 * It handles common concerns like authentication, error handling, retry logic, and caching.
 * 
 * Key Features:
 * 1. Automatic pagination: Supports "load more" functionality with configurable page size
 * 2. Error handling: Standardized error handling with retry logic and user-friendly messages
 * 3. Authentication: Automatic token management and authentication checks
 * 4. Caching: Optional caching to reduce unnecessary API calls (default: 5 minutes)
 * 5. Retry logic: Automatic retry on network errors with exponential backoff
 * 6. Loading states: Separate states for initial load, loading more, and refreshing
 * 
 * Usage Example:
 * ```typescript
 * const { items, isLoading, error, loadMore, refresh } = useDataLoader({
 *   loadFn: async (skip, limit) => {
 *     const response = await fetchPosts(skip, limit);
 *     return { items: response.posts, total: response.total };
 *   },
 *   pageSize: 20,
 *   requireAuth: true,
 *   autoLoad: true,
 * });
 * ```
 * 
 * @template T - Type of items being loaded
 * @param options - Configuration options for the data loader
 * @returns Object containing items, loading states, error, and control functions
 */
export function useDataLoader<T>(
  options: UseDataLoaderOptions<T>
): UseDataLoaderReturn<T> {
  const {
    loadFn,
    pageSize = 20,
    autoLoad = true,
    requireAuth = true,
    retryConfig = {},
    cacheConfig = {},
  } = options;

  const {
    maxRetries = 3,
    retryDelay = 1000,
    autoRetry = true,
  } = retryConfig;

  const {
    enabled: cacheEnabled = true,
    ttl: cacheTtl = 5 * 60 * 1000, // 5 minutes
  } = cacheConfig;

  const { isAuthenticated, isLoading: authLoading, getAccessTokenSilently } = useAuth0();

  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState<number | null>(null);

  const isMountedRef = useRef(true);
  const currentPageRef = useRef(0);
  const retryCountRef = useRef(0);
  const lastLoadTimeRef = useRef<number | null>(null);
  const cacheRef = useRef<{ items: T[]; timestamp: number } | null>(null);
  const lastLoadFnRef = useRef<(() => Promise<void>) | null>(null);
  const isLoadingRef = useRef(false); // Prevent duplicate requests
  const hasAutoLoadedRef = useRef(false); // Track if auto-load has been executed
  const lastAuthStateRef = useRef<string | null>(null); // Track last auth state for which we loaded
  const loadFnRef = useRef<((reset?: boolean) => Promise<void>) | null>(null); // Ref to latest load function
  
  // Memoize loadFn to prevent unnecessary re-renders
  const memoizedLoadFn = useRef(loadFn);
  useEffect(() => {
    memoizedLoadFn.current = loadFn;
  }, [loadFn]);

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true;
    // Reset auto-load flag on mount to ensure initial load happens
    hasAutoLoadedRef.current = false;
    lastAuthStateRef.current = null;
    // Clear loading ref on mount to prevent stuck states
    isLoadingRef.current = false;
    // Clear cache on mount to ensure fresh data on page navigation
    // This prevents issues with stale cached data on subsequent page loads
    cacheRef.current = null;
    debugLog.log('[useDataLoader] Component mounted, resetting state', {
      timestamp: new Date().toISOString()
    });
    return () => {
      isMountedRef.current = false;
      // Clear loading state on unmount
      isLoadingRef.current = false;
    };
  }, []);

  // Clear cache on unmount
  useEffect(() => {
    return () => {
      cacheRef.current = null;
      isLoadingRef.current = false;
    };
  }, []);

  /**
   * Internal load function with retry logic and error handling.
   * 
   * This function handles the actual data loading with the following steps:
   * 1. Check component mount state (prevent state updates on unmounted components)
   * 2. Prevent duplicate requests (using isLoadingRef)
   * 3. Check authentication if required
   * 4. Get access token (with timeout handling)
   * 5. Execute loadFn with retry logic
   * 6. Update state with results or errors
   * 
   * Retry Logic:
   * - Automatically retries on network errors (up to maxRetries times)
   * - Uses exponential backoff for retry delays
   * - Only retries on network errors, not on validation or authentication errors
   * 
   * Caching:
   * - Uses cache if enabled and data is fresh (within TTL)
   * - Cache is cleared on component mount to ensure fresh data
   * - Cache is not used for refresh operations
   * 
   * @param skip - Number of items to skip (for pagination)
   * @param reset - Whether to reset the items list (true for initial load/refresh)
   * @param showLoading - Whether to show loading state
   * @param isRefresh - Whether this is a refresh operation (affects loading state)
   */
  const loadInternal = useCallback(
    async (
      skip: number,
      reset: boolean,
      showLoading: boolean,
      isRefresh: boolean = false
    ): Promise<void> => {
      // Check mount state: Prevent state updates on unmounted components
      // This is important for avoiding React warnings and memory leaks
      if (!isMountedRef.current) return;

      // Prevent duplicate requests: Only one request at a time (except for refresh)
      // This prevents race conditions and unnecessary API calls
      if (isLoadingRef.current && !isRefresh) {
        debugLog.log('[useDataLoader] Request already in progress, skipping duplicate');
        return;
      }

      // Check authentication: If authentication is required but user is not authenticated,
      // set error and return early. This prevents unnecessary API calls.
      if (requireAuth && !isAuthenticated) {
        if (isMountedRef.current) {
          setError({
            type: ErrorType.UNAUTHORIZED,
            message: 'Authentication required',
            originalError: null,
          });
        }
        return;
      }

      isLoadingRef.current = true;

      // Set loading state
      if (showLoading) {
        if (isRefresh) {
          setIsRefreshing(true);
        } else if (reset) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }
      }

      // Clear error
      if (isMountedRef.current) {
        setError(null);
      }

      try {
        // Get token if authenticated (with timeout)
        // This must complete before making API calls
        if (isAuthenticated) {
          try {
            debugLog.log('[useDataLoader] Getting token before API call...', { 
              timestamp: new Date().toISOString(),
              hasToken: !!apiClient.defaults.headers.common['Authorization']
            });
            
            // Get token - tokenManager handles its own timeout (15s per attempt, 3 attempts)
            // We don't add an additional timeout here to avoid conflicts
            const token = await getAccessTokenFromManager(getAccessTokenSilently);
            
            if (!isMountedRef.current) {
              debugLog.log('[useDataLoader] Component unmounted after token retrieval, aborting');
              isLoadingRef.current = false;
              return;
            }
            
            setAuthToken(token);
            debugLog.log('[useDataLoader] Token set in API client', { 
              timestamp: new Date().toISOString()
            });
          } catch (tokenError: any) {
            debugLog.error('[useDataLoader] Failed to get token:', tokenError, { 
              timestamp: new Date().toISOString(),
              errorMessage: tokenError?.message,
              errorName: tokenError?.name,
              isTimeout: tokenError?.message?.includes('timeout')
            });
            
            // Always abort the request if token retrieval fails when auth is required
            isLoadingRef.current = false;
            if (!isMountedRef.current) {
              return;
            }
            
            if (requireAuth) {
              // Provide more detailed error message
              let errorMessage = 'Failed to get authentication token';
              if (tokenError?.message?.includes('timeout')) {
                errorMessage = 'Authentication token request timed out. Please check your connection and try again.';
              } else if (tokenError?.message) {
                errorMessage = `Authentication failed: ${tokenError.message}`;
              }

              setError({
                type: ErrorType.UNAUTHORIZED,
                message: errorMessage,
                originalError: tokenError,
              });
              setIsLoading(false);
              setIsLoadingMore(false);
              setIsRefreshing(false);
              
              // Don't proceed with the request
              return;
            }
            
            // For non-auth required requests, continue without token
            debugLog.warn('[useDataLoader] Continuing without token (auth not required)');
          }
        } else if (requireAuth) {
          // Not authenticated but auth is required
          isLoadingRef.current = false;
          if (isMountedRef.current) {
            setError({
              type: ErrorType.UNAUTHORIZED,
              message: 'Authentication required',
              originalError: null,
            });
            setIsLoading(false);
            setIsLoadingMore(false);
            setIsRefreshing(false);
          }
          return;
        }

        if (!isMountedRef.current) {
          debugLog.log('[useDataLoader] Component unmounted before API call');
          return;
        }

        // Load data - ensure token is set before this point
        debugLog.log('[useDataLoader] Calling loadFn...', { 
          skip, 
          pageSize,
          hasToken: !!apiClient.defaults.headers.common['Authorization'],
          timestamp: new Date().toISOString()
        });
        const loadStartTime = Date.now();
        const result = await memoizedLoadFn.current(skip, pageSize);
        const loadElapsed = Date.now() - loadStartTime;
        debugLog.log('[useDataLoader] loadFn completed', { 
          elapsed: loadElapsed,
          itemsCount: result.items?.length,
          timestamp: new Date().toISOString()
        });

        if (!isMountedRef.current) return;

        // Update state
        if (reset) {
          setItems(result.items);
          currentPageRef.current = 0;
        } else {
          setItems((prev) => [...prev, ...result.items]);
        }

        setHasMore(result.items.length === pageSize);
        if (result.total !== undefined) {
          setTotal(result.total);
        }

        // Update cache
        if (cacheEnabled) {
          cacheRef.current = {
            items: result.items,
            timestamp: Date.now(),
          };
        }

        lastLoadTimeRef.current = Date.now();
        retryCountRef.current = 0;

        // Clear loading states
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
          setIsRefreshing(false);
        }
        isLoadingRef.current = false;
      } catch (err: any) {
        debugLog.error('[useDataLoader] Load error:', err);

        if (!isMountedRef.current) return;

        const errorInfo = extractErrorInfo(err);
        setError(errorInfo);

        // Clear loading states
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsRefreshing(false);
        isLoadingRef.current = false;

        // Auto-retry on network errors
        if (
          autoRetry &&
          retryCountRef.current < maxRetries &&
          errorInfo.type === ErrorType.NETWORK
        ) {
          retryCountRef.current++;
          const delay = retryDelay * Math.pow(2, retryCountRef.current - 1); // Exponential backoff
          debugLog.log(`[useDataLoader] Auto-retrying in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
          
          setTimeout(() => {
            if (isMountedRef.current) {
              loadInternal(skip, reset, showLoading, isRefresh);
            }
          }, delay);
        } else {
          // Don't use cached data on error - clear cache to force fresh load on retry
          // This prevents issues where cached data might be stale or invalid
          if (cacheEnabled && cacheRef.current) {
            const cacheAge = Date.now() - cacheRef.current.timestamp;
            if (cacheAge < cacheTtl && errorInfo.type !== ErrorType.UNAUTHORIZED) {
              // Only use cache for non-auth errors (network errors, etc.)
              // Auth errors should not use cached data
              debugLog.log('[useDataLoader] Using cached data due to non-auth error');
              setItems(cacheRef.current.items);
            } else {
              // Clear cache on auth errors or expired cache
              debugLog.log('[useDataLoader] Clearing cache due to error', {
                errorType: errorInfo.type,
                cacheAge,
                cacheExpired: cacheAge >= cacheTtl
              });
              cacheRef.current = null;
            }
          }
        }
      }
    },
    [
      pageSize,
      requireAuth,
      isAuthenticated,
      getAccessTokenSilently,
      autoRetry,
      maxRetries,
      retryDelay,
      cacheEnabled,
      cacheTtl,
    ]
  );

  // Load function (public API)
  const load = useCallback(
    async (reset: boolean = true) => {
      debugLog.log('[useDataLoader] load() called', { 
        reset, 
        isLoadingRef: isLoadingRef.current,
        timestamp: new Date().toISOString()
      });
      
      // Prevent duplicate requests
      if (isLoadingRef.current && !reset) {
        debugLog.log('[useDataLoader] Load already in progress, skipping');
        return;
      }
      
      if (reset) {
        currentPageRef.current = 0;
        retryCountRef.current = 0;
      }
      const skip = currentPageRef.current * pageSize;
      lastLoadFnRef.current = () => loadInternal(skip, reset, true, false);
      await lastLoadFnRef.current();
    },
    [loadInternal, pageSize]
  );

  // Update load function ref when it changes (Best Practice: keep ref in sync)
  useEffect(() => {
    loadFnRef.current = load;
  }, [load]);

  // Load more function
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    currentPageRef.current++;
    const skip = currentPageRef.current * pageSize;
    lastLoadFnRef.current = () => loadInternal(skip, false, true, false);
    await lastLoadFnRef.current();
  }, [loadInternal, pageSize, isLoadingMore, hasMore]);

  // Refresh function
  const refresh = useCallback(async () => {
    retryCountRef.current = 0;
    const skip = 0;
    lastLoadFnRef.current = () => loadInternal(skip, true, false, true);
    await lastLoadFnRef.current();
  }, [loadInternal]);

  // Retry function
  const retry = useCallback(async () => {
    retryCountRef.current = 0;
    if (lastLoadFnRef.current) {
      await lastLoadFnRef.current();
    } else {
      // If no last load function, do initial load
      // Use ref to get latest load function (Best Practice: avoid stale closures)
      if (loadFnRef.current) {
        await loadFnRef.current(true);
      } else {
        // Fallback: call load directly if ref not set yet
        await load(true);
      }
    }
  }, [load]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-load on mount (after auth is ready)
  // Best Practice: Separate concerns - check auth state first, then load
  useEffect(() => {
    if (!autoLoad) return;
    
    // Step 1: Check if auth is required and ready
    if (requireAuth) {
      // If auth is still loading, wait
      if (authLoading) {
        console.log('[useDataLoader] Waiting for auth to complete...', {
          authLoading,
          isAuthenticated,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // If not authenticated, don't load
      if (!isAuthenticated) {
        debugLog.log('[useDataLoader] Not authenticated, skipping auto-load', {
          authLoading,
          isAuthenticated,
          timestamp: new Date().toISOString()
        });
        return;
      }
    }

    // Step 2: Check if we've already loaded for this auth state
    // Use a simple key based on auth state
    const authStateKey = requireAuth 
      ? `auth-${isAuthenticated}-${authLoading}` 
      : 'no-auth';
    
    if (hasAutoLoadedRef.current && lastAuthStateRef.current === authStateKey) {
      debugLog.log('[useDataLoader] Already loaded for this auth state, skipping', { 
        authStateKey,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Step 3: Mark as loading for this auth state
    debugLog.log('[useDataLoader] Starting auto-load...', { 
      authStateKey, 
      isAuthenticated, 
      authLoading,
      requireAuth,
      timestamp: new Date().toISOString()
    });
    
    hasAutoLoadedRef.current = true;
    lastAuthStateRef.current = authStateKey;

    // Step 4: Use cached data immediately if available (optimistic UI)
    // Only use cache if it's fresh (less than 30 seconds old) to prevent stale data issues
    // For older cache, we'll wait for fresh data to avoid showing outdated information
    if (cacheEnabled && cacheRef.current) {
      const cacheAge = Date.now() - cacheRef.current.timestamp;
      const MAX_CACHE_AGE_FOR_OPTIMISTIC_UI = 30 * 1000; // 30 seconds
      if (cacheAge < MAX_CACHE_AGE_FOR_OPTIMISTIC_UI) {
        debugLog.log('[useDataLoader] Using cached data while loading fresh data', {
          cacheAge,
          itemsCount: cacheRef.current.items.length,
          timestamp: new Date().toISOString()
        });
        setItems(cacheRef.current.items);
        setIsLoading(false);
      } else {
        debugLog.log('[useDataLoader] Cache too old for optimistic UI, waiting for fresh data', {
          cacheAge,
          maxAge: MAX_CACHE_AGE_FOR_OPTIMISTIC_UI,
          timestamp: new Date().toISOString()
        });
        // Clear old cache to force fresh load
        cacheRef.current = null;
      }
    }

    // Step 5: Load fresh data
    // Best Practice: Use ref to access latest load function without adding to deps
    // Use a separate async function to avoid issues with useEffect cleanup
    let isCancelled = false;
    
    const performLoad = async () => {
      try {
        // Small delay to ensure Auth0 is fully ready (Best Practice: debounce rapid state changes)
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (isCancelled || !isMountedRef.current) {
          debugLog.log('[useDataLoader] Load cancelled or component unmounted');
          return;
        }

        debugLog.log('[useDataLoader] Executing load...', {
          timestamp: new Date().toISOString()
        });
        
        // Use ref to get latest load function
        if (loadFnRef.current) {
          await loadFnRef.current(true);
        } else {
          // Fallback: call load directly if ref not set yet
          await load(true);
        }
      } catch (err) {
        if (!isCancelled && isMountedRef.current) {
          debugLog.error('[useDataLoader] Auto-load failed:', err, {
            timestamp: new Date().toISOString()
          });
          // Reset flags on error to allow retry
          hasAutoLoadedRef.current = false;
          lastAuthStateRef.current = null;
        }
      }
    };

    performLoad();

    // Cleanup function
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, requireAuth, authLoading, isAuthenticated]); // Removed 'load' from deps, using ref instead

  return {
    items,
    isLoading,
    isLoadingMore,
    isRefreshing,
    error,
    hasMore,
    total,
    load,
    loadMore,
    refresh,
    retry,
    clearError,
  };
}

