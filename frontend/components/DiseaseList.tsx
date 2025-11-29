/**
 * Disease List Component
 * Displays a list of user's diseases with detailed information
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { UserDiseaseDetailed } from '@/lib/api/users';
import { DiseaseStatusBadge, SeverityBadge } from './DiseaseStatusBadge';

interface DiseaseListProps {
  diseases: UserDiseaseDetailed[];
  onEdit?: (disease: UserDiseaseDetailed) => void;
  onDelete?: (disease: UserDiseaseDetailed) => void;
  onViewDetail?: (disease: UserDiseaseDetailed) => void;
  loading?: boolean;
  editingDiseaseId?: number | null;
  editForm?: React.ReactNode;
  preferredLanguage?: string; // Deprecated: not used, locale is used instead for translation
}

export function DiseaseList({
  diseases,
  onEdit,
  onDelete,
  onViewDetail,
  loading = false,
  editingDiseaseId,
  editForm,
  preferredLanguage = 'ja', // Deprecated: not used, locale is used instead
}: DiseaseListProps) {
  const t = useTranslations('diseaseList');
  const locale = useLocale();
  
  // Get localized disease name based on current locale
  const getDiseaseName = (disease: UserDiseaseDetailed): string => {
    if (!disease.disease) {
      return `${t('diseaseId')}: ${disease.disease_id}`;
    }

    // Check if translations exist
    if (disease.disease.translations && disease.disease.translations.length > 0) {
      // Try to find exact language match using current locale
      const translation = disease.disease.translations.find(
        (t) => t.language_code === locale
      );

      if (translation) {
        return translation.translated_name;
      }

      // Fallback to Japanese
      const jaTranslation = disease.disease.translations.find((t) => t.language_code === 'ja');
      if (jaTranslation) {
        return jaTranslation.translated_name;
      }
    }

    // Final fallback to English name
    return disease.disease.name;
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const localeMap: Record<string, string> = {
      ja: 'ja-JP',
      en: 'en-US',
    };
    return new Date(dateString).toLocaleDateString(localeMap[locale] || 'ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8">
        <div className="flex justify-center items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-center text-gray-600 dark:text-gray-400 mt-4">{t('loading')}</p>
      </div>
    );
  }

  if (diseases.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
        <svg
          className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">{t('noDiseases')}</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t('noDiseasesMessage')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {diseases.map(disease => (
        <div
          key={disease.id}
          className="bg-white dark:bg-gray-800 shadow rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="p-6">
            {/* Header: Disease name and status */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {getDiseaseName(disease)}
                </h3>
                {disease.disease?.disease_code && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('code')}: {disease.disease?.disease_code}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {disease.status && (
                  <DiseaseStatusBadge statusCode={disease.status.status_code} size="md" />
                )}
                {disease.severity_level && (
                  <SeverityBadge level={disease.severity_level} size="sm" />
                )}
              </div>
            </div>

            {/* Diagnosis Information */}
            {(disease.diagnosis_date || disease.diagnosis_doctor || disease.diagnosis_hospital) && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('diagnosisInfo')}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {disease.diagnosis_date && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">{t('diagnosisDate')}:</span>{' '}
                      <span className="text-gray-900 dark:text-gray-100">{formatDate(disease.diagnosis_date)}</span>
                    </div>
                  )}
                  {disease.diagnosis_doctor && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">{t('doctor')}:</span>{' '}
                      <span className="text-gray-900 dark:text-gray-100">{disease.diagnosis_doctor}</span>
                    </div>
                  )}
                  {disease.diagnosis_hospital && (
                    <div className="col-span-2">
                      <span className="text-gray-600 dark:text-gray-400">{t('hospital')}:</span>{' '}
                      <span className="text-gray-900 dark:text-gray-100">{disease.diagnosis_hospital}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Symptoms */}
            {disease.symptoms && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('symptoms')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{disease.symptoms}</p>
              </div>
            )}

            {/* Limitations */}
            {disease.limitations && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('limitations')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{disease.limitations}</p>
              </div>
            )}

            {/* Medications */}
            {disease.medications && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('medications')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{disease.medications}</p>
              </div>
            )}

            {/* Course */}
            {disease.course && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('course')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{disease.course}</p>
              </div>
            )}

            {/* Notes */}
            {disease.notes && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('notes')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{disease.notes}</p>
              </div>
            )}

            {/* Privacy Badges */}
            <div className="flex items-center gap-2 mb-4">
              {disease.is_public ? (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                  {t('public')}
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                  {t('private')}
                </span>
              )}
              {disease.is_searchable ? (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  {t('searchable')}
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                  {t('notSearchable')}
                </span>
              )}
              {!disease.is_active && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                  {t('inactive')}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700">
              {onViewDetail && (
                <button
                  onClick={() => onViewDetail(disease)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                >
                  {t('detail')}
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(disease)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {editingDiseaseId === disease.id ? t('cancel') : t('edit')}
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(disease)}
                  className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                >
                  {t('delete')}
                </button>
              )}
            </div>
          </div>

          {/* Inline Edit Form */}
          {editingDiseaseId === disease.id && editForm && (
            <div className="border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">{editForm}</div>
          )}
        </div>
      ))}
    </div>
  );
}
