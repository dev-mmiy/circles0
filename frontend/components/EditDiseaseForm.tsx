/**
 * Edit Disease Form Component (Inline version)
 * Inline form for editing existing disease information
 */

'use client';

import React, { useState } from 'react';
import { UserDiseaseDetailed, UserDiseaseUpdate } from '@/lib/api/users';
import { DiseaseStatus } from '@/lib/api/diseases';

interface EditDiseaseFormProps {
  userDisease: UserDiseaseDetailed;
  statuses: DiseaseStatus[];
  onSave: (userDiseaseId: number, data: UserDiseaseUpdate) => Promise<void>;
  onCancel: () => void;
}

export function EditDiseaseForm({
  userDisease,
  statuses,
  onSave,
  onCancel,
}: EditDiseaseFormProps) {
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
    } catch (err) {
      console.error('Failed to update disease:', err);
      setError(err instanceof Error ? err.message : 'Failed to update disease');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          疾患情報を編集: <span className="text-blue-600">{getDiseaseName()}</span>
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Status Selection */}
        <div>
          <label htmlFor="status_id" className="block text-sm font-medium text-gray-700 mb-1">
            ステータス
          </label>
          <select
            id="status_id"
            name="status_id"
            value={formData.status_id || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
          <label htmlFor="diagnosis_date" className="block text-sm font-medium text-gray-700 mb-1">
            診断日
          </label>
          <input
            type="date"
            id="diagnosis_date"
            name="diagnosis_date"
            value={formData.diagnosis_date || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Two columns for Doctor and Hospital */}
        <div className="grid grid-cols-2 gap-4">
          {/* Diagnosis Doctor */}
          <div>
            <label htmlFor="diagnosis_doctor" className="block text-sm font-medium text-gray-700 mb-1">
              担当医
            </label>
            <input
              type="text"
              id="diagnosis_doctor"
              name="diagnosis_doctor"
              value={formData.diagnosis_doctor || ''}
              onChange={handleChange}
              placeholder="例: 山田太郎"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              maxLength={200}
            />
          </div>

          {/* Diagnosis Hospital */}
          <div>
            <label htmlFor="diagnosis_hospital" className="block text-sm font-medium text-gray-700 mb-1">
              医療機関
            </label>
            <input
              type="text"
              id="diagnosis_hospital"
              name="diagnosis_hospital"
              value={formData.diagnosis_hospital || ''}
              onChange={handleChange}
              placeholder="例: 東京大学病院"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              maxLength={200}
            />
          </div>
        </div>

        {/* Severity Level */}
        <div>
          <label htmlFor="severity_level" className="block text-sm font-medium text-gray-700 mb-1">
            重症度（1〜5）
          </label>
          <div className="flex items-center space-x-3">
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
            <span className="text-base font-semibold text-gray-700 w-6 text-center">
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
          <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700 mb-1">
            症状
          </label>
          <textarea
            id="symptoms"
            name="symptoms"
            value={formData.symptoms || ''}
            onChange={handleChange}
            placeholder="症状を詳しく記載してください"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
          />
        </div>

        {/* Limitations */}
        <div>
          <label htmlFor="limitations" className="block text-sm font-medium text-gray-700 mb-1">
            制限事項
          </label>
          <textarea
            id="limitations"
            name="limitations"
            value={formData.limitations || ''}
            onChange={handleChange}
            placeholder="日常生活での制限事項を記載してください"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
          />
        </div>

        {/* Medications */}
        <div>
          <label htmlFor="medications" className="block text-sm font-medium text-gray-700 mb-1">
            服用薬
          </label>
          <textarea
            id="medications"
            name="medications"
            value={formData.medications || ''}
            onChange={handleChange}
            placeholder="服用中の薬を記載してください"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            メモ
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            placeholder="その他のメモ"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
          />
        </div>

        {/* Privacy Settings */}
        <div className="space-y-2 p-3 bg-white rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700">公開設定</h4>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_public"
              checked={formData.is_public ?? false}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">この疾患を公開する</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
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
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {submitting ? '保存中...' : '更新'}
          </button>
        </div>
      </form>
    </div>
  );
}
