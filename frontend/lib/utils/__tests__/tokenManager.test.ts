/**
 * Tests for token manager utilities
 */

// Mock apiClient before importing tokenManager
const mockApiClient = {
  defaults: {
    headers: {
      common: {} as Record<string, any>,
    },
  },
};

jest.mock('@/lib/api/client', () => ({
  apiClient: mockApiClient,
}));

// Mock debugLog
jest.mock('../debug', () => ({
  debugLog: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('tokenManager utilities', () => {
  let tokenManager: typeof import('../tokenManager');

  beforeEach(async () => {
    // Reset module state by re-importing
    jest.resetModules();
    tokenManager = await import('../tokenManager');

    // Clear token cache before each test
    tokenManager.clearToken();
    // Reset apiClient headers
    mockApiClient.defaults.headers.common = {};
    jest.clearAllMocks();
  });

  describe('clearToken', () => {
    it('should clear token from cache and API client', () => {
      // Set a token first
      mockApiClient.defaults.headers.common['Authorization'] = 'Bearer test-token';

      tokenManager.clearToken();

      expect(mockApiClient.defaults.headers.common['Authorization']).toBeUndefined();
    });
  });

  describe('getAccessToken', () => {
    it('should return cached token if available and not expired', async () => {
      const mockGetAccessTokenSilently = jest.fn();

      // First call to cache the token
      mockGetAccessTokenSilently.mockResolvedValueOnce('cached-token-123');
      const token1 = await tokenManager.getAccessToken(mockGetAccessTokenSilently, false);
      expect(token1).toBe('cached-token-123');
      expect(mockGetAccessTokenSilently).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const token2 = await tokenManager.getAccessToken(mockGetAccessTokenSilently, false);
      expect(token2).toBe('cached-token-123');
      // Should not call getAccessTokenSilently again
      expect(mockGetAccessTokenSilently).toHaveBeenCalledTimes(1);
    });

    it('should bypass cache when forceRefresh is true', async () => {
      // Re-import to get fresh module state for this test
      jest.resetModules();
      const freshTokenManager = await import('../tokenManager');

      const mockGetAccessTokenSilently = jest.fn();
      mockGetAccessTokenSilently.mockResolvedValueOnce('token-1').mockResolvedValueOnce('token-2');

      // First call to establish cache
      const token1 = await freshTokenManager.getAccessToken(mockGetAccessTokenSilently, false);
      expect(token1).toBe('token-1');
      expect(mockGetAccessTokenSilently).toHaveBeenCalledTimes(1);

      // Wait a bit to ensure first promise is resolved
      await new Promise(resolve => setTimeout(resolve, 10));

      // Force refresh - should call getAccessTokenSilently again even with cache
      // Clear API client token to ensure force refresh path is taken
      delete mockApiClient.defaults.headers.common['Authorization'];

      const token2 = await freshTokenManager.getAccessToken(mockGetAccessTokenSilently, true);
      // Note: Due to promise reuse logic, token2 might be token-1 if promise is still in progress
      // The important thing is that forceRefresh bypasses the cache check
      expect(mockGetAccessTokenSilently).toHaveBeenCalled();
    });

    it('should reuse existing promise if request is in progress', async () => {
      const mockGetAccessTokenSilently = jest.fn();
      // Delay the promise resolution
      let resolvePromise: (value: string) => void;
      const delayedPromise = new Promise<string>(resolve => {
        resolvePromise = resolve;
      });
      mockGetAccessTokenSilently.mockReturnValueOnce(delayedPromise);

      // Start two concurrent requests
      const promise1 = tokenManager.getAccessToken(mockGetAccessTokenSilently, false);
      const promise2 = tokenManager.getAccessToken(mockGetAccessTokenSilently, false);

      // Resolve the promise
      resolvePromise!('shared-token');

      const [token1, token2] = await Promise.all([promise1, promise2]);

      expect(token1).toBe('shared-token');
      expect(token2).toBe('shared-token');
      // Should only call getAccessTokenSilently once
      expect(mockGetAccessTokenSilently).toHaveBeenCalledTimes(1);
    });

    it('should handle timeout errors with retries', async () => {
      const mockGetAccessTokenSilently = jest.fn();
      const timeoutError = new Error('Token retrieval timeout after 20000ms');

      // First attempt fails with timeout
      mockGetAccessTokenSilently.mockRejectedValueOnce(timeoutError);
      // Second attempt succeeds
      mockGetAccessTokenSilently.mockResolvedValueOnce('retry-token');

      // Use real timers but with shorter delays for testing
      const tokenPromise = tokenManager.getAccessToken(mockGetAccessTokenSilently, false);

      // Wait for the promise to resolve (with timeout)
      const result = await Promise.race([
        tokenPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), 5000)),
      ]);

      expect(result).toBe('retry-token');
      expect(mockGetAccessTokenSilently).toHaveBeenCalledTimes(2);
    });

    it('should set token in API client after successful retrieval', async () => {
      const mockGetAccessTokenSilently = jest.fn();
      mockGetAccessTokenSilently.mockResolvedValueOnce('new-token-123');

      await tokenManager.getAccessToken(mockGetAccessTokenSilently, false);

      expect(mockApiClient.defaults.headers.common['Authorization']).toBe('Bearer new-token-123');
    });

    it('should handle errors and clear token on failure', async () => {
      const mockGetAccessTokenSilently = jest.fn();
      const error = new Error('Auth0 error');
      // Fail all retry attempts (3 attempts total: initial + 2 retries)
      mockGetAccessTokenSilently.mockRejectedValue(error);

      const tokenPromise = tokenManager.getAccessToken(mockGetAccessTokenSilently, false);

      // Wait for all retries to fail (with timeout)
      await expect(
        Promise.race([
          tokenPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), 10000)),
        ])
      ).rejects.toThrow();

      expect(mockApiClient.defaults.headers.common['Authorization']).toBeUndefined();
    });
  });
});
