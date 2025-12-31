'use client';

import { WeightRecord } from '@/lib/api/weightRecords';
import { BodyFatRecord } from '@/lib/api/bodyFatRecords';
import WeightBodyFatForm from './WeightBodyFatForm';
import { useTranslations } from 'next-intl';

interface WeightBodyFatFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordCreated?: () => void | Promise<void>;
  editingWeight?: WeightRecord | null;
  editingBodyFat?: BodyFatRecord | null;
}

export default function WeightBodyFatFormModal({
  isOpen,
  onClose,
  onRecordCreated,
  editingWeight,
  editingBodyFat,
}: WeightBodyFatFormModalProps) {
  const tDaily = useTranslations('daily');

  const handleRecordCreated = async () => {
    if (onRecordCreated) {
      await onRecordCreated();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
          <div
            className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {editingWeight || editingBodyFat
                  ? tDaily('editVital') || 'バイタルを編集'
                  : tDaily('addWeightBodyFat') || '体重・体脂肪率を記録'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Close"
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
            <div className="p-4 sm:p-6">
              <WeightBodyFatForm
                onRecordCreated={handleRecordCreated}
                editingWeight={editingWeight}
                editingBodyFat={editingBodyFat}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
