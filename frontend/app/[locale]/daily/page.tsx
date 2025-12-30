'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslations } from 'next-intl';
import Header from '@/components/Header';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { getBloodPressureRecords, type BloodPressureRecord } from '@/lib/api/bloodPressureRecords';
import { getHeartRateRecords, type HeartRateRecord } from '@/lib/api/heartRateRecords';
import { useUser } from '@/contexts/UserContext';
import { useDataLoader } from '@/lib/hooks/useDataLoader';
import { Calendar, List, Plus } from 'lucide-react';
import BloodPressureHeartRateFormModal from '@/components/BloodPressureHeartRateFormModal';
import VitalRecordCard from '@/components/VitalRecordCard';

type ViewMode = 'calendar' | 'list';

interface VitalRecordGroup {
  recordedAt: string;
  bloodPressure?: BloodPressureRecord;
  heartRate?: HeartRateRecord;
}

export default function DailyPage() {
  const { isAuthenticated, isLoading: authLoading, getAccessTokenSilently } = useAuth0();
  const { user } = useUser();
  const t = useTranslations('daily');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  // Load blood pressure records
  const {
    items: bloodPressureRecords = [],
    isLoading: isLoadingBP,
    refresh: refreshBP,
  } = useDataLoader<BloodPressureRecord>({
    loadFn: useCallback(async (skip, limit) => {
      if (!isAuthenticated || !user) {
        throw new Error('Authentication required');
      }
      const token = await getAccessTokenSilently();
      const items = await getBloodPressureRecords(skip, limit, token);
      return { items };
    }, [isAuthenticated, user, getAccessTokenSilently]),
    limit: 100, // Load more records to group by time
    autoLoad: false,
  });

  // Load heart rate records
  const {
    items: heartRateRecords = [],
    isLoading: isLoadingHR,
    refresh: refreshHR,
  } = useDataLoader<HeartRateRecord>({
    loadFn: useCallback(async (skip, limit) => {
      if (!isAuthenticated || !user) {
        throw new Error('Authentication required');
      }
      const token = await getAccessTokenSilently();
      const items = await getHeartRateRecords(skip, limit, token);
      return { items };
    }, [isAuthenticated, user, getAccessTokenSilently]),
    limit: 100, // Load more records to group by time
    autoLoad: false,
  });

  // Group records by recorded_at (same timestamp = same session)
  const groupedRecords = useMemo(() => {
    const groups: Map<string, VitalRecordGroup> = new Map();

    // Add blood pressure records
    bloodPressureRecords.forEach((record) => {
      const key = record.recorded_at;
      if (!groups.has(key)) {
        groups.set(key, { recordedAt: key });
      }
      groups.get(key)!.bloodPressure = record;
    });

    // Add heart rate records
    heartRateRecords.forEach((record) => {
      const key = record.recorded_at;
      if (!groups.has(key)) {
        groups.set(key, { recordedAt: key });
      }
      groups.get(key)!.heartRate = record;
    });

    // Sort by recorded_at descending
    return Array.from(groups.values()).sort((a, b) => 
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
  }, [bloodPressureRecords, heartRateRecords]);

  const isLoading = isLoadingBP || isLoadingHR;
  const records = groupedRecords;

  // Load records when component mounts
  useEffect(() => {
    if (isAuthenticated && user && !authLoading) {
      // Load both blood pressure and heart rate records
      const loadAll = async () => {
        try {
          await Promise.all([
            refreshBP(),
            refreshHR(),
          ]);
        } catch (error) {
          console.error('[DailyPage] Failed to load records:', error);
        }
      };
      loadAll();
    }
  }, [isAuthenticated, user, authLoading, refreshBP, refreshHR]);

  // Handle form submission
  const handleRecordCreated = useCallback(async () => {
    setIsFormModalOpen(false);
    // Wait a bit for modal to close, then refresh
    setTimeout(async () => {
      if (isAuthenticated && user && !authLoading) {
        try {
          await Promise.all([refreshBP(), refreshHR()]);
        } catch (error) {
          console.warn('[DailyPage] Refresh failed:', error);
        }
      }
    }, 300);
  }, [refreshBP, refreshHR, isAuthenticated, user, authLoading]);

  // Open form modal
  const openFormModal = () => {
    setIsFormModalOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">{t('authRequired')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{t('subtitleVital')}</p>
        </div>

        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <List className="w-4 h-4" />
                <span>{t('viewMode.list')}</span>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>{t('viewMode.calendar')}</span>
              </button>
            </div>

            {/* Add Record Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={openFormModal}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{t('addBloodPressureHeartRate')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {(isLoadingBP || isLoadingHR) && records.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Content */}
        {viewMode === 'list' ? (
          <div className="space-y-4">
            {records.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">{t('noRecords')}</p>
              </div>
            ) : (
              <>
                {records.map((group, index) => (
                  <VitalRecordCard
                    key={`${group.recordedAt}-${index}`}
                    bloodPressure={group.bloodPressure}
                    heartRate={group.heartRate}
                    onRecordUpdated={handleRecordCreated}
                    onRecordDeleted={handleRecordCreated}
                  />
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">{t('calendarComingSoon')}</p>
          </div>
        )}

        {/* Form Modal */}
        {isFormModalOpen && (
          <BloodPressureHeartRateFormModal
            isOpen={isFormModalOpen}
            onClose={() => setIsFormModalOpen(false)}
            onRecordCreated={handleRecordCreated}
          />
        )}
      </div>
    </div>
  );
}

