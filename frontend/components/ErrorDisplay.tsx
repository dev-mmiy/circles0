/**
 * Error Display Component
 * Displays user-friendly error messages with translation support
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { ErrorInfo, getErrorMessageKey, ErrorType } from '@/lib/utils/errorHandler';

interface ErrorDisplayProps {
  error: ErrorInfo | Error | string | null;
  className?: string;
  showDetails?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorDisplay({
  error,
  className = '',
  showDetails = false,
  onRetry,
  onDismiss,
}: ErrorDisplayProps) {
  const t = useTranslations('errors');

  if (!error) {
    return null;
  }

  // Normalize error to ErrorInfo
  let errorInfo: ErrorInfo;
  if (typeof error === 'string') {
    errorInfo = {
      type: ErrorType.UNKNOWN,
      message: error,
    };
  } else if (error instanceof Error) {
    errorInfo = {
      type: ErrorType.UNKNOWN,
      message: error.message,
      originalError: error,
    };
  } else {
    errorInfo = error;
  }

  const messageKey = getErrorMessageKey(errorInfo);
  const translatedMessage = t(messageKey, { defaultValue: errorInfo.message });

  // Get error icon based on type
  const getErrorIcon = () => {
    switch (errorInfo.type) {
      case ErrorType.NETWORK:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
        );
      case ErrorType.UNAUTHORIZED:
      case ErrorType.FORBIDDEN:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        );
      case ErrorType.VALIDATION:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  // Get error color based on type
  const getErrorColor = () => {
    switch (errorInfo.type) {
      case ErrorType.NETWORK:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case ErrorType.UNAUTHORIZED:
      case ErrorType.FORBIDDEN:
        return 'bg-red-50 border-red-200 text-red-800';
      case ErrorType.VALIDATION:
        return 'bg-orange-50 border-orange-200 text-orange-800';
      default:
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${getErrorColor()} ${className} relative`}>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 text-current opacity-60 hover:opacity-100 transition-opacity"
          aria-label={t('dismiss') || 'Dismiss'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-0.5">{getErrorIcon()}</div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium mb-1">{translatedMessage}</h3>
          {showDetails && errorInfo.message && (
            <p className="text-sm opacity-90 mt-1">{errorInfo.message}</p>
          )}
          {showDetails && errorInfo.statusCode && (
            <p className="text-xs opacity-75 mt-1">
              {t('statusCode')}: {errorInfo.statusCode}
            </p>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm font-medium underline hover:no-underline"
            >
              {t('retry')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
