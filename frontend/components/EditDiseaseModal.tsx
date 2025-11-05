/**
 * Edit Disease Modal Component
 * Modal for editing existing disease information
 */

'use client';

import React, { useState } from 'react';
import { UserDiseaseDetailed, UserDiseaseUpdate } from '@/lib/api/users';
import { DiseaseStatus } from '@/lib/api/diseases';

interface EditDiseaseModalProps {
  userDisease: UserDiseaseDetailed;
  statuses: DiseaseStatus[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (userDiseaseId: number, data: UserDiseaseUpdate) => Promise<void>;
}

export function EditDiseaseModal({
  userDisease,
  statuses,
  isOpen,
  onClose,
  onSave,
}: EditDiseaseModalProps) {
  // Form state
  const [formData, setFormData] = useState<UserDiseaseUpdate>({
    status_id: userDisease.status_id,
    diagnosis_date: userDisease.diagnosis_date,
    diagnosis_doctor: userDisease.diagnosis_doctor,
    diagnosis_hospital: userDisease.diagnosis_hospital,
    severity_level: userDisease.severity_level,
    symptoms: userDisease.symptoms,
    limitations: userDisease.limitations,
    medications: userDisease.medications,
    notes: userDisease.notes,
    is_public: userDisease.is_public,
    is_searchable: userDisease.is_searchable,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get disease name
  const getDiseaseName = (): string => {
    if (!userDisease.disease) return 'Unknown Disease';
    const jaTranslation = userDisease.disease.translations?.find(
      (t: any) => t.language_code === 'ja'
    );
    return jaTranslation?.translated_name || userDisease.disease.name;
  };

  // Get status name by ID
  const getStatusName = (statusId: number): string => {
    const status = statuses.find((s) => s.id === statusId);
    if (!status) return 'Unknown';
    const jaTranslation = status.translations?.find((t) => t.language_code === 'ja');
    return jaTranslation?.translated_name || status.status_code;
  };

  // Handle form field changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: value ? parseInt(value, 10) : undefined }));
    } else if (name === 'status_id') {
      setFormData((prev) => ({ ...prev, [name]: value ? parseInt(value, 10) : undefined }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value || undefined }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await onSave(userDisease.id, formData);
      onClose();
    } catch (err) {
      console.error('Failed to update disease:', err);
      setError(err instanceof Error ? err.message : 'Failed to update disease');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900">疾患情報の編集</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={submitting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="text-lg font-semibold text-blue-600">
            {getDiseaseName()}
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Status Selection */}
          <div>
            <label htmlFor="status_id" className="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <select
              id="status_id"
              name="status_id"
              value={formData.status_id || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">選択してください</option>
              {statuses
                .sort((a, b) => a.display_order - b.display_order)
                .map((status) => (
                  <option key={status.id} value={status.id}>
                    {getStatusName(status.id)}
                  </option>
                ))}
            </select>
          </div>

          {/* Diagnosis Date */}
          <div>
            <label htmlFor="diagnosis_date" className="block text-sm font-medium text-gray-700 mb-2">
              診断日
            </label>
            <input
              type="date"
              id="diagnosis_date"
              name="diagnosis_date"
              value={formData.diagnosis_date || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Diagnosis Doctor */}
          <div>
            <label
              htmlFor="diagnosis_doctor"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              診断医師
            </label>
            <input
              type="text"
              id="diagnosis_doctor"
              name="diagnosis_doctor"
              value={formData.diagnosis_doctor || ''}
              onChange={handleChange}
              placeholder="例: 山田太郎"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={200}
            />
          </div>

          {/* Diagnosis Hospital */}
          <div>
            <label
              htmlFor="diagnosis_hospital"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              診断病院
            </label>
            <input
              type="text"
              id="diagnosis_hospital"
              name="diagnosis_hospital"
              value={formData.diagnosis_hospital || ''}
              onChange={handleChange}
              placeholder="例: 東京大学病院"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={200}
            />
          </div>

          {/* Severity Level */}
          <div>
            <label htmlFor="severity_level" className="block text-sm font-medium text-gray-700 mb-2">
              重症度（1〜5）
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                id="severity_level"
                name="severity_level"
                min="1"
                max="5"
                value={formData.severity_level || 3}
                onChange={handleChange}
                className="flex-1"
              />
              <span className="text-lg font-semibold text-gray-700 w-8 text-center">
                {formData.severity_level || 3}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>軽度</span>
              <span>重度</span>
            </div>
          </div>

          {/* Symptoms */}
          <div>
            <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700 mb-2">
              症状
            </label>
            <textarea
              id="symptoms"
              name="symptoms"
              value={formData.symptoms || ''}
              onChange={handleChange}
              placeholder="症状を詳しく記載してください"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Limitations */}
          <div>
            <label htmlFor="limitations" className="block text-sm font-medium text-gray-700 mb-2">
              制限事項
            </label>
            <textarea
              id="limitations"
              name="limitations"
              value={formData.limitations || ''}
              onChange={handleChange}
              placeholder="日常生活での制限事項を記載してください"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Medications */}
          <div>
            <label htmlFor="medications" className="block text-sm font-medium text-gray-700 mb-2">
              服用薬
            </label>
            <textarea
              id="medications"
              name="medications"
              value={formData.medications || ''}
              onChange={handleChange}
              placeholder="服用中の薬を記載してください"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              メモ
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              placeholder="その他のメモ"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Privacy Settings */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-700">公開設定</h4>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_public"
                checked={formData.is_public ?? false}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">この疾患を公開する</span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_searchable"
                checked={formData.is_searchable ?? true}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">検索可能にする</span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '保存中...' : '更新'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
