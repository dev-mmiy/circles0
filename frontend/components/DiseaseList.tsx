/**
 * Disease List Component
 * Displays a list of user's diseases with detailed information
 */

'use client';

import React from 'react';
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
}

export function DiseaseList({
  diseases,
  onEdit,
  onDelete,
  onViewDetail,
  loading = false,
  editingDiseaseId,
  editForm,
}: DiseaseListProps) {
  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-8">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
        <p className="text-center text-gray-600 mt-4">読み込み中...</p>
      </div>
    );
  }

  if (diseases.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <svg
          className="mx-auto h-16 w-16 text-gray-400"
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
        <h3 className="mt-4 text-lg font-medium text-gray-900">疾患が登録されていません</h3>
        <p className="mt-2 text-sm text-gray-600">
          疾患を追加して、コミュニティとつながりましょう。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {diseases.map((disease) => (
        <div
          key={disease.id}
          className="bg-white shadow rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="p-6">
            {/* Header: Disease name and status */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">
                  {disease.disease?.name || `疾患 ID: ${disease.disease_id}`}
                </h3>
                {disease.disease?.disease_code && (
                  <p className="text-sm text-gray-500 mt-1">
                    コード: {disease.disease?.disease_code}
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
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">診断情報</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {disease.diagnosis_date && (
                    <div>
                      <span className="text-gray-600">診断日:</span>{' '}
                      <span className="text-gray-900">{formatDate(disease.diagnosis_date)}</span>
                    </div>
                  )}
                  {disease.diagnosis_doctor && (
                    <div>
                      <span className="text-gray-600">担当医:</span>{' '}
                      <span className="text-gray-900">{disease.diagnosis_doctor}</span>
                    </div>
                  )}
                  {disease.diagnosis_hospital && (
                    <div className="col-span-2">
                      <span className="text-gray-600">医療機関:</span>{' '}
                      <span className="text-gray-900">{disease.diagnosis_hospital}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Symptoms */}
            {disease.symptoms && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">症状</h4>
                <p className="text-sm text-gray-600">{disease.symptoms}</p>
              </div>
            )}

            {/* Limitations */}
            {disease.limitations && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">制限事項</h4>
                <p className="text-sm text-gray-600">{disease.limitations}</p>
              </div>
            )}

            {/* Medications */}
            {disease.medications && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">服薬情報</h4>
                <p className="text-sm text-gray-600">{disease.medications}</p>
              </div>
            )}

            {/* Notes */}
            {disease.notes && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">備考</h4>
                <p className="text-sm text-gray-600">{disease.notes}</p>
              </div>
            )}

            {/* Privacy Badges */}
            <div className="flex items-center gap-2 mb-4">
              {disease.is_public ? (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                  公開
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  非公開
                </span>
              )}
              {disease.is_searchable ? (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  検索可能
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  検索不可
                </span>
              )}
              {!disease.is_active && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                  無効
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              {onViewDetail && (
                <button
                  onClick={() => onViewDetail(disease)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  詳細
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(disease)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {editingDiseaseId === disease.id ? 'キャンセル' : '編集'}
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(disease)}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  削除
                </button>
              )}
            </div>
          </div>

          {/* Inline Edit Form */}
          {editingDiseaseId === disease.id && editForm && (
            <div className="border-t bg-gray-50">
              {editForm}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
