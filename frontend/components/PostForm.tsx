'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { createPost, updatePost, type CreatePostData, type UpdatePostData, type Post } from '@/lib/api/posts';
import { extractHashtags } from '@/lib/utils/hashtag';
import { extractMentions } from '@/lib/utils/mention';
import { uploadImage, uploadMultipleImages, validateImageFile, createImagePreview, type UploadImageResponse } from '@/lib/api/images';
import { debugLog } from '@/lib/utils/debug';
import { useDisease } from '@/contexts/DiseaseContext';

type VisibleMeasurement = 'blood_pressure_heart_rate' | 'weight_body_fat' | 'blood_glucose' | 'spo2' | 'temperature';

interface PostFormProps {
  onPostCreated?: () => void | Promise<void>;
  placeholder?: string;
  initialPostType?: 'regular' | 'health_record';
  initialHealthRecordType?: 'diary' | 'symptom' | 'vital' | 'meal' | 'medication' | 'exercise';
  hidePostTypeSelector?: boolean;
  hideHealthRecordTypeSelector?: boolean;
  visibleMeasurements?: VisibleMeasurement[]; // 表示する測定項目を指定（未指定の場合は全て表示）
  editingPost?: Post; // Post to edit (for edit mode)
}

export default function PostForm({
  onPostCreated,
  placeholder,
  initialPostType = 'regular',
  initialHealthRecordType,
  hidePostTypeSelector = false,
  hideHealthRecordTypeSelector = false,
  visibleMeasurements,
  editingPost,
}: PostFormProps) {
  const { getAccessTokenSilently } = useAuth0();
  const t = useTranslations('postForm');
  const locale = useLocale();
  const { userDiseases } = useDisease();
  
  // Initialize healthRecordData, converting recorded_at from ISO to datetime-local format if needed
  const initializeHealthRecordData = (): Record<string, any> => {
    if (!editingPost?.health_record_data) return {};
    const data = { ...editingPost.health_record_data };
    if (data.recorded_at && typeof data.recorded_at === 'string' && data.recorded_at.includes('T')) {
      // Convert ISO string to datetime-local format
      const date = new Date(data.recorded_at);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      data.recorded_at = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    return data;
  };
  
  const [postType, setPostType] = useState<'regular' | 'health_record'>(
    editingPost?.post_type || initialPostType
  );
  const [healthRecordType, setHealthRecordType] = useState<'diary' | 'symptom' | 'vital' | 'meal' | 'medication' | 'exercise' | null>(
    editingPost?.health_record_type || initialHealthRecordType || null
  );
  const [healthRecordData, setHealthRecordData] = useState<Record<string, any>>(initializeHealthRecordData());
  const [content, setContent] = useState(editingPost?.content || '');
  const [visibility, setVisibility] = useState<'public' | 'followers_only' | 'private'>(
    (editingPost?.visibility as 'public' | 'followers_only' | 'private') || 'public'
  );
  const [selectedDiseaseId, setSelectedDiseaseId] = useState<number | null>(
    editingPost?.user_disease?.id || null
  );
  const [imageUrls, setImageUrls] = useState<string[]>(
    editingPost?.images?.map(img => img.image_url) || []
  );
  const [imagePreviews, setImagePreviews] = useState<{ url: string; file?: File }[]>(
    editingPost?.images?.map(img => ({ url: img.image_url })) || []
  );
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract hashtags from content
  const detectedHashtags = useMemo(() => {
    return extractHashtags(content);
  }, [content]);

  // Extract mentions from content
  const detectedMentions = useMemo(() => {
    return extractMentions(content);
  }, [content]);

  // Set default recorded_at when vital or meal type is selected (only for new records)
  useEffect(() => {
    if (!editingPost && (healthRecordType === 'vital' || healthRecordType === 'meal')) {
      setHealthRecordData((prev) => {
        // Only set default if recorded_at is not already set
        if (prev.recorded_at) {
          return prev;
        }
        // Set current date/time as default (format: YYYY-MM-DDTHH:mm for datetime-local input)
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const defaultDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        return {
          ...prev,
          recorded_at: defaultDateTime,
        };
      });
    }
  }, [healthRecordType, editingPost]);

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files).slice(0, 10 - imageUrls.length);
    const validFiles: File[] = [];
    const previews: { url: string; file: File }[] = [];

    // Validate and create previews
    for (const file of newFiles) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        continue;
      }

      try {
        const previewUrl = await createImagePreview(file);
        validFiles.push(file);
        previews.push({ url: previewUrl, file });
      } catch (err) {
        debugLog.error('Failed to create preview:', err);
        setError('Failed to create preview for one or more images');
      }
    }

    if (validFiles.length === 0) return;

    // Update previews
    setImagePreviews([...imagePreviews, ...previews]);

    // Upload images
    setUploadingImages(true);
    setError(null);

    try {
      const accessToken = await getAccessTokenSilently();
      const uploadResponse = await uploadMultipleImages(validFiles, accessToken);

      if (uploadResponse.urls && uploadResponse.urls.length > 0) {
        // Update image URLs
        const newImageUrls = [...imageUrls, ...uploadResponse.urls];
        setImageUrls(newImageUrls);
        
        // Update previews with uploaded URLs
        const newPreviews = [...imagePreviews];
        uploadResponse.urls.forEach((url, index) => {
          const previewIndex = imagePreviews.length + index;
          if (newPreviews[previewIndex]) {
            newPreviews[previewIndex] = { url, file: validFiles[index] };
          } else {
            newPreviews.push({ url, file: validFiles[index] });
          }
        });
        setImagePreviews(newPreviews);
      }

      if (uploadResponse.errors && uploadResponse.errors.length > 0) {
        setError(uploadResponse.errors.join(', '));
      }
    } catch (err: any) {
      debugLog.error('Failed to upload images:', err);
      
      // Handle 503 error (GCS not configured)
      if (err.response?.status === 503) {
        setError(t('errors.uploadServiceNotConfigured'));
      } else {
        setError(err.response?.data?.detail || err.message || t('errors.uploadFailed'));
      }
      
      // Remove failed previews
      setImagePreviews(imagePreviews.slice(0, imagePreviews.length - validFiles.length));
    } finally {
      setUploadingImages(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove image
  const handleRemoveImage = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For health records, content is optional (stored in healthRecordData.notes instead)
    // For regular posts, content is required
    if (postType !== 'health_record') {
    if (!content.trim()) {
      setError(t('errors.contentRequired'));
      return;
    }

    if (content.length > 5000) {
      setError(t('errors.contentTooLong'));
      return;
      }
    }

    if (imageUrls.length > 10) {
      setError(t('errors.tooManyImages'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const accessToken = await getAccessTokenSilently();

      // Prepare health_record_data with ISO format for recorded_at
      let processedHealthRecordData = healthRecordData;
      if (postType === 'health_record' && healthRecordData.recorded_at) {
        // Convert datetime-local format (YYYY-MM-DDTHH:mm) to ISO string
        const recordedAt = healthRecordData.recorded_at;
        const isoDate = recordedAt.includes('T') && !recordedAt.includes('Z') && !recordedAt.includes('+')
          ? new Date(recordedAt).toISOString()
          : recordedAt;
        processedHealthRecordData = {
          ...healthRecordData,
          recorded_at: isoDate,
        };
      }

      // Validate vital record measurements
      if (postType === 'health_record' && healthRecordType === 'vital') {
        const measurements = processedHealthRecordData.measurements || {};
        
        // Check if at least one measurement is provided
        const hasBloodPressure = measurements.blood_pressure?.systolic || measurements.blood_pressure?.diastolic;
        const hasHeartRate = measurements.heart_rate?.value;
        const hasTemperature = measurements.temperature?.value;
        const hasWeight = measurements.weight?.value;
        const hasBodyFat = measurements.body_fat_percentage?.value;
        const hasBloodGlucose = measurements.blood_glucose?.value;
        const hasSpO2 = measurements.spo2?.value;
        
        const hasAnyMeasurement = hasBloodPressure || hasHeartRate || hasTemperature || hasWeight || hasBodyFat || hasBloodGlucose || hasSpO2;
        
        if (!hasAnyMeasurement) {
          setError(t('errors.vitalMeasurementRequired') || 'At least one measurement is required');
          setIsSubmitting(false);
          return;
        }
        
        // For blood_pressure_heart_rate group, check if at least one is provided
        if (visibleMeasurements?.includes('blood_pressure_heart_rate')) {
          if (!hasBloodPressure && !hasHeartRate) {
            setError(t('errors.bloodPressureOrHeartRateRequired') || 'Blood pressure or heart rate is required');
            setIsSubmitting(false);
            return;
          }
        }
      }

      const postData: CreatePostData = {
        // For health records, use notes from healthRecordData if content is empty
        // Otherwise use content (for regular posts or health records with content)
        // If both are empty, use a default message
        content: postType === 'health_record' && !content.trim() 
          ? (processedHealthRecordData.notes || t('healthRecord.vitalForm.defaultContent') || 'Health record')
          : content.trim(),
        visibility,
        // Don't include images for vital records
        image_urls: (postType === 'health_record' && healthRecordType === 'vital') 
          ? undefined 
          : (imageUrls.length > 0 ? imageUrls : undefined),
        user_disease_id: selectedDiseaseId || undefined,
        post_type: postType,
        health_record_type: postType === 'health_record' ? healthRecordType || undefined : undefined,
        health_record_data: postType === 'health_record' && Object.keys(processedHealthRecordData).length > 0 ? processedHealthRecordData : undefined,
      };

      // Debug log for vital records
      if (postType === 'health_record' && healthRecordType === 'vital') {
        debugLog.log(`[PostForm] ${editingPost ? 'Updating' : 'Creating'} vital record:`, {
          postData,
          processedHealthRecordData,
          measurements: processedHealthRecordData.measurements,
        });
      }

      // Use updatePost if editing, otherwise createPost
      if (editingPost) {
        const updateData: UpdatePostData = {
          content: postData.content,
          visibility: postData.visibility,
          image_urls: postData.image_urls,
          user_disease_id: postData.user_disease_id,
          post_type: postData.post_type,
          health_record_type: postData.health_record_type,
          health_record_data: postData.health_record_data,
        };
        await updatePost(editingPost.id, updateData, accessToken);
      } else {
        await createPost(postData, accessToken);
      }

      // Reset form
      setContent('');
      setPostType('regular');
      setHealthRecordType(null);
      setHealthRecordData({});
      setVisibility('public');
      setSelectedDiseaseId(null);
      setImageUrls([]);
      setImagePreviews([]);

      // Notify parent component (await if it's async)
      if (onPostCreated) {
        const result = onPostCreated();
        // Check if result is a Promise-like object
        if (result && typeof result === 'object' && 'then' in result && typeof (result as any).then === 'function') {
          await result;
        }
      }
    } catch (err: any) {
      debugLog.error('Failed to create post:', err);
      
      // Extract more detailed error message
      let errorMessage = t('errors.createFailed');
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.detail) {
        errorMessage = typeof err.response.data.detail === 'string' 
          ? err.response.data.detail 
          : JSON.stringify(err.response.data.detail);
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get localized disease name
  const getDiseaseName = (disease: typeof userDiseases[0]): string => {
    if (!disease.disease) {
      return `${t('diseaseId')}: ${disease.disease_id}`;
    }
    if (disease.disease.translations && disease.disease.translations.length > 0) {
      const translation = disease.disease.translations.find(
        (t) => t.language_code === locale
      );
      if (translation) {
        return translation.translated_name;
      }
      const jaTranslation = disease.disease.translations.find((t) => t.language_code === 'ja');
      if (jaTranslation) {
        return jaTranslation.translated_name;
      }
    }
    return disease.disease.name;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <form onSubmit={handleSubmit}>
        {/* Post type selector */}
        {!hidePostTypeSelector && (
          <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('postType.title')}
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="postType"
                  value="regular"
                  checked={postType === 'regular'}
                  onChange={(e) => {
                    setPostType('regular');
                    setHealthRecordType(null);
                    setHealthRecordData({});
                  }}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('postType.regular')}</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="postType"
                  value="health_record"
                  checked={postType === 'health_record'}
                  onChange={(e) => setPostType('health_record')}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('postType.healthRecord')}</span>
              </label>
            </div>
          </div>
        )}

        {/* Health record type selector */}
        {postType === 'health_record' && !hideHealthRecordTypeSelector && (
          <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('healthRecord.title')}
            </label>
            <div className="flex flex-wrap gap-2">
              {(['diary', 'symptom'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setHealthRecordType(type);
                    setHealthRecordData({});
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    healthRecordType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  disabled={isSubmitting}
                >
                  {t(`healthRecord.${type}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Health record forms */}
        {postType === 'health_record' && healthRecordType === 'diary' && (
          <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('healthRecord.diaryForm.mood')}
            </label>
            <div className="flex space-x-4 mb-4">
              {(['good', 'neutral', 'bad'] as const).map((mood) => (
                <label key={mood} className="flex items-center">
                  <input
                    type="radio"
                    name="mood"
                    value={mood}
                    checked={healthRecordData.mood === mood}
                    onChange={(e) => setHealthRecordData({ ...healthRecordData, mood: e.target.value })}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {mood === 'good' && '😊'} {mood === 'neutral' && '😐'} {mood === 'bad' && '😢'} {t(`healthRecord.diaryForm.mood${mood.charAt(0).toUpperCase() + mood.slice(1)}`)}
                  </span>
                </label>
              ))}
            </div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('healthRecord.diaryForm.notes')}
            </label>
            <textarea
              value={healthRecordData.notes || ''}
              onChange={(e) => setHealthRecordData({ ...healthRecordData, notes: e.target.value })}
              placeholder={t('healthRecord.diaryForm.notes')}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              rows={3}
              disabled={isSubmitting}
            />
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 mt-4">
              {t('healthRecord.diaryForm.tags')}
            </label>
            <input
              type="text"
              value={healthRecordData.tags ? (Array.isArray(healthRecordData.tags) ? healthRecordData.tags.join(', ') : healthRecordData.tags) : ''}
              onChange={(e) => {
                const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                setHealthRecordData({ ...healthRecordData, tags });
              }}
              placeholder="#体調良好 #外出"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              disabled={isSubmitting}
            />
          </div>
        )}

        {postType === 'health_record' && healthRecordType === 'symptom' && (
          <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('healthRecord.symptomForm.symptomName')}
            </label>
            <input
              type="text"
              value={healthRecordData.symptomName || ''}
              onChange={(e) => setHealthRecordData({ ...healthRecordData, symptomName: e.target.value })}
              placeholder={t('healthRecord.symptomForm.symptomName')}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 mb-4"
              disabled={isSubmitting}
            />
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('healthRecord.symptomForm.severity')}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={healthRecordData.severity || 5}
              onChange={(e) => setHealthRecordData({ ...healthRecordData, severity: parseInt(e.target.value) })}
              className="w-full mb-2"
              disabled={isSubmitting}
            />
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('healthRecord.symptomForm.severityLabel', { value: healthRecordData.severity || 5 })}
            </div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('healthRecord.symptomForm.duration')}
            </label>
            <input
              type="text"
              value={healthRecordData.duration || ''}
              onChange={(e) => setHealthRecordData({ ...healthRecordData, duration: e.target.value })}
              placeholder="2時間"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 mb-4"
              disabled={isSubmitting}
            />
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('healthRecord.symptomForm.location')}
            </label>
            <input
              type="text"
              value={healthRecordData.location || ''}
              onChange={(e) => setHealthRecordData({ ...healthRecordData, location: e.target.value })}
              placeholder="前頭部"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 mb-4"
              disabled={isSubmitting}
            />
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('healthRecord.symptomForm.notes')}
            </label>
            <textarea
              value={healthRecordData.notes || ''}
              onChange={(e) => setHealthRecordData({ ...healthRecordData, notes: e.target.value })}
              placeholder={t('healthRecord.symptomForm.notes')}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              rows={3}
              disabled={isSubmitting}
            />
          </div>
        )}

        {postType === 'health_record' && healthRecordType === 'vital' && (
          <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('healthRecord.vitalForm.recordedAt')}
            </label>
            <input
              type="datetime-local"
              value={healthRecordData.recorded_at || ''}
              onChange={(e) => setHealthRecordData({ ...healthRecordData, recorded_at: e.target.value })}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-4"
              disabled={isSubmitting}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* 血圧・心拍数 */}
              {(!visibleMeasurements || visibleMeasurements.includes('blood_pressure_heart_rate')) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('healthRecord.vitalForm.bloodPressure')}
                    </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={healthRecordData.measurements?.blood_pressure?.systolic || ''}
                    onChange={(e) => {
                      const measurements = healthRecordData.measurements || {};
                      setHealthRecordData({
                        ...healthRecordData,
                        measurements: {
                          ...measurements,
                          blood_pressure: {
                            ...measurements.blood_pressure,
                            systolic: e.target.value ? parseInt(e.target.value) : undefined,
                            unit: 'mmHg'
                          }
                        }
                      });
                    }}
                    placeholder="120"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isSubmitting}
                  />
                  <span className="text-gray-500 dark:text-gray-400">/</span>
                  <input
                    type="number"
                    value={healthRecordData.measurements?.blood_pressure?.diastolic || ''}
                    onChange={(e) => {
                      const measurements = healthRecordData.measurements || {};
                      setHealthRecordData({
                        ...healthRecordData,
                        measurements: {
                          ...measurements,
                          blood_pressure: {
                            ...measurements.blood_pressure,
                            diastolic: e.target.value ? parseInt(e.target.value) : undefined,
                            unit: 'mmHg'
                          }
                        }
                      });
                    }}
                    placeholder="80"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isSubmitting}
                  />
                  <span className="text-gray-500 dark:text-gray-400 text-sm">mmHg</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('healthRecord.vitalForm.heartRate')}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={healthRecordData.measurements?.heart_rate?.value || ''}
                    onChange={(e) => {
                      const measurements = healthRecordData.measurements || {};
                      setHealthRecordData({
                        ...healthRecordData,
                        measurements: {
                          ...measurements,
                          heart_rate: {
                            value: e.target.value ? parseInt(e.target.value) : undefined,
                            unit: 'bpm'
                          }
                        }
                      });
                    }}
                    placeholder="72"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isSubmitting}
                  />
                  <span className="text-gray-500 dark:text-gray-400 text-sm">bpm</span>
                </div>
              </div>
                </>
              )}
              {/* 体温 */}
              {(!visibleMeasurements || visibleMeasurements.includes('temperature')) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('healthRecord.vitalForm.temperature')}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.1"
                    value={healthRecordData.measurements?.temperature?.value || ''}
                    onChange={(e) => {
                      const measurements = healthRecordData.measurements || {};
                      setHealthRecordData({
                        ...healthRecordData,
                        measurements: {
                          ...measurements,
                          temperature: {
                            value: e.target.value ? parseFloat(e.target.value) : undefined,
                            unit: 'celsius'
                          }
                        }
                      });
                    }}
                    placeholder="36.5"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isSubmitting}
                  />
                  <span className="text-gray-500 dark:text-gray-400 text-sm">°C</span>
                </div>
              </div>
              )}
              {/* 体重・体脂肪率 */}
              {(!visibleMeasurements || visibleMeasurements.includes('weight_body_fat')) && (
                <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('healthRecord.vitalForm.weight')}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.1"
                    value={healthRecordData.measurements?.weight?.value || ''}
                    onChange={(e) => {
                      const measurements = healthRecordData.measurements || {};
                      setHealthRecordData({
                        ...healthRecordData,
                        measurements: {
                          ...measurements,
                          weight: {
                            value: e.target.value ? parseFloat(e.target.value) : undefined,
                            unit: 'kg'
                          }
                        }
                      });
                    }}
                    placeholder="65.0"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isSubmitting}
                  />
                  <span className="text-gray-500 dark:text-gray-400 text-sm">kg</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('healthRecord.vitalForm.bodyFatPercentage')}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.1"
                    value={healthRecordData.measurements?.body_fat_percentage?.value || ''}
                    onChange={(e) => {
                      const measurements = healthRecordData.measurements || {};
                      setHealthRecordData({
                        ...healthRecordData,
                        measurements: {
                          ...measurements,
                          body_fat_percentage: {
                            value: e.target.value ? parseFloat(e.target.value) : undefined,
                            unit: 'percent'
                          }
                        }
                      });
                    }}
                    placeholder="20.0"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isSubmitting}
                  />
                  <span className="text-gray-500 dark:text-gray-400 text-sm">%</span>
                </div>
              </div>
                </>
              )}
              {/* 血糖値 */}
              {(!visibleMeasurements || visibleMeasurements.includes('blood_glucose')) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('healthRecord.vitalForm.bloodGlucose')}
                </label>
                <div className="mb-2">
                  <select
                    value={healthRecordData.measurements?.blood_glucose?.timing || 'fasting'}
                    onChange={(e) => {
                      const measurements = healthRecordData.measurements || {};
                      setHealthRecordData({
                        ...healthRecordData,
                        measurements: {
                          ...measurements,
                          blood_glucose: {
                            ...measurements.blood_glucose,
                            timing: e.target.value,
                            unit: 'mg/dL'
                          }
                        }
                      });
                    }}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    disabled={isSubmitting}
                  >
                    <option value="fasting">{t('healthRecord.vitalForm.bloodGlucoseFasting')}</option>
                    <option value="postprandial">{t('healthRecord.vitalForm.bloodGlucosePostprandial')}</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={healthRecordData.measurements?.blood_glucose?.value || ''}
                    onChange={(e) => {
                      const measurements = healthRecordData.measurements || {};
                      setHealthRecordData({
                        ...healthRecordData,
                        measurements: {
                          ...measurements,
                          blood_glucose: {
                            ...measurements.blood_glucose,
                            value: e.target.value ? parseInt(e.target.value) : undefined,
                            unit: 'mg/dL'
                          }
                        }
                      });
                    }}
                    placeholder={healthRecordData.measurements?.blood_glucose?.timing === 'postprandial' ? '140' : '100'}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isSubmitting}
                  />
                  <span className="text-gray-500 dark:text-gray-400 text-sm">mg/dL</span>
                </div>
              </div>
              )}
              {/* 血中酸素濃度 */}
              {(!visibleMeasurements || visibleMeasurements.includes('spo2')) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('healthRecord.vitalForm.spo2')}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={healthRecordData.measurements?.spo2?.value || ''}
                    onChange={(e) => {
                      const measurements = healthRecordData.measurements || {};
                      setHealthRecordData({
                        ...healthRecordData,
                        measurements: {
                          ...measurements,
                          spo2: {
                            value: e.target.value ? parseInt(e.target.value) : undefined,
                            unit: 'percent'
                          }
                        }
                      });
                    }}
                    placeholder="98"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isSubmitting}
                  />
                  <span className="text-gray-500 dark:text-gray-400 text-sm">%</span>
                </div>
              </div>
              )}
            </div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('healthRecord.vitalForm.notes')}
            </label>
            <textarea
              value={healthRecordData.notes || ''}
              onChange={(e) => setHealthRecordData({ ...healthRecordData, notes: e.target.value })}
              placeholder={t('healthRecord.vitalForm.notes')}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              rows={3}
              disabled={isSubmitting}
            />
          </div>
        )}

        {postType === 'health_record' && healthRecordType === 'meal' && (
          <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('healthRecord.mealForm.mealType')}
            </label>
            <select
              value={healthRecordData.meal_type || ''}
              onChange={(e) => setHealthRecordData({ ...healthRecordData, meal_type: e.target.value })}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-4"
              disabled={isSubmitting}
            >
              <option value="">{t('healthRecord.mealForm.selectMealType')}</option>
              <option value="breakfast">{t('healthRecord.mealForm.breakfast')}</option>
              <option value="lunch">{t('healthRecord.mealForm.lunch')}</option>
              <option value="dinner">{t('healthRecord.mealForm.dinner')}</option>
              <option value="snack">{t('healthRecord.mealForm.snack')}</option>
            </select>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('healthRecord.mealForm.recordedAt')}
            </label>
            <input
              type="datetime-local"
              value={healthRecordData.recorded_at || ''}
              onChange={(e) => setHealthRecordData({ ...healthRecordData, recorded_at: e.target.value })}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-4"
              disabled={isSubmitting}
            />
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('healthRecord.mealForm.foods')}
            </label>
            <div className="mb-4 space-y-2">
              {(healthRecordData.foods || []).map((food: any, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={food.name || ''}
                    onChange={(e) => {
                      const foods = [...(healthRecordData.foods || [])];
                      foods[index] = { ...foods[index], name: e.target.value };
                      setHealthRecordData({ ...healthRecordData, foods });
                    }}
                    placeholder={t('healthRecord.mealForm.foodName')}
                    className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isSubmitting}
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={food.amount || ''}
                    onChange={(e) => {
                      const foods = [...(healthRecordData.foods || [])];
                      foods[index] = { ...foods[index], amount: e.target.value ? parseFloat(e.target.value) : undefined };
                      setHealthRecordData({ ...healthRecordData, foods });
                    }}
                    placeholder={t('healthRecord.mealForm.amount')}
                    className="w-24 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isSubmitting}
                  />
                  <input
                    type="text"
                    value={food.unit || ''}
                    onChange={(e) => {
                      const foods = [...(healthRecordData.foods || [])];
                      foods[index] = { ...foods[index], unit: e.target.value };
                      setHealthRecordData({ ...healthRecordData, foods });
                    }}
                    placeholder="g"
                    className="w-20 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const foods = [...(healthRecordData.foods || [])];
                      foods.splice(index, 1);
                      setHealthRecordData({ ...healthRecordData, foods });
                    }}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                    disabled={isSubmitting}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const foods = [...(healthRecordData.foods || []), { name: '', amount: undefined, unit: 'g' }];
                  setHealthRecordData({ ...healthRecordData, foods });
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={isSubmitting}
              >
                + {t('healthRecord.mealForm.addFood')}
              </button>
            </div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('healthRecord.mealForm.nutrition')}
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {t('healthRecord.mealForm.calories')}
                </label>
                <input
                  type="number"
                  value={healthRecordData.nutrition?.calories || ''}
                  onChange={(e) => {
                    const nutrition = healthRecordData.nutrition || {};
                    setHealthRecordData({
                      ...healthRecordData,
                      nutrition: { ...nutrition, calories: e.target.value ? parseInt(e.target.value) : undefined }
                    });
                  }}
                  placeholder="500"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {t('healthRecord.mealForm.protein')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={healthRecordData.nutrition?.protein || ''}
                  onChange={(e) => {
                    const nutrition = healthRecordData.nutrition || {};
                    setHealthRecordData({
                      ...healthRecordData,
                      nutrition: { ...nutrition, protein: e.target.value ? parseFloat(e.target.value) : undefined }
                    });
                  }}
                  placeholder="20"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {t('healthRecord.mealForm.carbs')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={healthRecordData.nutrition?.carbs || ''}
                  onChange={(e) => {
                    const nutrition = healthRecordData.nutrition || {};
                    setHealthRecordData({
                      ...healthRecordData,
                      nutrition: { ...nutrition, carbs: e.target.value ? parseFloat(e.target.value) : undefined }
                    });
                  }}
                  placeholder="60"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {t('healthRecord.mealForm.fat')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={healthRecordData.nutrition?.fat || ''}
                  onChange={(e) => {
                    const nutrition = healthRecordData.nutrition || {};
                    setHealthRecordData({
                      ...healthRecordData,
                      nutrition: { ...nutrition, fat: e.target.value ? parseFloat(e.target.value) : undefined }
                    });
                  }}
                  placeholder="15"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('healthRecord.mealForm.notes')}
            </label>
            <textarea
              value={healthRecordData.notes || ''}
              onChange={(e) => setHealthRecordData({ ...healthRecordData, notes: e.target.value })}
              placeholder={t('healthRecord.mealForm.notes')}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              rows={3}
              disabled={isSubmitting}
            />
          </div>
        )}

        {postType === 'health_record' && healthRecordType === 'meal' && (
          <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('healthRecord.mealForm.mealType')}
            </label>
            <select
              value={healthRecordData.meal_type || ''}
              onChange={(e) => setHealthRecordData({ ...healthRecordData, meal_type: e.target.value })}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-4"
              disabled={isSubmitting}
            >
              <option value="">{t('healthRecord.mealForm.selectMealType')}</option>
              <option value="breakfast">{t('healthRecord.mealForm.breakfast')}</option>
              <option value="lunch">{t('healthRecord.mealForm.lunch')}</option>
              <option value="dinner">{t('healthRecord.mealForm.dinner')}</option>
              <option value="snack">{t('healthRecord.mealForm.snack')}</option>
            </select>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('healthRecord.mealForm.recordedAt')}
            </label>
            <input
              type="datetime-local"
              value={healthRecordData.recorded_at || ''}
              onChange={(e) => setHealthRecordData({ ...healthRecordData, recorded_at: e.target.value })}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-4"
              disabled={isSubmitting}
            />
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('healthRecord.mealForm.foods')}
            </label>
            <div className="space-y-2 mb-4">
              {(healthRecordData.foods || []).map((food: any, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={food.name || ''}
                    onChange={(e) => {
                      const newFoods = [...(healthRecordData.foods || [])];
                      newFoods[index] = { ...newFoods[index], name: e.target.value };
                      setHealthRecordData({ ...healthRecordData, foods: newFoods });
                    }}
                    placeholder={t('healthRecord.mealForm.foodName')}
                    className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isSubmitting}
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={food.amount || ''}
                    onChange={(e) => {
                      const newFoods = [...(healthRecordData.foods || [])];
                      newFoods[index] = { ...newFoods[index], amount: e.target.value ? parseFloat(e.target.value) : undefined, unit: 'g' };
                      setHealthRecordData({ ...healthRecordData, foods: newFoods });
                    }}
                    placeholder={t('healthRecord.mealForm.amount')}
                    className="w-24 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">g</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newFoods = (healthRecordData.foods || []).filter((_: any, i: number) => i !== index);
                      setHealthRecordData({ ...healthRecordData, foods: newFoods });
                    }}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                    disabled={isSubmitting}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setHealthRecordData({
                    ...healthRecordData,
                    foods: [...(healthRecordData.foods || []), { name: '', amount: undefined, unit: 'g' }]
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={isSubmitting}
              >
                {t('healthRecord.mealForm.addFood')}
              </button>
            </div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('healthRecord.mealForm.nutrition')}
            </label>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {t('healthRecord.mealForm.calories')} (kcal)
                </label>
                <input
                  type="number"
                  value={healthRecordData.nutrition?.calories || ''}
                  onChange={(e) => setHealthRecordData({
                    ...healthRecordData,
                    nutrition: {
                      ...healthRecordData.nutrition,
                      calories: e.target.value ? parseFloat(e.target.value) : undefined
                    }
                  })}
                  placeholder="500"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {t('healthRecord.mealForm.protein')} (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={healthRecordData.nutrition?.protein || ''}
                  onChange={(e) => setHealthRecordData({
                    ...healthRecordData,
                    nutrition: {
                      ...healthRecordData.nutrition,
                      protein: e.target.value ? parseFloat(e.target.value) : undefined
                    }
                  })}
                  placeholder="20"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {t('healthRecord.mealForm.carbs')} (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={healthRecordData.nutrition?.carbs || ''}
                  onChange={(e) => setHealthRecordData({
                    ...healthRecordData,
                    nutrition: {
                      ...healthRecordData.nutrition,
                      carbs: e.target.value ? parseFloat(e.target.value) : undefined
                    }
                  })}
                  placeholder="60"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {t('healthRecord.mealForm.fat')} (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={healthRecordData.nutrition?.fat || ''}
                  onChange={(e) => setHealthRecordData({
                    ...healthRecordData,
                    nutrition: {
                      ...healthRecordData.nutrition,
                      fat: e.target.value ? parseFloat(e.target.value) : undefined
                    }
                  })}
                  placeholder="15"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('healthRecord.mealForm.notes')}
            </label>
            <textarea
              value={healthRecordData.notes || ''}
              onChange={(e) => setHealthRecordData({ ...healthRecordData, notes: e.target.value })}
              placeholder={t('healthRecord.mealForm.notes')}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              rows={3}
              disabled={isSubmitting}
            />
          </div>
        )}

        {/* Textarea for post content - Hide for health records (they use notes field instead) */}
        {!(postType === 'health_record') && (
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder || t('placeholder')}
            className="w-full p-3 pr-20 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            rows={4}
            maxLength={5000}
            disabled={isSubmitting}
          />
          {/* Character count in bottom right */}
          <div className="absolute bottom-2 right-2">
            <span
              className={`text-xs ${
                content.length > 4500 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {content.length} / 5000
            </span>
          </div>
        </div>
        )}

        {/* Detected hashtags */}
        {detectedHashtags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {t('detectedHashtags')}:
            </span>
            {detectedHashtags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Detected mentions */}
        {detectedMentions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {t('detectedMentions')}:
            </span>
            {detectedMentions.map((mention, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium"
              >
                @{mention}
              </span>
            ))}
          </div>
        )}

        {/* Images - Hide for vital records */}
        {!(postType === 'health_record' && healthRecordType === 'vital') && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('imagesLabel')} ({imageUrls.length}/10)
          </label>
          
          {/* Image previews */}
          {imagePreviews.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {imagePreviews.map((preview, index) => (
                <div
                  key={index}
                  className="relative inline-block group w-20 h-20"
                >
                  <Image
                    src={preview.url}
                    alt={`Image ${index + 1}`}
                    width={80}
                    height={80}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                  {uploadingImages && preview.file && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                      <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-600"
                    disabled={isSubmitting || uploadingImages}
                    title={t('removeImage')}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload options */}
          {imageUrls.length < 10 && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                multiple
                onChange={handleFileSelect}
                disabled={isSubmitting || uploadingImages || imageUrls.length >= 10}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className={`inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  isSubmitting || uploadingImages || imageUrls.length >= 10
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {uploadingImages ? (
                  <>
                    <div className="w-4 h-4 border-4 border-gray-600 dark:border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                    {t('uploading')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {t('uploadImage')}
                  </>
                )}
              </label>
            </div>
          )}
        </div>
        )}

        {/* Disease selector */}
        <div className="mt-4">
          <label htmlFor="disease-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('diseaseLabel')}
          </label>
          <select
            id="disease-select"
            value={selectedDiseaseId || ''}
            onChange={(e) => setSelectedDiseaseId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            disabled={isSubmitting}
          >
            <option value="">{t('diseaseNone')}</option>
            {userDiseases?.filter(d => d.is_active).map((disease) => (
              <option key={disease.id} value={disease.id}>
                {getDiseaseName(disease)}
              </option>
            ))}
          </select>
        </div>

        {/* Visibility selector and submit button */}
        <div className="flex flex-col space-y-4 mt-4">
          {/* Visibility description */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('visibilityLabel')}
            </label>
            <div className="space-y-2">
              <label className="flex items-start">
                <input
                  type="radio"
                  name="visibilityMode"
                  value="share"
                  checked={visibility !== 'private'}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setVisibility('public');
                    }
                  }}
                  className="mt-1 mr-2 text-blue-600 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('visibilityDescription.share')}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {t('visibilityDescription.shareDescription')}
                  </div>
                  {visibility !== 'private' && (
            <select
              value={visibility}
              onChange={(e) =>
                setVisibility(
                          e.target.value as 'public' | 'followers_only'
                )
              }
                      className="mt-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              disabled={isSubmitting}
            >
              <option value="public">{t('visibility.public')}</option>
              <option value="followers_only">{t('visibility.followersOnly')}</option>
            </select>
                  )}
                </div>
              </label>
              <label className="flex items-start">
                <input
                  type="radio"
                  name="visibilityMode"
                  value="private"
                  checked={visibility === 'private'}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setVisibility('private');
                    }
                  }}
                  className="mt-1 mr-2 text-blue-600 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('visibilityDescription.private')}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {t('visibilityDescription.privateDescription')}
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end">

          <button
            type="submit"
              disabled={
                isSubmitting || 
                (postType !== 'health_record' && !content.trim()) || 
                (postType === 'health_record' && !healthRecordType)
              }
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                isSubmitting || 
                (postType !== 'health_record' && !content.trim()) || 
                (postType === 'health_record' && !healthRecordType)
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? t('submitting') : t('submit')}
          </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </form>
    </div>
  );
}
