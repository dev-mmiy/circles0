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
      // Request made but no response received (network error)
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
 */
export function getErrorMessageKey(error: ErrorInfo): string {
  switch (error.type) {
    case ErrorType.NETWORK:
      return 'errors.network';
    case ErrorType.UNAUTHORIZED:
      return 'errors.unauthorized';
    case ErrorType.FORBIDDEN:
      return 'errors.forbidden';
    case ErrorType.NOT_FOUND:
      return 'errors.notFound';
    case ErrorType.VALIDATION:
      return 'errors.validation';
    case ErrorType.SERVER:
      return 'errors.server';
    default:
      return 'errors.general';
  }
}

