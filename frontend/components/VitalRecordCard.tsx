'use client';

import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Edit2, Trash2 } from 'lucide-react';
import { BloodPressureRecord } from '@/lib/api/bloodPressureRecords';
import { HeartRateRecord } from '@/lib/api/heartRateRecords';
import { TemperatureRecord } from '@/lib/api/temperatureRecords';
import { WeightRecord } from '@/lib/api/weightRecords';
import { BodyFatRecord } from '@/lib/api/bodyFatRecords';
import { BloodGlucoseRecord } from '@/lib/api/bloodGlucoseRecords';
import { SpO2Record } from '@/lib/api/spo2Records';
import { deleteBloodPressureRecord } from '@/lib/api/bloodPressureRecords';
import { deleteHeartRateRecord } from '@/lib/api/heartRateRecords';
import { deleteTemperatureRecord } from '@/lib/api/temperatureRecords';
import { deleteWeightRecord } from '@/lib/api/weightRecords';
import { deleteBodyFatRecord } from '@/lib/api/bodyFatRecords';
import { deleteBloodGlucoseRecord } from '@/lib/api/bloodGlucoseRecords';
import { deleteSpO2Record } from '@/lib/api/spo2Records';
import dynamic from 'next/dynamic';

const BloodPressureHeartRateFormModal = dynamic(() => import('./BloodPressureHeartRateFormModal'), {
  loading: () => null,
  ssr: false,
});
const TemperatureFormModal = dynamic(() => import('./TemperatureFormModal'), {
  loading: () => null,
  ssr: false,
});
const WeightBodyFatFormModal = dynamic(() => import('./WeightBodyFatFormModal'), {
  loading: () => null,
  ssr: false,
});
const BloodGlucoseFormModal = dynamic(() => import('./BloodGlucoseFormModal'), {
  loading: () => null,
  ssr: false,
});
const SpO2FormModal = dynamic(() => import('./SpO2FormModal'), {
  loading: () => null,
  ssr: false,
});

interface VitalRecordCardProps {
  bloodPressure?: BloodPressureRecord;
  heartRate?: HeartRateRecord;
  temperature?: TemperatureRecord;
  weight?: WeightRecord;
  bodyFat?: BodyFatRecord;
  bloodGlucose?: BloodGlucoseRecord;
  spo2?: SpO2Record;
  onRecordUpdated?: () => void;
  onRecordDeleted?: () => void;
}

export default function VitalRecordCard({
  bloodPressure,
  heartRate,
  temperature,
  weight,
  bodyFat,
  bloodGlucose,
  spo2,
  onRecordUpdated,
  onRecordDeleted,
}: VitalRecordCardProps) {
  const { getAccessTokenSilently } = useAuth0();
  const t = useTranslations('postForm.healthRecord.vitalForm');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalType, setEditModalType] = useState<'bp_hr' | 'temp' | 'weight_fat' | 'bg' | 'spo2' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('この記録を削除してもよろしいですか？')) {
      return;
    }

    setIsDeleting(true);
    try {
      const accessToken = await getAccessTokenSilently();
      
      const deletePromises: Promise<void>[] = [];
      if (bloodPressure) {
        deletePromises.push(deleteBloodPressureRecord(bloodPressure.id, accessToken));
      }
      if (heartRate) {
        deletePromises.push(deleteHeartRateRecord(heartRate.id, accessToken));
      }
      if (temperature) {
        deletePromises.push(deleteTemperatureRecord(temperature.id, accessToken));
      }
      if (weight) {
        deletePromises.push(deleteWeightRecord(weight.id, accessToken));
      }
      if (bodyFat) {
        deletePromises.push(deleteBodyFatRecord(bodyFat.id, accessToken));
      }
      if (bloodGlucose) {
        deletePromises.push(deleteBloodGlucoseRecord(bloodGlucose.id, accessToken));
      }
      if (spo2) {
        deletePromises.push(deleteSpO2Record(spo2.id, accessToken));
      }

      await Promise.all(deletePromises);

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
    // Determine which modal to open based on available records
    if (bloodPressure || heartRate) {
      setEditModalType('bp_hr');
    } else if (temperature) {
      setEditModalType('temp');
    } else if (weight || bodyFat) {
      setEditModalType('weight_fat');
    } else if (bloodGlucose) {
      setEditModalType('bg');
    } else if (spo2) {
      setEditModalType('spo2');
    }
    setIsEditModalOpen(true);
  };

  const handleRecordUpdated = () => {
    setIsEditModalOpen(false);
    setEditModalType(null);
    if (onRecordUpdated) {
      onRecordUpdated();
    }
  };

  const recordedAt = bloodPressure?.recorded_at || heartRate?.recorded_at || temperature?.recorded_at || 
                      weight?.recorded_at || bodyFat?.recorded_at || bloodGlucose?.recorded_at || spo2?.recorded_at;
  const displayDate = recordedAt ? format(new Date(recordedAt), 'yyyy年MM月dd日 HH:mm', { locale: ja }) : '';
  
  const allNotes = [
    bloodPressure?.notes,
    heartRate?.notes,
    temperature?.notes,
    weight?.notes,
    bodyFat?.notes,
    bloodGlucose?.notes,
    spo2?.notes,
  ].filter(Boolean);

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

          {temperature && (
            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('temperature')}:
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-100 font-semibold">
                {temperature.value} {temperature.unit === 'celsius' ? '°C' : '°F'}
              </span>
            </div>
          )}

          {weight && (
            <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('weight')}:
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-100 font-semibold">
                {weight.value} {weight.unit}
              </span>
            </div>
          )}

          {bodyFat && (
            <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('bodyFatPercentage')}:
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-100 font-semibold">
                {bodyFat.percentage}%
              </span>
            </div>
          )}

          {bloodGlucose && (
            <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('bloodGlucose')}:
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-100 font-semibold">
                {bloodGlucose.value} mg/dL {bloodGlucose.timing && `(${bloodGlucose.timing === 'fasting' ? t('bloodGlucoseFasting') : t('bloodGlucosePostprandial')})`}
              </span>
            </div>
          )}

          {spo2 && (
            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('spo2')}:
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-100 font-semibold">
                {spo2.percentage}%
              </span>
            </div>
          )}

          {allNotes.length > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {allNotes.join(' / ')}
              </p>
            </div>
          )}
        </div>
      </div>

      {isEditModalOpen && editModalType === 'bp_hr' && (
        <BloodPressureHeartRateFormModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditModalType(null);
          }}
          onRecordCreated={handleRecordUpdated}
          editingBloodPressure={bloodPressure}
          editingHeartRate={heartRate}
        />
      )}
      {isEditModalOpen && editModalType === 'temp' && (
        <TemperatureFormModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditModalType(null);
          }}
          onRecordCreated={handleRecordUpdated}
          editingRecord={temperature}
        />
      )}
      {isEditModalOpen && editModalType === 'weight_fat' && (
        <WeightBodyFatFormModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditModalType(null);
          }}
          onRecordCreated={handleRecordUpdated}
          editingWeight={weight}
          editingBodyFat={bodyFat}
        />
      )}
      {isEditModalOpen && editModalType === 'bg' && (
        <BloodGlucoseFormModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditModalType(null);
          }}
          onRecordCreated={handleRecordUpdated}
          editingRecord={bloodGlucose}
        />
      )}
      {isEditModalOpen && editModalType === 'spo2' && (
        <SpO2FormModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditModalType(null);
          }}
          onRecordCreated={handleRecordUpdated}
          editingRecord={spo2}
        />
      )}
    </>
  );
}

