'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

// Dynamically import PostForm to reduce initial bundle size
const PostForm = dynamic(() => import('@/components/PostForm'), {
  loading: () => (
    <div className="p-6">
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
      </div>
    </div>
  ),
  ssr: false,
});

interface PostFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void | Promise<void>;
  initialPostType?: 'regular' | 'health_record';
  initialHealthRecordType?: 'diary' | 'symptom' | 'vital' | 'meal' | 'medication' | 'exercise';
}

export default function PostFormModal({
  isOpen,
  onClose,
  onPostCreated,
  initialPostType = 'regular',
  initialHealthRecordType,
}: PostFormModalProps) {
  const t = useTranslations('postForm');
  const tDaily = useTranslations('daily');

  const handlePostCreated = async () => {
    if (onPostCreated) {
      await onPostCreated();
    }
    onClose();
  };

  // Get modal title based on health record type
  const getModalTitle = () => {
    if (initialPostType === 'health_record' && initialHealthRecordType) {
      if (initialHealthRecordType === 'vital') {
        return tDaily('addVital');
      } else if (initialHealthRecordType === 'meal') {
        return tDaily('addMeal');
      }
    }
    return t('title') || 'Create Post';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
          <div
            className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {getModalTitle()}
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Close"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* PostForm */}
            <div className="p-4 sm:p-6">
              <PostForm
                onPostCreated={handlePostCreated}
                placeholder={
                  initialPostType === 'health_record' && initialHealthRecordType === 'vital'
                    ? tDaily('vitalPlaceholder') || t('placeholder')
                    : initialPostType === 'health_record' && initialHealthRecordType === 'meal'
                    ? tDaily('mealPlaceholder') || t('placeholder')
                    : t('placeholder')
                }
                initialPostType={initialPostType}
                initialHealthRecordType={initialHealthRecordType}
                hidePostTypeSelector={initialPostType === 'health_record'}
                hideHealthRecordTypeSelector={initialPostType === 'health_record' && !!initialHealthRecordType}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

