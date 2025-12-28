/**
 * Tests for ErrorDisplay component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorDisplay } from '../ErrorDisplay';
import { ErrorType } from '@/lib/utils/errorHandler';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string, options?: { defaultValue?: string }) => {
    const translations: Record<string, string> = {
      network: 'Network error',
      unauthorized: 'Unauthorized',
      forbidden: 'Forbidden',
      notFound: 'Not found',
      validation: 'Validation error',
      server: 'Server error',
      general: 'An error occurred',
      retry: 'Retry',
      statusCode: 'Status Code',
    };
    return translations[key] || options?.defaultValue || key;
  },
}));

describe('ErrorDisplay', () => {
  it('should render nothing when error is null', () => {
    const { container } = render(<ErrorDisplay error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render error message for string error', () => {
    render(<ErrorDisplay error="Something went wrong" />);
    // String errors are converted to UNKNOWN type, which shows "An error occurred"
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
  });

  it('should render error message for Error object', () => {
    const error = new Error('Test error');
    render(<ErrorDisplay error={error} />);
    // Error objects are converted to UNKNOWN type, which shows "An error occurred"
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
  });

  it('should render error message for ErrorInfo', () => {
    const errorInfo = {
      type: ErrorType.NETWORK,
      message: 'Network error occurred',
    };
    render(<ErrorDisplay error={errorInfo} />);
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('should show retry button when onRetry is provided', () => {
    const onRetry = jest.fn();
    const errorInfo = {
      type: ErrorType.NETWORK,
      message: 'Network error',
    };
    render(<ErrorDisplay error={errorInfo} onRetry={onRetry} />);
    
    const retryButton = screen.getByText(/retry/i);
    expect(retryButton).toBeInTheDocument();
    
    retryButton.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should not show retry button when onRetry is not provided', () => {
    const errorInfo = {
      type: ErrorType.NETWORK,
      message: 'Network error',
    };
    render(<ErrorDisplay error={errorInfo} />);
    
    const retryButton = screen.queryByText(/retry/i);
    expect(retryButton).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const errorInfo = {
      type: ErrorType.NETWORK,
      message: 'Network error',
    };
    const { container } = render(
      <ErrorDisplay error={errorInfo} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should display different error types correctly', () => {
    const errorTypes = [
      { type: ErrorType.UNAUTHORIZED, expectedText: 'Unauthorized' },
      { type: ErrorType.FORBIDDEN, expectedText: 'Forbidden' },
      { type: ErrorType.NOT_FOUND, expectedText: 'Not found' },
      { type: ErrorType.VALIDATION, expectedText: 'Validation error' },
      { type: ErrorType.SERVER, expectedText: 'Server error' },
    ];

    errorTypes.forEach(({ type, expectedText }) => {
      const { unmount } = render(
        <ErrorDisplay
          error={{
            type,
            message: 'Test error',
          }}
        />
      );
      expect(screen.getByText(expectedText)).toBeInTheDocument();
      unmount();
    });
  });
});

