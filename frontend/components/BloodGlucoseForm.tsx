'use client';

import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslations } from 'next-intl';
import { createBloodGlucoseRecord, updateBloodGlucoseRecord, type BloodGlucoseRecord, type CreateBloodGlucoseRecordData, type UpdateBloodGlucoseRecordData } from '@/lib/api/bloodGlucoseRecords';
import { debugLog } from '@/lib/utils/debug';

interface BloodGlucoseFormProps {
  onRecordCreated?: () => void | Promise<void>;
  editingRecord?: BloodGlucoseRecord | null;
}

export default function BloodGlucoseForm({
  onRecordCreated,
  editingRecord,
}: BloodGlucoseFormProps) {
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
    editingRecord?.recorded_at ? convertISOToLocal(editingRecord.recorded_at) : getDefaultDateTime()
  );
  const [value, setValue] = useState<string>(editingRecord?.value?.toString() || '');
  const [timing, setTiming] = useState<'fasting' | 'postprandial' | ''>(editingRecord?.timing || '');
  const [notes, setNotes] = useState<string>(editingRecord?.notes || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const accessToken = await getAccessTokenSilently();
      const recordedAtISO = new Date(recordedAt).toISOString();

      if (!value) {
        setError('血糖値を入力してください');
        setIsSubmitting(false);
        return;
      }

      const data: CreateBloodGlucoseRecordData | UpdateBloodGlucoseRecordData = {
        recorded_at: recordedAtISO,
        value: parseInt(value),
        timing: timing || undefined,
        visibility: 'private',
        notes: notes || undefined,
      };

      if (editingRecord) {
        await updateBloodGlucoseRecord(editingRecord.id, data as UpdateBloodGlucoseRecordData, accessToken);
      } else {
        await createBloodGlucoseRecord(data as CreateBloodGlucoseRecordData, accessToken);
      }

      // Reset form
      setRecordedAt(getDefaultDateTime());
      setValue('');
      setTiming('');
      setNotes('');

      if (onRecordCreated) {
        const result = onRecordCreated();
        if (result && typeof result === 'object' && 'then' in result) {
          await result;
        }
      }
    } catch (err: any) {
      debugLog.error('Failed to create/update blood glucose record:', err);
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
          onChange={(e) => setRecordedAt(e.target.value)}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          required
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('bloodGlucose')}
        </label>
        <div className="mb-2">
          <select
            value={timing}
            onChange={(e) => setTiming(e.target.value as 'fasting' | 'postprandial' | '')}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            disabled={isSubmitting}
          >
            <option value="">選択してください</option>
            <option value="fasting">{t('bloodGlucoseFasting')}</option>
            <option value="postprandial">{t('bloodGlucosePostprandial')}</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={timing === 'fasting' ? '100' : '140'}
            min="0"
            max="1000"
            className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
            disabled={isSubmitting}
          />
          <span className="text-gray-500 dark:text-gray-400 text-sm">mg/dL</span>
        </div>
      </div>

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

      <div className="flex justify-end space-x-3">
        <button
          type="submit"
          disabled={isSubmitting || !value}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            isSubmitting || !value
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? '保存中...' : editingRecord ? '更新' : '記録'}
        </button>
      </div>
    </form>
  );
}

