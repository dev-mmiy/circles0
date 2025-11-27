/**
 * Disease Form Component
 * Form for adding or editing user disease information
 */

'use client';

import React, { useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth0 } from '@auth0/auth0-react';
import { UserDiseaseCreate, UserDiseaseUpdate, UserDiseaseDetailed } from '@/lib/api/users';
import { Disease, DiseaseCategory, DiseaseStatus, createDisease } from '@/lib/api/diseases';
import { debugLog } from '@/lib/utils/debug';

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
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const t = useTranslations('diseaseForm');
  const tErrors = useTranslations('errors');
  
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
    const disease = diseases.find(d => d.id === diseaseId);
    const jaTranslation = disease?.translations?.find(t => t.language_code === 'ja');
    return jaTranslation?.translated_name || disease?.name || `${t('diseaseIdPrefix')} ${diseaseId}`;
  };

  // Get status name by ID
  const getStatusName = (status: DiseaseStatus): string => {
    if (status.translations && status.translations.length > 0) {
      const jaTranslation = status.translations.find(t => t.language_code === 'ja');
      if (jaTranslation) {
        return jaTranslation.translated_name;
      }
      return status.translations[0].translated_name;
    }
    return status.status_code;
  };

  // Get category name
  const getCategoryName = (categoryId: number): string => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return '';

    const jaTranslation = category.translations?.find(t => t.language_code === 'ja');
    return jaTranslation?.translated_name || category.category_code;
  };

  // Group diseases by category
  const getDiseasesByCategory = () => {
    const grouped: { [key: number]: Disease[] } = {};

    diseases.forEach(disease => {
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
      setFormData(prev => ({ ...prev, disease_id: undefined }));
    } else {
      setSelectedCategoryId(categoryId);
      setIsOther(false);
      setOtherDiseaseName('');
      setFormData(prev => ({ ...prev, disease_id: undefined }));
    }
  };

  // Select disease
  const selectDisease = (diseaseId: number) => {
    setFormData(prev => ({ ...prev, disease_id: diseaseId }));
  };

  // Handle form field changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      const numValue = value ? parseInt(value, 10) : undefined;
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value || undefined }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    setSubmitting(true);

    // Validation: Ensure required fields are provided
    if (mode === 'add') {
      if (!isOther && !(formData as UserDiseaseCreate).disease_id) {
        setError(t('errors.selectDisease'));
        setSubmitting(false);
        return;
      }
      if (isOther && !otherDiseaseName.trim()) {
        setError(t('errors.enterDiseaseName'));
        setSubmitting(false);
        return;
      }
    }
    try {
      let submitData = { ...formData };
      
      // Business Logic: Handle "Other" disease option
      // When a user selects "Other" and enters a custom disease name, we need to:
      // 1. Create a new disease entry in the backend database first
      // 2. Use the newly created disease's ID to associate it with the user
      // 3. Add the custom disease name to the notes field for reference
      //
      // This allows users to register diseases that aren't in the master disease list,
      // while maintaining data integrity by creating proper disease records.
      if (isOther && otherDiseaseName && mode === 'add') {
        // Authentication is required to create new diseases
        if (!isAuthenticated) {
          setError(tErrors('authenticationRequired'));
          setSubmitting(false);
          return;
        }
        
        try {
          // Step 1: Get access token for authenticated API call
          const accessToken = await getAccessTokenSilently();
          
          // Step 2: Create the new disease in the backend
          // This will create a new disease record with the user-provided name
          const newDisease = await createDisease(otherDiseaseName.trim(), accessToken);
          
          // Step 3: Use the newly created disease's ID for the user's disease association
          // In 'add' mode, submitData is UserDiseaseCreate which includes disease_id
          (submitData as UserDiseaseCreate).disease_id = newDisease.id;
          
          // Step 4: Add the custom disease name to notes for reference
          // This helps identify that this disease was created by the user
          // Format: "その他の疾患: [disease name]" (or "Other Disease: [disease name]" in English)
          submitData.notes = `${t('otherDiseasePrefix')} ${otherDiseaseName}${
            submitData.notes ? '\n' + submitData.notes : ''
          }`;
        } catch (createErr) {
          // If disease creation fails, show error and stop submission
          // This prevents partial data (user disease without disease record)
          debugLog.error('Error creating disease:', createErr);
          const errorMessage = createErr instanceof Error 
            ? createErr.message 
            : t('errors.createDiseaseFailed');
          setError(errorMessage);
          setSubmitting(false);
          return;
        }
      }

      await onSubmit(submitData);
    } catch (err) {
      debugLog.error('Error submitting form:', err);
      setError(err instanceof Error ? err.message : t('errors.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const diseasesByCategory = getDiseasesByCategory();
  const sortedCategories = [...categories]
    .filter(cat => !cat.parent_category_id) // Only top-level categories
    .sort((a, b) => a.display_order - b.display_order);

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
        {mode === 'add' ? t('title.add') : t('title.edit')}
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Disease Selection (Add mode only) */}
      {mode === 'add' && (
        <div className="mb-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">{t('sections.diseaseSelection')}</h3>

          {/* Step 1: Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('steps.selectCategory')}
            </label>
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              {sortedCategories.map((category, categoryIndex) => {
                const isSelected = selectedCategoryId === category.id;
                const isLastCategory = categoryIndex === sortedCategories.length - 1;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => selectCategory(category.id)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors ${
                      isSelected ? 'bg-blue-100 dark:bg-blue-900/50 border-l-4 border-blue-600 dark:border-blue-500 font-semibold' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-gray-400 dark:text-gray-500 mr-3 select-none">
                          {isLastCategory ? '└─' : '├─'}
                        </span>
                        <span className="text-gray-900 dark:text-gray-100">{getCategoryName(category.id)}</span>
                      </div>
                      {isSelected && (
                        <span className="text-blue-600 dark:text-blue-400">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
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
                className={`w-full text-left px-4 py-3 border-t-2 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors ${
                  isOther ? 'bg-blue-100 dark:bg-blue-900/50 border-l-4 border-blue-600 dark:border-blue-500 font-semibold' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-gray-400 dark:text-gray-500 mr-3 select-none">⑫</span>
                    <span className="text-gray-900 dark:text-gray-100">{t('options.other')}</span>
                  </div>
                  {isOther && (
                    <span className="text-blue-600 dark:text-blue-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('steps.selectDisease')}
              </label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-80 overflow-y-auto">
                {(diseasesByCategory[selectedCategoryId] || []).map(disease => {
                  const isSelected = (formData as UserDiseaseCreate).disease_id === disease.id;
                  const jaTranslation = disease.translations?.find(t => t.language_code === 'ja');

                  return (
                    <button
                      key={disease.id}
                      type="button"
                      onClick={() => selectDisease(disease.id)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors ${
                        isSelected ? 'bg-blue-100 dark:bg-blue-900/50 border-l-4 border-blue-600 dark:border-blue-500 font-medium' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {jaTranslation?.translated_name || disease.name}
                          </div>
                          {disease.disease_code && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {t('descriptions.code')} {disease.disease_code}
                            </div>
                          )}
                          {jaTranslation?.details && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {jaTranslation.details}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <span className="ml-2 text-blue-600 dark:text-blue-400">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
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
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('fields.diseaseName')} <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="text"
                value={otherDiseaseName}
                onChange={e => setOtherDiseaseName(e.target.value)}
                placeholder={t('placeholders.diseaseName')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                required={isOther}
              />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('descriptions.otherDiseaseNote')}</p>
            </div>
          )}

          {/* Display selected disease */}
          {!isOther && (formData as UserDiseaseCreate).disease_id && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t('fields.selectedDisease')}{' '}
                <span className="font-semibold">
                  {getDiseaseName((formData as UserDiseaseCreate).disease_id)}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Diagnosis Information */}
      <div className="mb-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">{t('sections.diagnosisInfo')}</h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Diagnosis Date */}
          <div>
            <label
              htmlFor="diagnosis_date"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('fields.diagnosisDate')}
            </label>
            <input
              type="date"
              id="diagnosis_date"
              name="diagnosis_date"
              value={formData.diagnosis_date || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Severity Level */}
          <div>
            <label
              htmlFor="severity_level"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('fields.severityLevel')}
            </label>
            <select
              id="severity_level"
              name="severity_level"
              value={formData.severity_level || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">{t('placeholders.select')}</option>
              <option value="1">{t('options.severity.1')}</option>
              <option value="2">{t('options.severity.2')}</option>
              <option value="3">{t('options.severity.3')}</option>
              <option value="4">{t('options.severity.4')}</option>
              <option value="5">{t('options.severity.5')}</option>
            </select>
          </div>

          {/* Diagnosis Doctor */}
          <div>
            <label
              htmlFor="diagnosis_doctor"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('fields.doctor')}
            </label>
            <input
              type="text"
              id="diagnosis_doctor"
              name="diagnosis_doctor"
              value={formData.diagnosis_doctor || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder={t('placeholders.doctor')}
            />
          </div>

          {/* Diagnosis Hospital */}
          <div>
            <label
              htmlFor="diagnosis_hospital"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('fields.hospital')}
            </label>
            <input
              type="text"
              id="diagnosis_hospital"
              name="diagnosis_hospital"
              value={formData.diagnosis_hospital || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder={t('placeholders.hospital')}
            />
          </div>

          {/* Disease Status */}
          <div className="col-span-2">
            <label htmlFor="status_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('fields.status')}
            </label>
            <select
              id="status_id"
              name="status_id"
              value={formData.status_id || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">{t('placeholders.select')}</option>
              {statuses.map(status => (
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
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">{t('sections.clinicalInfo')}</h3>

        {/* Symptoms */}
        <div>
          <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('fields.symptoms')}
          </label>
          <textarea
            id="symptoms"
            name="symptoms"
            value={formData.symptoms || ''}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            placeholder={t('placeholders.symptoms')}
          />
        </div>

        {/* Limitations */}
        <div>
          <label htmlFor="limitations" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('fields.limitations')}
          </label>
          <textarea
            id="limitations"
            name="limitations"
            value={formData.limitations || ''}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            placeholder={t('placeholders.limitations')}
          />
        </div>

        {/* Medications */}
        <div>
          <label htmlFor="medications" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('fields.medications')}
          </label>
          <textarea
            id="medications"
            name="medications"
            value={formData.medications || ''}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            placeholder={t('placeholders.medications')}
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('fields.notes')}
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            placeholder={t('placeholders.notes')}
          />
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">{t('sections.privacySettings')}</h3>

        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_public"
              checked={formData.is_public || false}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
            <span className="ml-3">
              <span className="font-medium text-gray-700 dark:text-gray-300">{t('fields.public')}</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('descriptions.publicDescription')}</p>
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_searchable"
              checked={formData.is_searchable ?? true}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
            <span className="ml-3">
              <span className="font-medium text-gray-700 dark:text-gray-300">{t('fields.searchable')}</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('descriptions.searchableDescription')}</p>
            </span>
          </label>

          {mode === 'edit' && (
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                checked={(formData as UserDiseaseUpdate).is_active ?? true}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 bg-white dark:bg-gray-700"
              />
              <span className="ml-3">
                <span className="font-medium text-gray-700 dark:text-gray-300">{t('fields.active')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('descriptions.activeDescription')}</p>
              </span>
            </label>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {t('buttons.cancel')}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? t('buttons.saving') : mode === 'add' ? t('buttons.add') : t('buttons.update')}
        </button>
      </div>
    </form>
  );
}
