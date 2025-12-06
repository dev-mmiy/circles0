/**
 * ImageViewerPageWrapper Component
 * 
 * Common wrapper component for image viewer pages that handles
 * loading, error, and empty states
 */

import { ReactNode } from 'react';
import { useRouter } from '@/i18n/routing';

interface ImageViewerPageWrapperProps {
  isLoading: boolean;
  error: string | null;
  hasImages: boolean;
  imagesCount: number;
  onClose: () => void;
  loadingComponent?: ReactNode;
  errorTitle?: string;
  errorMessage?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  backButtonText?: string;
  backButtonAction?: () => void;
  children: ReactNode;
}

export default function ImageViewerPageWrapper({
  isLoading,
  error,
  hasImages,
  imagesCount,
  onClose,
  loadingComponent,
  errorTitle = 'Error',
  errorMessage,
  emptyTitle = 'No images',
  emptyMessage,
  backButtonText = 'Back',
  backButtonAction,
  children,
}: ImageViewerPageWrapperProps) {
  const router = useRouter();
  const handleBack = backButtonAction || onClose;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
        {loadingComponent || (
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center max-w-md mx-4">
          <svg
            className="mx-auto h-12 w-12 text-red-400 dark:text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
            {errorTitle}
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {errorMessage || error}
          </p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/feed')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Feed
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasImages || imagesCount === 0) {
    return (
      <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center max-w-md mx-4">
          <p className="text-gray-500 dark:text-gray-400">
            {emptyMessage || emptyTitle}
          </p>
          <div className="mt-6">
            <button
              onClick={handleBack}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {backButtonText}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

