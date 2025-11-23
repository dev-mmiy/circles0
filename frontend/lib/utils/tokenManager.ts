/**
 * Centralized token management to prevent multiple simultaneous calls to getAccessTokenSilently
 * This prevents blocking when multiple components try to get tokens at the same time
 */

import { apiClient } from '@/lib/api/client';
import { debugLog } from './debug';

let tokenPromise: Promise<string> | null = null;
let tokenCache: string | null = null;
let tokenExpiry: number | null = null;
const TOKEN_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get the current token from cache if available and not expired
 */
function getCachedToken(): string | null {
  if (tokenCache && tokenExpiry && Date.now() < tokenExpiry) {
    return tokenCache;
  }
  return null;
}

/**
 * Set token in cache and API client
 */
function setToken(token: string): void {
  tokenCache = token;
  tokenExpiry = Date.now() + TOKEN_CACHE_DURATION;
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

/**
 * Clear token from cache and API client
 */
export function clearToken(): void {
  tokenCache = null;
  tokenExpiry = null;
  delete apiClient.defaults.headers.common['Authorization'];
}

/**
 * Get access token with deduplication
 * If a token request is already in progress, returns the same promise
 * If token is already cached and valid, returns it immediately
 */
export async function getAccessToken(
  getAccessTokenSilently: () => Promise<string>,
  forceRefresh: boolean = false
): Promise<string> {
  // Check cache first (unless forcing refresh)
  if (!forceRefresh) {
    const cached = getCachedToken();
    if (cached) {
      debugLog.log('[tokenManager] Using cached token', {
        cacheAge: tokenExpiry ? Date.now() - (tokenExpiry - TOKEN_CACHE_DURATION) : 0,
        timestamp: new Date().toISOString()
      });
      return cached;
    }
  }

  // Check if token is already set in API client (from previous call)
  // Only use it if it's not expired (within last 5 minutes)
  const currentToken = apiClient.defaults.headers.common['Authorization'];
  const tokenString = typeof currentToken === 'string' ? currentToken : '';
  if (!forceRefresh && tokenString && tokenString.startsWith('Bearer ')) {
    const tokenValue = tokenString.replace('Bearer ', '');
    // Only reuse if we have a valid cached token or it's been less than 5 minutes
    if (tokenCache === tokenValue || !tokenExpiry || Date.now() < tokenExpiry) {
      tokenCache = tokenValue;
      tokenExpiry = Date.now() + TOKEN_CACHE_DURATION;
      debugLog.log('[tokenManager] Using token from API client', {
        timestamp: new Date().toISOString()
      });
      return tokenValue;
    } else {
      // Token in API client is different or expired, clear it
      debugLog.log('[tokenManager] Token in API client is expired or different, clearing', {
        timestamp: new Date().toISOString()
      });
      delete apiClient.defaults.headers.common['Authorization'];
    }
  }

  // If a request is already in progress, reuse that promise
  if (tokenPromise) {
    debugLog.log('[tokenManager] Reusing existing token request');
    try {
      const token = await tokenPromise;
      return token;
    } catch (error) {
      // If the existing request failed, clear it and try again
      tokenPromise = null;
      throw error;
    }
  }

  // Start new token request with retry logic
  debugLog.log('[tokenManager] Starting new token request', { timestamp: new Date().toISOString() });
  const newTokenPromise = (async () => {
    const maxRetries = 2; // Reduced from 3 to 2 to fail faster
    const retryDelay = 1000; // 1 second
    const TOKEN_TIMEOUT = 12000; // 12 seconds per attempt (increased from 10s for better reliability)
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        debugLog.log('[tokenManager] Calling getAccessTokenSilently...', { 
          attempt, 
          maxRetries,
          timeout: TOKEN_TIMEOUT,
          timestamp: new Date().toISOString() 
        });
        
        const auth0TokenPromise = getAccessTokenSilently({
          cacheMode: 'on',
          timeout: TOKEN_TIMEOUT, // Pass timeout to Auth0
        }).catch((err) => {
          // Handle Auth0 specific errors
          debugLog.warn('[tokenManager] Auth0 getAccessTokenSilently error:', err, {
            attempt,
            timestamp: new Date().toISOString()
          });
          throw err;
        });
        
        // Add timeout wrapper as fallback (in case Auth0 doesn't respect timeout)
        const timeoutPromise = new Promise<never>((_, reject) => {
          const timeoutId = setTimeout(() => {
            const elapsed = Date.now() - startTime;
            debugLog.error('[tokenManager] Token retrieval timeout', { 
              elapsed, 
              attempt,
              maxRetries,
              timeout: TOKEN_TIMEOUT,
              timestamp: new Date().toISOString() 
            });
            reject(new Error(`Token retrieval timeout after ${TOKEN_TIMEOUT}ms`));
          }, TOKEN_TIMEOUT);
          // Store timeout ID for potential cleanup
          (auth0TokenPromise as any).__timeoutId = timeoutId;
        });
        
        const token = await Promise.race([auth0TokenPromise, timeoutPromise]);
        const elapsed = Date.now() - startTime;
        debugLog.log('[tokenManager] Token retrieved successfully', { 
          elapsed, 
          tokenLength: token?.length, 
          attempt,
          timestamp: new Date().toISOString() 
        });
        setToken(token);
        return token;
      } catch (error: any) {
        lastError = error;
        const elapsed = Date.now() - startTime;
        debugLog.error('[tokenManager] Token retrieval failed:', { 
          error: error?.message || error, 
          elapsed, 
          attempt,
          maxRetries,
          willRetry: attempt < maxRetries,
          timestamp: new Date().toISOString() 
        });
        
        // If this is the last attempt, throw the error
        if (attempt >= maxRetries) {
          clearToken();
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = retryDelay * attempt;
        debugLog.log(`[tokenManager] Retrying token retrieval in ${delay}ms...`, {
          attempt: attempt + 1,
          maxRetries,
          timestamp: new Date().toISOString()
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Should never reach here, but just in case
    clearToken();
    throw lastError || new Error('Token retrieval failed after all retries');
  })();

  tokenPromise = newTokenPromise;
  return newTokenPromise;
}

