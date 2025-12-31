'use client';

import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslations } from 'next-intl';
import {
  createWeightRecord,
  updateWeightRecord,
  type WeightRecord,
  type CreateWeightRecordData,
  type UpdateWeightRecordData,
} from '@/lib/api/weightRecords';
import {
  createBodyFatRecord,
  updateBodyFatRecord,
  type BodyFatRecord,
  type CreateBodyFatRecordData,
  type UpdateBodyFatRecordData,
} from '@/lib/api/bodyFatRecords';
import { debugLog } from '@/lib/utils/debug';

interface WeightBodyFatFormProps {
  onRecordCreated?: () => void | Promise<void>;
  editingWeight?: WeightRecord | null;
  editingBodyFat?: BodyFatRecord | null;
}

export default function WeightBodyFatForm({
  onRecordCreated,
  editingWeight,
  editingBodyFat,
}: WeightBodyFatFormProps) {
  const { getAccessTokenSilently } = useAuth0();
  const t = useTranslations('postForm.healthRecord.vitalForm');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDefaultDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const convertISOToLocal = (isoString: string) => {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [recordedAt, setRecordedAt] = useState<string>(
    editingWeight?.recorded_at
      ? convertISOToLocal(editingWeight.recorded_at)
      : editingBodyFat?.recorded_at
      ? convertISOToLocal(editingBodyFat.recorded_at)
      : getDefaultDateTime()
  );
  const [weight, setWeight] = useState<string>(editingWeight?.value?.toString() || '');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>(editingWeight?.unit || 'kg');
  const [bodyFat, setBodyFat] = useState<string>(editingBodyFat?.percentage?.toString() || '');
  const [notes, setNotes] = useState<string>(editingWeight?.notes || editingBodyFat?.notes || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const accessToken = await getAccessTokenSilently();
      const recordedAtISO = new Date(recordedAt).toISOString();

      // Create or update weight record if weight is provided
      if (weight) {
        const weightData: CreateWeightRecordData | UpdateWeightRecordData = {
          recorded_at: recordedAtISO,
          value: parseFloat(weight),
          unit: weightUnit,
          visibility: 'private',
          notes: notes || undefined,
        };

        if (editingWeight) {
          await updateWeightRecord(
            editingWeight.id,
            weightData as UpdateWeightRecordData,
            accessToken
          );
        } else {
          await createWeightRecord(weightData as CreateWeightRecordData, accessToken);
        }
      }

      // Create or update body fat record if body fat is provided
      if (bodyFat) {
        const bodyFatData: CreateBodyFatRecordData | UpdateBodyFatRecordData = {
          recorded_at: recordedAtISO,
          percentage: parseFloat(bodyFat),
          visibility: 'private',
          notes: notes || undefined,
        };

        if (editingBodyFat) {
          await updateBodyFatRecord(
            editingBodyFat.id,
            bodyFatData as UpdateBodyFatRecordData,
            accessToken
          );
        } else {
          await createBodyFatRecord(bodyFatData as CreateBodyFatRecordData, accessToken);
        }
      }

      // Check if at least one record was created/updated
      if (!weight && !bodyFat) {
        setError('体重または体脂肪率のいずれかを入力してください');
        setIsSubmitting(false);
        return;
      }

      // Reset form
      setRecordedAt(getDefaultDateTime());
      setWeight('');
      setWeightUnit('kg');
      setBodyFat('');
      setNotes('');

      if (onRecordCreated) {
        const result = onRecordCreated();
        if (result && typeof result === 'object' && 'then' in result) {
          await result;
        }
      }
    } catch (err: any) {
      debugLog.error('Failed to create/update weight/body fat record:', err);
      setError(err.message || '記録の保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('recordedAt')}
        </label>
        <input
          type="datetime-local"
          value={recordedAt}
          onChange={e => setRecordedAt(e.target.value)}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          required
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('weight')}
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            placeholder="65.0"
            min="0"
            max="500"
            step="0.1"
            className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            disabled={isSubmitting}
          />
          <select
            value={weightUnit}
            onChange={e => setWeightUnit(e.target.value as 'kg' | 'lb')}
            className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            disabled={isSubmitting}
          >
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('bodyFatPercentage')}
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={bodyFat}
            onChange={e => setBodyFat(e.target.value)}
            placeholder="20.0"
            min="0"
            max="100"
            step="0.1"
            className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            disabled={isSubmitting}
          />
          <span className="text-gray-500 dark:text-gray-400 text-sm">%</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('notes')}
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={t('notes')}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          rows={3}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="submit"
          disabled={isSubmitting || (!weight && !bodyFat)}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            isSubmitting || (!weight && !bodyFat)
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? '保存中...' : editingWeight || editingBodyFat ? '更新' : '記録'}
        </button>
      </div>
    </form>
  );
}
