/**
 * Disease Form Component
 * Form for adding or editing user disease information
 */

'use client';

import React, { useState, FormEvent } from 'react';
import { UserDiseaseCreate, UserDiseaseUpdate, UserDiseaseDetailed } from '@/lib/api/users';
import { Disease, DiseaseCategory, DiseaseStatus } from '@/lib/api/diseases';

interface DiseaseFormProps {
  // Mode
  mode: 'add' | 'edit';

  // Data
  diseases: Disease[];
  categories: DiseaseCategory[];
  statuses: DiseaseStatus[];
  initialData?: UserDiseaseDetailed;

  // Callbacks
  onSubmit: (data: UserDiseaseCreate | UserDiseaseUpdate) => Promise<void>;
  onCancel: () => void;

  // Search function for diseases
  onSearchDiseases?: (query: string) => Promise<Disease[]>;
}

export function DiseaseForm({
  mode,
  diseases,
  categories,
  statuses,
  initialData,
  onSubmit,
  onCancel,
  onSearchDiseases,
}: DiseaseFormProps) {
  // Form state
  const [formData, setFormData] = useState<UserDiseaseCreate | UserDiseaseUpdate>({
    disease_id: initialData?.disease_id,
    status_id: initialData?.status_id,
    diagnosis_date: initialData?.diagnosis_date,
    diagnosis_doctor: initialData?.diagnosis_doctor,
    diagnosis_hospital: initialData?.diagnosis_hospital,
    severity_level: initialData?.severity_level,
    symptoms: initialData?.symptoms,
    limitations: initialData?.limitations,
    medications: initialData?.medications,
    notes: initialData?.notes,
    is_public: initialData?.is_public ?? false,
    is_searchable: initialData?.is_searchable ?? true,
    is_active: mode === 'edit' ? initialData?.is_active ?? true : undefined,
  });

  // Show "Other" option
  const [isOther, setIsOther] = useState(false);
  const [otherDiseaseName, setOtherDiseaseName] = useState('');

  // Category selection state
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get disease name by ID
  const getDiseaseName = (diseaseId: number): string => {
    const disease = diseases.find((d) => d.id === diseaseId);
    const jaTranslation = disease?.translations?.find((t) => t.language_code === 'ja');
    return jaTranslation?.translated_name || disease?.name || `疾患 ID: ${diseaseId}`;
  };

  // Get status name by ID
  const getStatusName = (status: DiseaseStatus): string => {
    if (status.translations && status.translations.length > 0) {
      const jaTranslation = status.translations.find((t) => t.language_code === 'ja');
      if (jaTranslation) {
        return jaTranslation.translated_name;
      }
      return status.translations[0].translated_name;
    }
    return status.status_code;
  };

  // Get category name
  const getCategoryName = (categoryId: number): string => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return '';

    const jaTranslation = category.translations?.find((t) => t.language_code === 'ja');
    return jaTranslation?.translated_name || category.category_code;
  };

  // Group diseases by category
  const getDiseasesByCategory = () => {
    const grouped: { [key: number]: Disease[] } = {};

    diseases.forEach((disease) => {
      // Disease.category can be either a number (category_id) or an object with id
      let categoryId: number | null = null;

      if (typeof disease.category === 'number') {
        categoryId = disease.category;
      } else if (typeof disease.category === 'string') {
        categoryId = parseInt(disease.category, 10);
      } else if (typeof disease.category === 'object' && disease.category !== null) {
        categoryId = (disease.category as any).id || null;
      }

      if (categoryId && !isNaN(categoryId)) {
        if (!grouped[categoryId]) {
          grouped[categoryId] = [];
        }
        grouped[categoryId].push(disease);
      }
    });

    return grouped;
  };

  // Select category
  const selectCategory = (categoryId: number | 'other') => {
    if (categoryId === 'other') {
      setSelectedCategoryId(null);
      setIsOther(true);
      setFormData((prev) => ({ ...prev, disease_id: undefined }));
    } else {
      setSelectedCategoryId(categoryId);
      setIsOther(false);
      setOtherDiseaseName('');
      setFormData((prev) => ({ ...prev, disease_id: undefined }));
    }
  };

  // Select disease
  const selectDisease = (diseaseId: number) => {
    setFormData((prev) => ({ ...prev, disease_id: diseaseId }));
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
      const numValue = value ? parseInt(value, 10) : undefined;
      setFormData((prev) => ({ ...prev, [name]: numValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value || undefined }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (mode === 'add') {
      if (!isOther && !(formData as UserDiseaseCreate).disease_id) {
        setError('疾患を選択してください');
        return;
      }
      if (isOther && !otherDiseaseName.trim()) {
        setError('疾患名を入力してください');
        return;
      }
    }

    setSubmitting(true);
    try {
      // If "Other" is selected, add the other disease name to notes
      const submitData = { ...formData };
      if (isOther && otherDiseaseName) {
        submitData.notes = `その他の疾患: ${otherDiseaseName}${submitData.notes ? '\n' + submitData.notes : ''}`;
      }

      await onSubmit(submitData);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const diseasesByCategory = getDiseasesByCategory();
  const sortedCategories = [...categories]
    .filter((cat) => !cat.parent_category_id) // Only top-level categories
    .sort((a, b) => a.display_order - b.display_order);

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {mode === 'add' ? '疾患を追加' : '疾患情報を編集'}
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Disease Selection (Add mode only) */}
      {mode === 'add' && (
        <div className="mb-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">疾患選択</h3>

          {/* Step 1: Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              1. カテゴリを選択してください
            </label>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              {sortedCategories.map((category, categoryIndex) => {
                const isSelected = selectedCategoryId === category.id;
                const isLastCategory = categoryIndex === sortedCategories.length - 1;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => selectCategory(category.id)}
                    className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-blue-50 transition-colors ${
                      isSelected ? 'bg-blue-100 border-l-4 border-blue-600 font-semibold' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-gray-400 mr-3 select-none">
                          {isLastCategory ? '└─' : '├─'}
                        </span>
                        <span className="text-gray-900">
                          {getCategoryName(category.id)}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="text-blue-600">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* "Other" category option */}
              <button
                type="button"
                onClick={() => selectCategory('other')}
                className={`w-full text-left px-4 py-3 border-t-2 border-gray-300 hover:bg-blue-50 transition-colors ${
                  isOther ? 'bg-blue-100 border-l-4 border-blue-600 font-semibold' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-gray-400 mr-3 select-none">⑫</span>
                    <span className="text-gray-900">その他</span>
                  </div>
                  {isOther && (
                    <span className="text-blue-600">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: Disease Selection (only if category is selected) */}
          {selectedCategoryId && !isOther && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                2. 疾患を選択してください
              </label>
              <div className="border border-gray-300 rounded-lg max-h-80 overflow-y-auto">
                {(diseasesByCategory[selectedCategoryId] || []).map((disease) => {
                  const isSelected = (formData as UserDiseaseCreate).disease_id === disease.id;
                  const jaTranslation = disease.translations?.find(
                    (t) => t.language_code === 'ja'
                  );

                  return (
                    <button
                      key={disease.id}
                      type="button"
                      onClick={() => selectDisease(disease.id)}
                      className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-blue-50 transition-colors ${
                        isSelected ? 'bg-blue-100 border-l-4 border-blue-600 font-medium' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {jaTranslation?.translated_name || disease.name}
                          </div>
                          {disease.disease_code && (
                            <div className="text-xs text-gray-500 mt-1">
                              コード: {disease.disease_code}
                            </div>
                          )}
                          {jaTranslation?.details && (
                            <div className="text-sm text-gray-600 mt-1">
                              {jaTranslation.details}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <span className="ml-2 text-blue-600">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* "Other" disease name input */}
          {isOther && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                疾患名を入力 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={otherDiseaseName}
                onChange={(e) => setOtherDiseaseName(e.target.value)}
                placeholder="疾患名を入力してください"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={isOther}
              />
              <p className="mt-2 text-sm text-gray-600">
                ※ 入力された疾患名は備考欄に記録されます
              </p>
            </div>
          )}

          {/* Display selected disease */}
          {!isOther && (formData as UserDiseaseCreate).disease_id && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-700">
                選択された疾患: <span className="font-semibold">{getDiseaseName((formData as UserDiseaseCreate).disease_id)}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Diagnosis Information */}
      <div className="mb-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">診断情報</h3>

        <div className="grid grid-cols-2 gap-4">
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Severity Level */}
          <div>
            <label htmlFor="severity_level" className="block text-sm font-medium text-gray-700 mb-1">
              重症度レベル (1-5)
            </label>
            <select
              id="severity_level"
              name="severity_level"
              value={formData.severity_level || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">選択してください</option>
              <option value="1">1 - 軽度</option>
              <option value="2">2 - やや軽度</option>
              <option value="3">3 - 中程度</option>
              <option value="4">4 - やや重度</option>
              <option value="5">5 - 重度</option>
            </select>
          </div>

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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例: 山田太郎医師"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例: 東京医療センター"
            />
          </div>

          {/* Disease Status */}
          <div className="col-span-2">
            <label htmlFor="status_id" className="block text-sm font-medium text-gray-700 mb-1">
              疾患ステータス
            </label>
            <select
              id="status_id"
              name="status_id"
              value={formData.status_id || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">選択してください</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {getStatusName(status)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Clinical Information */}
      <div className="mb-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">症状・治療情報</h3>

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
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="現在の症状を記入してください"
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
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="日常生活での制限や注意事項"
          />
        </div>

        {/* Medications */}
        <div>
          <label htmlFor="medications" className="block text-sm font-medium text-gray-700 mb-1">
            服薬情報
          </label>
          <textarea
            id="medications"
            name="medications"
            value={formData.medications || ''}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="現在服用中の薬やサプリメント"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            備考
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="その他の情報"
          />
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">プライバシー設定</h3>

        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_public"
              checked={formData.is_public || false}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-3">
              <span className="font-medium text-gray-700">公開設定</span>
              <p className="text-sm text-gray-500">他のユーザーがこの疾患情報を閲覧できます</p>
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_searchable"
              checked={formData.is_searchable ?? true}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-3">
              <span className="font-medium text-gray-700">検索可能</span>
              <p className="text-sm text-gray-500">検索結果にこの疾患情報を表示します</p>
            </span>
          </label>

          {mode === 'edit' && (
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                checked={(formData as UserDiseaseUpdate).is_active ?? true}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-3">
                <span className="font-medium text-gray-700">アクティブ</span>
                <p className="text-sm text-gray-500">この疾患情報を有効にします</p>
              </span>
            </label>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '保存中...' : mode === 'add' ? '追加' : '更新'}
        </button>
      </div>
    </form>
  );
}
