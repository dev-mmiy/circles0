'use client';

import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Edit2, Trash2 } from 'lucide-react';
import { BloodPressureRecord } from '@/lib/api/bloodPressureRecords';
import { HeartRateRecord } from '@/lib/api/heartRateRecords';
import { deleteBloodPressureRecord } from '@/lib/api/bloodPressureRecords';
import { deleteHeartRateRecord } from '@/lib/api/heartRateRecords';
import BloodPressureHeartRateForm from './BloodPressureHeartRateForm';
import dynamic from 'next/dynamic';

const BloodPressureHeartRateFormModal = dynamic(() => import('./BloodPressureHeartRateFormModal'), {
  loading: () => null,
  ssr: false,
});

interface VitalRecordCardProps {
  bloodPressure?: BloodPressureRecord;
  heartRate?: HeartRateRecord;
  onRecordUpdated?: () => void;
  onRecordDeleted?: () => void;
}

export default function VitalRecordCard({
  bloodPressure,
  heartRate,
  onRecordUpdated,
  onRecordDeleted,
}: VitalRecordCardProps) {
  const { getAccessTokenSilently } = useAuth0();
  const t = useTranslations('postForm.healthRecord.vitalForm');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('この記録を削除してもよろしいですか？')) {
      return;
    }

    setIsDeleting(true);
    try {
      const accessToken = await getAccessTokenSilently();
      
      if (bloodPressure) {
        await deleteBloodPressureRecord(bloodPressure.id, accessToken);
      }
      if (heartRate) {
        await deleteHeartRateRecord(heartRate.id, accessToken);
      }

      if (onRecordDeleted) {
        onRecordDeleted();
      }
    } catch (error) {
      console.error('Failed to delete record:', error);
      alert('記録の削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleRecordUpdated = () => {
    setIsEditModalOpen(false);
    if (onRecordUpdated) {
      onRecordUpdated();
    }
  };

  const recordedAt = bloodPressure?.recorded_at || heartRate?.recorded_at;
  const displayDate = recordedAt ? format(new Date(recordedAt), 'yyyy年MM月dd日 HH:mm', { locale: ja }) : '';

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {displayDate}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleEdit}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              aria-label="編集"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
              aria-label="削除"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {bloodPressure && (
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('bloodPressure')}:
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-100 font-semibold">
                {bloodPressure.systolic} / {bloodPressure.diastolic} mmHg
              </span>
            </div>
          )}

          {heartRate && (
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('heartRate')}:
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-100 font-semibold">
                {heartRate.bpm} bpm
              </span>
            </div>
          )}

          {(bloodPressure?.notes || heartRate?.notes) && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {bloodPressure?.notes || heartRate?.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {isEditModalOpen && (
        <BloodPressureHeartRateFormModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onRecordCreated={handleRecordUpdated}
          editingBloodPressure={bloodPressure}
          editingHeartRate={heartRate}
        />
      )}
    </>
  );
}

