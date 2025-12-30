'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import type { Post } from '@/lib/api/posts';

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

type VisibleMeasurement = 'blood_pressure_heart_rate' | 'weight_body_fat' | 'blood_glucose' | 'spo2' | 'temperature';

interface PostFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void | Promise<void>;
  initialPostType?: 'regular' | 'health_record';
  initialHealthRecordType?: 'diary' | 'symptom' | 'vital' | 'meal' | 'medication' | 'exercise';
  visibleMeasurements?: VisibleMeasurement[];
  editingPost?: Post; // Post to edit (for edit mode)
}

export default function PostFormModal({
  isOpen,
  onClose,
  onPostCreated,
  initialPostType = 'regular',
  initialHealthRecordType,
  visibleMeasurements,
  editingPost,
}: PostFormModalProps) {
  const t = useTranslations('postForm');
  const tDaily = useTranslations('daily');

  const handlePostCreated = async () => {
    if (onPostCreated) {
      await onPostCreated();
    }
    onClose();
  };

  // Infer visibleMeasurements from existing data when editing
  const inferVisibleMeasurements = (): VisibleMeasurement[] | undefined => {
    if (!editingPost || editingPost.post_type !== 'health_record' || editingPost.health_record_type !== 'vital') {
      return visibleMeasurements;
    }

    const measurements = editingPost.health_record_data?.measurements || {};
    const inferred: VisibleMeasurement[] = [];

    if (measurements.blood_pressure || measurements.heart_rate) {
      inferred.push('blood_pressure_heart_rate');
    }
    if (measurements.weight || measurements.body_fat_percentage) {
      inferred.push('weight_body_fat');
    }
    if (measurements.blood_glucose) {
      inferred.push('blood_glucose');
    }
    if (measurements.spo2) {
      inferred.push('spo2');
    }
    if (measurements.temperature) {
      inferred.push('temperature');
    }

    return inferred.length > 0 ? inferred : undefined;
  };

  // Get modal title based on health record type
  const getModalTitle = () => {
    if (editingPost) {
      // Edit mode
      if (editingPost.post_type === 'health_record' && editingPost.health_record_type === 'vital') {
        return tDaily('editVital') || 'Edit Vital Record';
      } else if (editingPost.post_type === 'health_record' && editingPost.health_record_type === 'meal') {
        return tDaily('editMeal') || 'Edit Meal Record';
      }
      return t('editTitle') || 'Edit Post';
    }
    
    // Create mode
    if (initialPostType === 'health_record' && initialHealthRecordType) {
      if (initialHealthRecordType === 'vital') {
        // Show specific title based on visible measurements
        if (visibleMeasurements && visibleMeasurements.length === 1) {
          const measurement = visibleMeasurements[0];
          switch (measurement) {
            case 'blood_pressure_heart_rate':
              return tDaily('addBloodPressureHeartRate');
            case 'weight_body_fat':
              return tDaily('addWeightBodyFat');
            case 'blood_glucose':
              return tDaily('addBloodGlucose');
            case 'spo2':
              return tDaily('addSpO2');
            case 'temperature':
              return tDaily('addTemperature');
            default:
              return tDaily('addVital');
          }
        }
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
                initialPostType={editingPost?.post_type || initialPostType}
                initialHealthRecordType={editingPost?.health_record_type || initialHealthRecordType}
                hidePostTypeSelector={initialPostType === 'health_record' || editingPost?.post_type === 'health_record'}
                hideHealthRecordTypeSelector={(initialPostType === 'health_record' && !!initialHealthRecordType) || editingPost?.post_type === 'health_record'}
                visibleMeasurements={editingPost ? inferVisibleMeasurements() : visibleMeasurements}
                editingPost={editingPost}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

