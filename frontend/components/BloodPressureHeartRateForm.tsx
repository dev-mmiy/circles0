'use client';

import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslations } from 'next-intl';
import { createBloodPressureRecord, updateBloodPressureRecord, type BloodPressureRecord, type CreateBloodPressureRecordData, type UpdateBloodPressureRecordData } from '@/lib/api/bloodPressureRecords';
import { createHeartRateRecord, updateHeartRateRecord, type HeartRateRecord, type CreateHeartRateRecordData, type UpdateHeartRateRecordData } from '@/lib/api/heartRateRecords';
import { debugLog } from '@/lib/debugLog';

interface BloodPressureHeartRateFormProps {
  onRecordCreated?: () => void | Promise<void>;
  editingBloodPressure?: BloodPressureRecord | null;
  editingHeartRate?: HeartRateRecord | null;
}

export default function BloodPressureHeartRateForm({
  onRecordCreated,
  editingBloodPressure,
  editingHeartRate,
}: BloodPressureHeartRateFormProps) {
  const { getAccessTokenSilently } = useAuth0();
  const t = useTranslations('postForm.healthRecord.vitalForm');
  const tDaily = useTranslations('daily');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data
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
    editingBloodPressure?.recorded_at 
      ? convertISOToLocal(editingBloodPressure.recorded_at)
      : editingHeartRate?.recorded_at
      ? convertISOToLocal(editingHeartRate.recorded_at)
      : getDefaultDateTime()
  );
  const [systolic, setSystolic] = useState<string>(editingBloodPressure?.systolic?.toString() || '');
  const [diastolic, setDiastolic] = useState<string>(editingBloodPressure?.diastolic?.toString() || '');
  const [heartRate, setHeartRate] = useState<string>(editingHeartRate?.bpm?.toString() || '');
  const [notes, setNotes] = useState<string>(editingBloodPressure?.notes || editingHeartRate?.notes || '');
  const [visibility, setVisibility] = useState<'public' | 'followers_only' | 'private'>(
    (editingBloodPressure?.visibility || editingHeartRate?.visibility || 'public') as 'public' | 'followers_only' | 'private'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const accessToken = await getAccessTokenSilently();

      // Convert datetime-local to ISO string
      const recordedAtISO = new Date(recordedAt).toISOString();

      // Create or update blood pressure record if systolic or diastolic is provided
      if (systolic || diastolic) {
        if (!systolic || !diastolic) {
          setError('収縮期血圧と拡張期血圧の両方を入力してください');
          setIsSubmitting(false);
          return;
        }

        const bpData: CreateBloodPressureRecordData | UpdateBloodPressureRecordData = {
          recorded_at: recordedAtISO,
          systolic: parseInt(systolic),
          diastolic: parseInt(diastolic),
          visibility,
          notes: notes || undefined,
        };

        if (editingBloodPressure) {
          await updateBloodPressureRecord(editingBloodPressure.id, bpData as UpdateBloodPressureRecordData, accessToken);
        } else {
          await createBloodPressureRecord(bpData as CreateBloodPressureRecordData, accessToken);
        }
      }

      // Create or update heart rate record if heart rate is provided
      if (heartRate) {
        const hrData: CreateHeartRateRecordData | UpdateHeartRateRecordData = {
          recorded_at: recordedAtISO,
          bpm: parseInt(heartRate),
          visibility,
          notes: notes || undefined,
        };

        if (editingHeartRate) {
          await updateHeartRateRecord(editingHeartRate.id, hrData as UpdateHeartRateRecordData, accessToken);
        } else {
          await createHeartRateRecord(hrData as CreateHeartRateRecordData, accessToken);
        }
      }

      // Check if at least one record was created/updated
      if (!systolic && !diastolic && !heartRate) {
        setError('血圧または心拍数のいずれかを入力してください');
        setIsSubmitting(false);
        return;
      }

      // Reset form
      setRecordedAt(getDefaultDateTime());
      setSystolic('');
      setDiastolic('');
      setHeartRate('');
      setNotes('');
      setVisibility('public');

      // Notify parent component
      if (onRecordCreated) {
        const result = onRecordCreated();
        if (result && typeof result === 'object' && 'then' in result) {
          await result;
        }
      }
    } catch (err: any) {
      debugLog.error('Failed to create/update vital record:', err);
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

      {/* Recorded At */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('recordedAt')}
        </label>
        <input
          type="datetime-local"
          value={recordedAt}
          onChange={(e) => setRecordedAt(e.target.value)}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          required
          disabled={isSubmitting}
        />
      </div>

      {/* Blood Pressure */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('bloodPressure')}
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={systolic}
            onChange={(e) => setSystolic(e.target.value)}
            placeholder="120"
            min="0"
            max="300"
            className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            disabled={isSubmitting}
          />
          <span className="text-gray-500 dark:text-gray-400">/</span>
          <input
            type="number"
            value={diastolic}
            onChange={(e) => setDiastolic(e.target.value)}
            placeholder="80"
            min="0"
            max="300"
            className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            disabled={isSubmitting}
          />
          <span className="text-gray-500 dark:text-gray-400 text-sm">mmHg</span>
        </div>
      </div>

      {/* Heart Rate */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('heartRate')}
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={heartRate}
            onChange={(e) => setHeartRate(e.target.value)}
            placeholder="72"
            min="0"
            max="300"
            className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            disabled={isSubmitting}
          />
          <span className="text-gray-500 dark:text-gray-400 text-sm">bpm</span>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('notes')}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('notes')}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          rows={3}
          disabled={isSubmitting}
        />
      </div>

      {/* Visibility */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          公開設定
        </label>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as 'public' | 'followers_only' | 'private')}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          disabled={isSubmitting}
        >
          <option value="public">公開</option>
          <option value="followers_only">フォロワーのみ</option>
          <option value="private">非公開</option>
        </select>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-3">
        <button
          type="submit"
          disabled={isSubmitting || (!systolic && !diastolic && !heartRate)}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            isSubmitting || (!systolic && !diastolic && !heartRate)
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? '保存中...' : editingBloodPressure || editingHeartRate ? '更新' : '記録'}
        </button>
      </div>
    </form>
  );
}

