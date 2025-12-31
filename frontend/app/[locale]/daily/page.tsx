'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslations } from 'next-intl';
import Header from '@/components/Header';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { getBloodPressureRecords, type BloodPressureRecord } from '@/lib/api/bloodPressureRecords';
import { getHeartRateRecords, type HeartRateRecord } from '@/lib/api/heartRateRecords';
import { getTemperatureRecords, type TemperatureRecord } from '@/lib/api/temperatureRecords';
import { getWeightRecords, type WeightRecord } from '@/lib/api/weightRecords';
import { getBodyFatRecords, type BodyFatRecord } from '@/lib/api/bodyFatRecords';
import { getBloodGlucoseRecords, type BloodGlucoseRecord } from '@/lib/api/bloodGlucoseRecords';
import { getSpO2Records, type SpO2Record } from '@/lib/api/spo2Records';
import { useUser } from '@/contexts/UserContext';
import { useDataLoader } from '@/lib/hooks/useDataLoader';
import { Calendar, List, Plus } from 'lucide-react';
import BloodPressureHeartRateFormModal from '@/components/BloodPressureHeartRateFormModal';
import TemperatureFormModal from '@/components/TemperatureFormModal';
import WeightBodyFatFormModal from '@/components/WeightBodyFatFormModal';
import BloodGlucoseFormModal from '@/components/BloodGlucoseFormModal';
import SpO2FormModal from '@/components/SpO2FormModal';
import VitalRecordCard from '@/components/VitalRecordCard';
import VitalRecordSelector, { type VitalType } from '@/components/VitalRecordSelector';
import VitalRecordCalendar from '@/components/VitalRecordCalendar';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { VitalRecordGroup } from '@/types/vitalRecords';

type ViewMode = 'calendar' | 'list';

export default function DailyPage() {
  const { isAuthenticated, isLoading: authLoading, getAccessTokenSilently } = useAuth0();
  const { user } = useUser();
  const t = useTranslations('daily');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedVitalType, setSelectedVitalType] = useState<VitalType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateRecords, setSelectedDateRecords] = useState<VitalRecordGroup[]>([]);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);

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
    pageSize: 100, // Load more records to group by time
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
    pageSize: 100, // Load more records to group by time
    autoLoad: false,
  });

  // Load temperature records
  const {
    items: temperatureRecords = [],
    isLoading: isLoadingTemp,
    refresh: refreshTemp,
  } = useDataLoader<TemperatureRecord>({
    loadFn: useCallback(async (skip, limit) => {
      if (!isAuthenticated || !user) {
        throw new Error('Authentication required');
      }
      const token = await getAccessTokenSilently();
      const items = await getTemperatureRecords(skip, limit, token);
      return { items };
    }, [isAuthenticated, user, getAccessTokenSilently]),
    pageSize: 100,
    autoLoad: false,
  });

  // Load weight records
  const {
    items: weightRecords = [],
    isLoading: isLoadingWeight,
    refresh: refreshWeight,
  } = useDataLoader<WeightRecord>({
    loadFn: useCallback(async (skip, limit) => {
      if (!isAuthenticated || !user) {
        throw new Error('Authentication required');
      }
      const token = await getAccessTokenSilently();
      const items = await getWeightRecords(skip, limit, token);
      return { items };
    }, [isAuthenticated, user, getAccessTokenSilently]),
    pageSize: 100,
    autoLoad: false,
  });

  // Load body fat records
  const {
    items: bodyFatRecords = [],
    isLoading: isLoadingBodyFat,
    refresh: refreshBodyFat,
  } = useDataLoader<BodyFatRecord>({
    loadFn: useCallback(async (skip, limit) => {
      if (!isAuthenticated || !user) {
        throw new Error('Authentication required');
      }
      const token = await getAccessTokenSilently();
      const items = await getBodyFatRecords(skip, limit, token);
      return { items };
    }, [isAuthenticated, user, getAccessTokenSilently]),
    pageSize: 100,
    autoLoad: false,
  });

  // Load blood glucose records
  const {
    items: bloodGlucoseRecords = [],
    isLoading: isLoadingBG,
    refresh: refreshBG,
  } = useDataLoader<BloodGlucoseRecord>({
    loadFn: useCallback(async (skip, limit) => {
      if (!isAuthenticated || !user) {
        throw new Error('Authentication required');
      }
      const token = await getAccessTokenSilently();
      const items = await getBloodGlucoseRecords(skip, limit, token);
      return { items };
    }, [isAuthenticated, user, getAccessTokenSilently]),
    pageSize: 100,
    autoLoad: false,
  });

  // Load SpO2 records
  const {
    items: spo2Records = [],
    isLoading: isLoadingSpO2,
    refresh: refreshSpO2,
  } = useDataLoader<SpO2Record>({
    loadFn: useCallback(async (skip, limit) => {
      if (!isAuthenticated || !user) {
        throw new Error('Authentication required');
      }
      const token = await getAccessTokenSilently();
      const items = await getSpO2Records(skip, limit, token);
      return { items };
    }, [isAuthenticated, user, getAccessTokenSilently]),
    pageSize: 100,
    autoLoad: false,
  });

  // Group records by date (yyyy-MM-dd) for calendar view
  const recordsByDate = useMemo(() => {
    const map = new Map<string, VitalRecordGroup[]>();
    
    // Combine all records with their types
    const allRecords: Array<{ recordedAt: string; type: string; record: any }> = [];
    bloodPressureRecords.forEach(r => allRecords.push({ recordedAt: r.recorded_at, type: 'bloodPressure', record: r }));
    heartRateRecords.forEach(r => allRecords.push({ recordedAt: r.recorded_at, type: 'heartRate', record: r }));
    temperatureRecords.forEach(r => allRecords.push({ recordedAt: r.recorded_at, type: 'temperature', record: r }));
    weightRecords.forEach(r => allRecords.push({ recordedAt: r.recorded_at, type: 'weight', record: r }));
    bodyFatRecords.forEach(r => allRecords.push({ recordedAt: r.recorded_at, type: 'bodyFat', record: r }));
    bloodGlucoseRecords.forEach(r => allRecords.push({ recordedAt: r.recorded_at, type: 'bloodGlucose', record: r }));
    spo2Records.forEach(r => allRecords.push({ recordedAt: r.recorded_at, type: 'spo2', record: r }));

    // Group by date (yyyy-MM-dd) and by exact timestamp
    const groupsByTimestamp = new Map<string, VitalRecordGroup>();
    
    allRecords.forEach(({ recordedAt, type, record }) => {
      // First, group by exact timestamp for list view compatibility
      if (!groupsByTimestamp.has(recordedAt)) {
        groupsByTimestamp.set(recordedAt, { recordedAt });
      }
      const group = groupsByTimestamp.get(recordedAt)!;
      (group as any)[type] = record;
    });

    // Then, group by date (yyyy-MM-dd) for calendar view
    groupsByTimestamp.forEach((group, timestamp) => {
      const dateKey = format(new Date(timestamp), 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(group);
    });

    return map;
  }, [bloodPressureRecords, heartRateRecords, temperatureRecords, weightRecords, bodyFatRecords, bloodGlucoseRecords, spo2Records]);

  // Group records for list view: BP/HR are grouped together, Weight/BodyFat are grouped together, others are individual
  const groupedRecords = useMemo(() => {
    const allRecords: VitalRecordGroup[] = [];
    const bpHrGroupsByTimestamp = new Map<string, VitalRecordGroup>();
    const weightFatGroupsByTimestamp = new Map<string, VitalRecordGroup>();

    // Group blood pressure and heart rate by timestamp (together)
    bloodPressureRecords.forEach((record) => {
      const key = record.recorded_at;
      if (!bpHrGroupsByTimestamp.has(key)) {
        bpHrGroupsByTimestamp.set(key, { recordedAt: key });
      }
      bpHrGroupsByTimestamp.get(key)!.bloodPressure = record;
    });

    heartRateRecords.forEach((record) => {
      const key = record.recorded_at;
      if (!bpHrGroupsByTimestamp.has(key)) {
        bpHrGroupsByTimestamp.set(key, { recordedAt: key });
      }
      bpHrGroupsByTimestamp.get(key)!.heartRate = record;
    });

    // Group weight and body fat by timestamp (together)
    weightRecords.forEach((record) => {
      const key = record.recorded_at;
      if (!weightFatGroupsByTimestamp.has(key)) {
        weightFatGroupsByTimestamp.set(key, { recordedAt: key });
      }
      weightFatGroupsByTimestamp.get(key)!.weight = record;
    });

    bodyFatRecords.forEach((record) => {
      const key = record.recorded_at;
      if (!weightFatGroupsByTimestamp.has(key)) {
        weightFatGroupsByTimestamp.set(key, { recordedAt: key });
      }
      weightFatGroupsByTimestamp.get(key)!.bodyFat = record;
    });

    // Add BP/HR groups (only if they have BP or HR)
    bpHrGroupsByTimestamp.forEach((group) => {
      if (group.bloodPressure || group.heartRate) {
        allRecords.push(group);
      }
    });

    // Add Weight/BodyFat groups (only if they have Weight or BodyFat)
    weightFatGroupsByTimestamp.forEach((group) => {
      if (group.weight || group.bodyFat) {
        allRecords.push(group);
      }
    });

    // Add other records individually (temperature, blood glucose, SpO2)
    temperatureRecords.forEach((record) => {
      allRecords.push({
        recordedAt: record.recorded_at,
        temperature: record,
      });
    });

    bloodGlucoseRecords.forEach((record) => {
      allRecords.push({
        recordedAt: record.recorded_at,
        bloodGlucose: record,
      });
    });

    spo2Records.forEach((record) => {
      allRecords.push({
        recordedAt: record.recorded_at,
        spo2: record,
      });
    });

    // Sort by recorded_at descending
    return allRecords.sort((a, b) => 
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
  }, [bloodPressureRecords, heartRateRecords, temperatureRecords, weightRecords, bodyFatRecords, bloodGlucoseRecords, spo2Records]);

  // Flatten records for calendar view
  const calendarRecords = useMemo(() => {
    const flatRecords: VitalRecordGroup[] = [];
    recordsByDate.forEach((groups) => {
      flatRecords.push(...groups);
    });
    return flatRecords;
  }, [recordsByDate]);

  const isLoading = isLoadingBP || isLoadingHR || isLoadingTemp || isLoadingWeight || isLoadingBodyFat || isLoadingBG || isLoadingSpO2;
  const records = groupedRecords;

  // Load records when component mounts
  useEffect(() => {
    if (isAuthenticated && user && !authLoading) {
      // Load all vital records
      const loadAll = async () => {
        try {
          await Promise.all([
            refreshBP(),
            refreshHR(),
            refreshTemp(),
            refreshWeight(),
            refreshBodyFat(),
            refreshBG(),
            refreshSpO2(),
          ]);
        } catch (error) {
          console.error('[DailyPage] Failed to load records:', error);
        }
      };
      loadAll();
    }
  }, [isAuthenticated, user, authLoading, refreshBP, refreshHR, refreshTemp, refreshWeight, refreshBodyFat, refreshBG, refreshSpO2]);

  // Handle form submission
  const handleRecordCreated = useCallback(async () => {
    setIsFormModalOpen(false);
    setIsDateModalOpen(false);
    // Wait a bit for modal to close, then refresh
    setTimeout(async () => {
      if (isAuthenticated && user && !authLoading) {
        try {
          await Promise.all([
            refreshBP(),
            refreshHR(),
            refreshTemp(),
            refreshWeight(),
            refreshBodyFat(),
            refreshBG(),
            refreshSpO2(),
          ]);
        } catch (error) {
          console.warn('[DailyPage] Refresh failed:', error);
        }
      }
    }, 300);
  }, [refreshBP, refreshHR, refreshTemp, refreshWeight, refreshBodyFat, refreshBG, refreshSpO2, isAuthenticated, user, authLoading]);

  // Open form modal with selected vital type
  const openFormModal = (vitalType?: VitalType) => {
    setSelectedVitalType(vitalType || null);
    setIsFormModalOpen(true);
  };

  // Handle vital type selection
  const handleVitalSelect = (vitalType: VitalType) => {
    openFormModal(vitalType);
  };

  // Handle date click in calendar
  const handleDateClick = (date: Date, records: VitalRecordGroup[]) => {
    setSelectedDate(date);
    setSelectedDateRecords(records);
    setIsDateModalOpen(true);
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

            {/* Add Record Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => openFormModal()}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>記録を追加</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {isLoading && records.length === 0 && (
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
                {records.map((group, index) => {
                  // Create a unique key for each record type
                  const recordId = 
                    group.bloodPressure?.id || 
                    group.heartRate?.id || 
                    group.temperature?.id || 
                    group.weight?.id || 
                    group.bodyFat?.id || 
                    group.bloodGlucose?.id || 
                    group.spo2?.id || 
                    `${group.recordedAt}-${index}`;
                  
                  return (
                    <VitalRecordCard
                      key={recordId}
                      bloodPressure={group.bloodPressure}
                      heartRate={group.heartRate}
                      temperature={group.temperature}
                      weight={group.weight}
                      bodyFat={group.bodyFat}
                      bloodGlucose={group.bloodGlucose}
                      spo2={group.spo2}
                      onRecordUpdated={handleRecordCreated}
                      onRecordDeleted={handleRecordCreated}
                    />
                  );
                })}
              </>
            )}
          </div>
        ) : (
          <VitalRecordCalendar
            records={calendarRecords}
            onDateClick={handleDateClick}
          />
        )}

        {/* Vital Record Selector Modal */}
        {isFormModalOpen && !selectedVitalType && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsFormModalOpen(false)} />
              <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    記録するバイタルを選択
                  </h2>
                  <button
                    onClick={() => setIsFormModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <VitalRecordSelector onSelect={handleVitalSelect} />
              </div>
            </div>
          </div>
        )}

        {/* Form Modals for each vital type */}
        {isFormModalOpen && selectedVitalType === 'blood_pressure_heart_rate' && (
          <BloodPressureHeartRateFormModal
            isOpen={isFormModalOpen}
            onClose={() => {
              setIsFormModalOpen(false);
              setSelectedVitalType(null);
            }}
            onRecordCreated={handleRecordCreated}
          />
        )}
        {isFormModalOpen && selectedVitalType === 'temperature' && (
          <TemperatureFormModal
            isOpen={isFormModalOpen}
            onClose={() => {
              setIsFormModalOpen(false);
              setSelectedVitalType(null);
            }}
            onRecordCreated={handleRecordCreated}
          />
        )}
        {isFormModalOpen && selectedVitalType === 'weight_body_fat' && (
          <WeightBodyFatFormModal
            isOpen={isFormModalOpen}
            onClose={() => {
              setIsFormModalOpen(false);
              setSelectedVitalType(null);
            }}
            onRecordCreated={handleRecordCreated}
          />
        )}
        {isFormModalOpen && selectedVitalType === 'blood_glucose' && (
          <BloodGlucoseFormModal
            isOpen={isFormModalOpen}
            onClose={() => {
              setIsFormModalOpen(false);
              setSelectedVitalType(null);
            }}
            onRecordCreated={handleRecordCreated}
          />
        )}
        {isFormModalOpen && selectedVitalType === 'spo2' && (
          <SpO2FormModal
            isOpen={isFormModalOpen}
            onClose={() => {
              setIsFormModalOpen(false);
              setSelectedVitalType(null);
            }}
            onRecordCreated={handleRecordCreated}
          />
        )}

        {/* Date Records Modal */}
        {isDateModalOpen && selectedDate && selectedDateRecords.length > 0 && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div 
                className="fixed inset-0 bg-black bg-opacity-50" 
                onClick={() => {
                  setIsDateModalOpen(false);
                  setSelectedDate(null);
                  setSelectedDateRecords([]);
                }} 
              />
              <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10">
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {format(selectedDate, 'yyyy年MM月dd日', { locale: ja })}
                  </h2>
                  <button
                    onClick={() => {
                      setIsDateModalOpen(false);
                      setSelectedDate(null);
                      setSelectedDateRecords([]);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {selectedDateRecords.map((group, index) => (
                    <VitalRecordCard
                      key={`${group.recordedAt}-${index}`}
                      bloodPressure={group.bloodPressure}
                      heartRate={group.heartRate}
                      temperature={group.temperature}
                      weight={group.weight}
                      bodyFat={group.bodyFat}
                      bloodGlucose={group.bloodGlucose}
                      spo2={group.spo2}
                      onRecordUpdated={handleRecordCreated}
                      onRecordDeleted={handleRecordCreated}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

