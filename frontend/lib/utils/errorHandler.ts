/**
 * Error Handler Utilities
 * Provides centralized error handling for API errors
 */

import { AxiosError } from 'axios';

export enum ErrorType {
  NETWORK = 'NETWORK',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  statusCode?: number;
  originalError?: any;
}

/**
 * Extract error information from various error types
 */
export function extractErrorInfo(error: any): ErrorInfo {
  // Axios errors
  if (error?.isAxiosError) {
    const axiosError = error as AxiosError;

    if (axiosError.response) {
      // Server responded with error status
      const status = axiosError.response.status;
      const data = axiosError.response.data as any;

      let message = data?.detail || data?.message || axiosError.message || 'An error occurred';

      // Handle validation errors
      if (status === 422 && data?.detail) {
        if (Array.isArray(data.detail)) {
          message = data.detail.map((err: any) => err.msg || err.message).join(', ');
        }
      }

      return {
        type: getErrorTypeFromStatus(status),
        message,
        statusCode: status,
        originalError: error,
      };
    } else if (axiosError.request) {
      // Request made but no response received (network error or timeout)
      const isTimeout =
        axiosError.code === 'ECONNABORTED' ||
        axiosError.message?.includes('timeout') ||
        axiosError.message?.includes('exceeded');

      // Extract timeout details for better error messages
      const config = axiosError.config as any;
      const requestStartTime = config?.__requestStartTime;
      const elapsed = requestStartTime ? Date.now() - requestStartTime : undefined;
      const configuredTimeout = config?.timeout;

      if (isTimeout) {
        let timeoutMessage = 'Request timeout: The server is taking too long to respond.';
        if (configuredTimeout && elapsed) {
          timeoutMessage += ` (Timeout: ${configuredTimeout}ms, Elapsed: ${elapsed}ms)`;
        } else if (configuredTimeout) {
          timeoutMessage += ` (Timeout: ${configuredTimeout}ms)`;
        }
        timeoutMessage += ' Please try again.';

        return {
          type: ErrorType.NETWORK,
          message: timeoutMessage,
          originalError: {
            ...error,
            timeoutDetails: {
              configuredTimeout,
              actualElapsed: elapsed,
              timeoutExceeded:
                elapsed && configuredTimeout ? elapsed > configuredTimeout : undefined,
            },
          },
        };
      }

      return {
        type: ErrorType.NETWORK,
        message: 'Network error: Unable to connect to the server',
        originalError: error,
      };
    }
  }

  // Standard Error objects
  if (error instanceof Error) {
    return {
      type: ErrorType.UNKNOWN,
      message: error.message,
      originalError: error,
    };
  }

  // String errors
  if (typeof error === 'string') {
    return {
      type: ErrorType.UNKNOWN,
      message: error,
      originalError: error,
    };
  }

  // Fallback
  return {
    type: ErrorType.UNKNOWN,
    message: 'An unexpected error occurred',
    originalError: error,
  };
}

/**
 * Get error type from HTTP status code
 */
function getErrorTypeFromStatus(status: number): ErrorType {
  switch (status) {
    case 401:
      return ErrorType.UNAUTHORIZED;
    case 403:
      return ErrorType.FORBIDDEN;
    case 404:
      return ErrorType.NOT_FOUND;
    case 422:
      return ErrorType.VALIDATION;
    case 500:
    case 502:
    case 503:
    case 504:
      return ErrorType.SERVER;
    default:
      return ErrorType.UNKNOWN;
  }
}

/**
 * Check if error requires authentication redirect
 */
export function requiresAuthRedirect(error: ErrorInfo): boolean {
  return error.type === ErrorType.UNAUTHORIZED || error.type === ErrorType.FORBIDDEN;
}

/**
 * Get user-friendly error message key for translation
 * Note: This returns the key without the namespace prefix since ErrorDisplay uses useTranslations('errors')
 */
export function getErrorMessageKey(error: ErrorInfo): string {
  // Check if it's a timeout error
  if (error.type === ErrorType.NETWORK) {
    const isTimeout =
      error.originalError?.code === 'ECONNABORTED' ||
      error.originalError?.message?.includes('timeout') ||
      error.originalError?.message?.includes('exceeded') ||
      error.message?.includes('timeout') ||
      error.message?.includes('taking too long');
    if (isTimeout) {
      return 'timeout';
    }
  }

  switch (error.type) {
    case ErrorType.NETWORK:
      return 'network';
    case ErrorType.UNAUTHORIZED:
      return 'unauthorized';
    case ErrorType.FORBIDDEN:
      return 'forbidden';
    case ErrorType.NOT_FOUND:
      return 'notFound';
    case ErrorType.VALIDATION:
      return 'validation';
    case ErrorType.SERVER:
      return 'server';
    default:
      return 'general';
  }
}
