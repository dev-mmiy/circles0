/**
 * Tests for error handler utilities
 */

import { AxiosError } from 'axios';
import {
  ErrorType,
  extractErrorInfo,
  getErrorMessageKey,
  requiresAuthRedirect,
} from '../errorHandler';

describe('errorHandler utilities', () => {
  describe('extractErrorInfo', () => {
    it('should handle Axios error with response', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: {
            detail: 'Not found',
          },
        },
        message: 'Request failed',
      } as AxiosError;

      const result = extractErrorInfo(axiosError);
      expect(result.type).toBe(ErrorType.NOT_FOUND);
      expect(result.message).toBe('Not found');
      expect(result.statusCode).toBe(404);
    });

    it('should handle Axios error with validation errors', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 422,
          data: {
            detail: [{ msg: 'Field is required' }, { message: 'Invalid format' }],
          },
        },
        message: 'Validation failed',
      } as AxiosError;

      const result = extractErrorInfo(axiosError);
      expect(result.type).toBe(ErrorType.VALIDATION);
      expect(result.message).toBe('Field is required, Invalid format');
      expect(result.statusCode).toBe(422);
    });

    it('should handle Axios network error', () => {
      const axiosError = {
        isAxiosError: true,
        request: {},
        message: 'Network error',
      } as AxiosError;

      const result = extractErrorInfo(axiosError);
      expect(result.type).toBe(ErrorType.NETWORK);
      expect(result.message).toBe('Network error: Unable to connect to the server');
    });

    it('should handle standard Error object', () => {
      const error = new Error('Something went wrong');
      const result = extractErrorInfo(error);
      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe('Something went wrong');
    });

    it('should handle string error', () => {
      const result = extractErrorInfo('String error');
      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe('String error');
    });

    it('should handle 401 error', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: { detail: 'Unauthorized' },
        },
      } as AxiosError;

      const result = extractErrorInfo(axiosError);
      expect(result.type).toBe(ErrorType.UNAUTHORIZED);
      expect(result.statusCode).toBe(401);
    });

    it('should handle 403 error', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 403,
          data: { detail: 'Forbidden' },
        },
      } as AxiosError;

      const result = extractErrorInfo(axiosError);
      expect(result.type).toBe(ErrorType.FORBIDDEN);
      expect(result.statusCode).toBe(403);
    });

    it('should handle 500 error', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: { detail: 'Internal server error' },
        },
      } as AxiosError;

      const result = extractErrorInfo(axiosError);
      expect(result.type).toBe(ErrorType.SERVER);
      expect(result.statusCode).toBe(500);
    });

    it('should handle unknown error', () => {
      const result = extractErrorInfo(null);
      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe('An unexpected error occurred');
    });
  });

  describe('requiresAuthRedirect', () => {
    it('should return true for UNAUTHORIZED error', () => {
      const errorInfo = {
        type: ErrorType.UNAUTHORIZED,
        message: 'Unauthorized',
      };
      expect(requiresAuthRedirect(errorInfo)).toBe(true);
    });

    it('should return true for FORBIDDEN error', () => {
      const errorInfo = {
        type: ErrorType.FORBIDDEN,
        message: 'Forbidden',
      };
      expect(requiresAuthRedirect(errorInfo)).toBe(true);
    });

    it('should return false for other error types', () => {
      const errorInfo = {
        type: ErrorType.NETWORK,
        message: 'Network error',
      };
      expect(requiresAuthRedirect(errorInfo)).toBe(false);
    });
  });

  describe('getErrorMessageKey', () => {
    it('should return correct key for NETWORK error', () => {
      const errorInfo = {
        type: ErrorType.NETWORK,
        message: 'Network error',
      };
      expect(getErrorMessageKey(errorInfo)).toBe('network');
    });

    it('should return correct key for UNAUTHORIZED error', () => {
      const errorInfo = {
        type: ErrorType.UNAUTHORIZED,
        message: 'Unauthorized',
      };
      expect(getErrorMessageKey(errorInfo)).toBe('unauthorized');
    });

    it('should return correct key for FORBIDDEN error', () => {
      const errorInfo = {
        type: ErrorType.FORBIDDEN,
        message: 'Forbidden',
      };
      expect(getErrorMessageKey(errorInfo)).toBe('forbidden');
    });

    it('should return correct key for NOT_FOUND error', () => {
      const errorInfo = {
        type: ErrorType.NOT_FOUND,
        message: 'Not found',
      };
      expect(getErrorMessageKey(errorInfo)).toBe('notFound');
    });

    it('should return correct key for VALIDATION error', () => {
      const errorInfo = {
        type: ErrorType.VALIDATION,
        message: 'Validation error',
      };
      expect(getErrorMessageKey(errorInfo)).toBe('validation');
    });

    it('should return correct key for SERVER error', () => {
      const errorInfo = {
        type: ErrorType.SERVER,
        message: 'Server error',
      };
      expect(getErrorMessageKey(errorInfo)).toBe('server');
    });

    it('should return "general" for UNKNOWN error', () => {
      const errorInfo = {
        type: ErrorType.UNKNOWN,
        message: 'Unknown error',
      };
      expect(getErrorMessageKey(errorInfo)).toBe('general');
    });
  });
});
