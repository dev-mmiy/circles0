'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslations, useLocale } from 'next-intl';
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
import { Calendar, List, Plus, Filter, BarChart3 } from 'lucide-react';
import BloodPressureHeartRateFormModal from '@/components/BloodPressureHeartRateFormModal';
import TemperatureFormModal from '@/components/TemperatureFormModal';
import WeightBodyFatFormModal from '@/components/WeightBodyFatFormModal';
import BloodGlucoseFormModal from '@/components/BloodGlucoseFormModal';
import SpO2FormModal from '@/components/SpO2FormModal';
import VitalRecordCard from '@/components/VitalRecordCard';
import VitalRecordSelector, { type VitalType } from '@/components/VitalRecordSelector';
import VitalRecordCalendar from '@/components/VitalRecordCalendar';
import dynamic from 'next/dynamic';
import { format, parseISO } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { setPageTitle } from '@/lib/utils/pageTitle';

// Dynamically import VitalCharts to avoid SSR issues with Recharts
const VitalCharts = dynamic(
  () => import('@/components/VitalCharts').catch((error) => {
    console.error('Failed to load VitalCharts:', error);
    // Return a fallback component if import fails
    return { default: () => {
      const t = useTranslations('daily');
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <div className="text-red-600 dark:text-red-400">{t('chart.loadError')}</div>
        </div>
      );
    }};
  }),
  {
    ssr: false,
    loading: () => {
      const t = useTranslations('daily');
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('chart.loading')}</p>
        </div>
      );
    },
  }
);
import type { VitalRecordGroup } from '@/types/vitalRecords';

type ViewMode = 'calendar' | 'list' | 'chart';
type Period = '1week' | '1month' | '6months' | '1year';

// localStorage keys
const STORAGE_KEY_VIEW_MODE = 'daily_viewMode';
const STORAGE_KEY_CHART_PERIOD = 'daily_chartPeriod';

// Helper functions for localStorage
const getStoredViewMode = (): ViewMode => {
  if (typeof window === 'undefined') return 'list';
  const stored = localStorage.getItem(STORAGE_KEY_VIEW_MODE);
  if (stored === 'list' || stored === 'calendar' || stored === 'chart') {
    return stored;
  }
  return 'list';
};

const getStoredChartPeriod = (): Period => {
  if (typeof window === 'undefined') return '1month';
  const stored = localStorage.getItem(STORAGE_KEY_CHART_PERIOD);
  if (stored === '1week' || stored === '1month' || stored === '6months' || stored === '1year') {
    return stored;
  }
  return '1month';
};

export default function DailyPage() {
  const { isAuthenticated, isLoading: authLoading, getAccessTokenSilently } = useAuth0();
  const { user } = useUser();
  const locale = useLocale();
  const t = useTranslations('daily');
  
  // Set page title
  useEffect(() => {
    setPageTitle(t('pageTitle'));
  }, [t]);
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedVitalType, setSelectedVitalType] = useState<VitalType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateRecords, setSelectedDateRecords] = useState<VitalRecordGroup[]>([]);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [filter, setFilter] = useState<
    'all' | 'bp_hr' | 'weight_fat' | 'temperature' | 'blood_glucose' | 'spo2'
  >('all');
  const [chartPeriod, setChartPeriod] = useState<Period>(getStoredChartPeriod);
  const [zoomedDateRange, setZoomedDateRange] = useState<{ startDate: Date; endDate: Date } | null>(null);
  const dataRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store refresh functions in refs to avoid useEffect re-runs
  const refreshBPRef = useRef<() => Promise<void>>();
  const refreshHRRef = useRef<() => Promise<void>>();
  const refreshTempRef = useRef<() => Promise<void>>();
  const refreshWeightRef = useRef<() => Promise<void>>();
  const refreshBodyFatRef = useRef<() => Promise<void>>();
  const refreshBGRef = useRef<() => Promise<void>>();
  const refreshSpO2Ref = useRef<() => Promise<void>>();

  // Load blood pressure records
  const {
    items: bloodPressureRecords = [],
    isLoading: isLoadingBP,
    refresh: refreshBP,
  } = useDataLoader<BloodPressureRecord>({
    loadFn: useCallback(
      async (skip, limit) => {
        if (!isAuthenticated || !user) {
          throw new Error('Authentication required');
        }
        const token = await getAccessTokenSilently();
        const items = await getBloodPressureRecords(skip, limit, token);
        return { items };
      },
      [isAuthenticated, user, getAccessTokenSilently]
    ),
    pageSize: 100, // Load more records to group by time
    autoLoad: false,
  });

  // Load heart rate records
  const {
    items: heartRateRecords = [],
    isLoading: isLoadingHR,
    refresh: refreshHR,
  } = useDataLoader<HeartRateRecord>({
    loadFn: useCallback(
      async (skip, limit) => {
        if (!isAuthenticated || !user) {
          throw new Error('Authentication required');
        }
        const token = await getAccessTokenSilently();
        const items = await getHeartRateRecords(skip, limit, token);
        return { items };
      },
      [isAuthenticated, user, getAccessTokenSilently]
    ),
    pageSize: 100, // Load more records to group by time
    autoLoad: false,
  });

  // Load temperature records
  const {
    items: temperatureRecords = [],
    isLoading: isLoadingTemp,
    refresh: refreshTemp,
  } = useDataLoader<TemperatureRecord>({
    loadFn: useCallback(
      async (skip, limit) => {
        if (!isAuthenticated || !user) {
          throw new Error('Authentication required');
        }
        const token = await getAccessTokenSilently();
        const items = await getTemperatureRecords(skip, limit, token);
        return { items };
      },
      [isAuthenticated, user, getAccessTokenSilently]
    ),
    pageSize: 100,
    autoLoad: false,
  });

  // Load weight records
  const {
    items: weightRecords = [],
    isLoading: isLoadingWeight,
    refresh: refreshWeight,
  } = useDataLoader<WeightRecord>({
    loadFn: useCallback(
      async (skip, limit) => {
        if (!isAuthenticated || !user) {
          throw new Error('Authentication required');
        }
        const token = await getAccessTokenSilently();
        const items = await getWeightRecords(skip, limit, token);
        return { items };
      },
      [isAuthenticated, user, getAccessTokenSilently]
    ),
    pageSize: 100,
    autoLoad: false,
  });

  // Load body fat records
  const {
    items: bodyFatRecords = [],
    isLoading: isLoadingBodyFat,
    refresh: refreshBodyFat,
  } = useDataLoader<BodyFatRecord>({
    loadFn: useCallback(
      async (skip, limit) => {
        if (!isAuthenticated || !user) {
          throw new Error('Authentication required');
        }
        const token = await getAccessTokenSilently();
        const items = await getBodyFatRecords(skip, limit, token);
        return { items };
      },
      [isAuthenticated, user, getAccessTokenSilently]
    ),
    pageSize: 100,
    autoLoad: false,
  });

  // Load blood glucose records
  const {
    items: bloodGlucoseRecords = [],
    isLoading: isLoadingBG,
    refresh: refreshBG,
  } = useDataLoader<BloodGlucoseRecord>({
    loadFn: useCallback(
      async (skip, limit) => {
        if (!isAuthenticated || !user) {
          throw new Error('Authentication required');
        }
        const token = await getAccessTokenSilently();
        const items = await getBloodGlucoseRecords(skip, limit, token);
        return { items };
      },
      [isAuthenticated, user, getAccessTokenSilently]
    ),
    pageSize: 100,
    autoLoad: false,
  });

  // Load SpO2 records
  const {
    items: spo2Records = [],
    isLoading: isLoadingSpO2,
    refresh: refreshSpO2,
  } = useDataLoader<SpO2Record>({
    loadFn: useCallback(
      async (skip, limit) => {
        if (!isAuthenticated || !user) {
          throw new Error('Authentication required');
        }
        const token = await getAccessTokenSilently();
        const items = await getSpO2Records(skip, limit, token);
        return { items };
      },
      [isAuthenticated, user, getAccessTokenSilently]
    ),
    pageSize: 100,
    autoLoad: false,
  });

  // Filter records by zoomed date range
  const filterByDateRange = useCallback(<T extends { recorded_at: string }>(
    records: T[],
    dateRange: { startDate: Date; endDate: Date } | null
  ): T[] => {
    if (!dateRange) {
      console.log('[DailyPage] No zoomed date range, returning all records:', records.length);
      return records;
    }
    
    const startDateOnly = new Date(dateRange.startDate.getFullYear(), dateRange.startDate.getMonth(), dateRange.startDate.getDate());
    const endDateOnly = new Date(dateRange.endDate.getFullYear(), dateRange.endDate.getMonth(), dateRange.endDate.getDate());
    endDateOnly.setHours(23, 59, 59, 999); // Include the entire end date
    
    console.log('[DailyPage] Filtering records:', {
      totalRecords: records.length,
      dateRange: {
        start: startDateOnly.toISOString(),
        end: endDateOnly.toISOString(),
      },
    });
    
    const filtered = records.filter(record => {
      const recordDate = parseISO(record.recorded_at);
      const recordDateOnly = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
      return recordDateOnly >= startDateOnly && recordDateOnly <= endDateOnly;
    });
    
    console.log('[DailyPage] Filtered records count:', filtered.length);
    return filtered;
  }, []);

  // Filter records by zoomed date range
  const filteredBloodPressureRecords = useMemo(
    () => filterByDateRange(bloodPressureRecords, zoomedDateRange),
    [bloodPressureRecords, zoomedDateRange, filterByDateRange]
  );
  const filteredHeartRateRecords = useMemo(
    () => filterByDateRange(heartRateRecords, zoomedDateRange),
    [heartRateRecords, zoomedDateRange, filterByDateRange]
  );
  const filteredTemperatureRecords = useMemo(
    () => filterByDateRange(temperatureRecords, zoomedDateRange),
    [temperatureRecords, zoomedDateRange, filterByDateRange]
  );
  const filteredWeightRecords = useMemo(
    () => filterByDateRange(weightRecords, zoomedDateRange),
    [weightRecords, zoomedDateRange, filterByDateRange]
  );
  const filteredBodyFatRecords = useMemo(
    () => filterByDateRange(bodyFatRecords, zoomedDateRange),
    [bodyFatRecords, zoomedDateRange, filterByDateRange]
  );
  const filteredBloodGlucoseRecords = useMemo(
    () => filterByDateRange(bloodGlucoseRecords, zoomedDateRange),
    [bloodGlucoseRecords, zoomedDateRange, filterByDateRange]
  );
  const filteredSpO2Records = useMemo(
    () => filterByDateRange(spo2Records, zoomedDateRange),
    [spo2Records, zoomedDateRange, filterByDateRange]
  );

  // Debug: Log filtered records count
  useEffect(() => {
    console.log('[DailyPage] ===== Record counts updated =====');
    console.log('[DailyPage] Zoomed date range:', zoomedDateRange ? {
      start: zoomedDateRange.startDate.toISOString(),
      end: zoomedDateRange.endDate.toISOString(),
    } : 'null (showing all records)');
    console.log('[DailyPage] Record counts:', {
      bloodPressure: { 
        total: bloodPressureRecords.length, 
        filtered: filteredBloodPressureRecords.length,
        sampleDates: bloodPressureRecords.slice(0, 3).map(r => r.recorded_at),
      },
      heartRate: { 
        total: heartRateRecords.length, 
        filtered: filteredHeartRateRecords.length,
        sampleDates: heartRateRecords.slice(0, 3).map(r => r.recorded_at),
      },
      temperature: { 
        total: temperatureRecords.length, 
        filtered: filteredTemperatureRecords.length,
        sampleDates: temperatureRecords.slice(0, 3).map(r => r.recorded_at),
      },
      weight: { 
        total: weightRecords.length, 
        filtered: filteredWeightRecords.length,
        sampleDates: weightRecords.slice(0, 3).map(r => r.recorded_at),
      },
      bodyFat: { 
        total: bodyFatRecords.length, 
        filtered: filteredBodyFatRecords.length,
        sampleDates: bodyFatRecords.slice(0, 3).map(r => r.recorded_at),
      },
      bloodGlucose: { 
        total: bloodGlucoseRecords.length, 
        filtered: filteredBloodGlucoseRecords.length,
        sampleDates: bloodGlucoseRecords.slice(0, 3).map(r => r.recorded_at),
      },
      spo2: { 
        total: spo2Records.length, 
        filtered: filteredSpO2Records.length,
        sampleDates: spo2Records.slice(0, 3).map(r => r.recorded_at),
      },
    });
  }, [zoomedDateRange, bloodPressureRecords.length, filteredBloodPressureRecords.length, heartRateRecords.length, filteredHeartRateRecords.length, temperatureRecords.length, filteredTemperatureRecords.length, weightRecords.length, filteredWeightRecords.length, bodyFatRecords.length, filteredBodyFatRecords.length, bloodGlucoseRecords.length, filteredBloodGlucoseRecords.length, spo2Records.length, filteredSpO2Records.length]);

  // Group records by date (yyyy-MM-dd) for calendar view
  const recordsByDate = useMemo(() => {
    const map = new Map<string, VitalRecordGroup[]>();

    // Combine all records with their types
    const allRecords: Array<{ recordedAt: string; type: string; record: any }> = [];
    bloodPressureRecords.forEach(r =>
      allRecords.push({ recordedAt: r.recorded_at, type: 'bloodPressure', record: r })
    );
    heartRateRecords.forEach(r =>
      allRecords.push({ recordedAt: r.recorded_at, type: 'heartRate', record: r })
    );
    temperatureRecords.forEach(r =>
      allRecords.push({ recordedAt: r.recorded_at, type: 'temperature', record: r })
    );
    weightRecords.forEach(r =>
      allRecords.push({ recordedAt: r.recorded_at, type: 'weight', record: r })
    );
    bodyFatRecords.forEach(r =>
      allRecords.push({ recordedAt: r.recorded_at, type: 'bodyFat', record: r })
    );
    bloodGlucoseRecords.forEach(r =>
      allRecords.push({ recordedAt: r.recorded_at, type: 'bloodGlucose', record: r })
    );
    spo2Records.forEach(r =>
      allRecords.push({ recordedAt: r.recorded_at, type: 'spo2', record: r })
    );

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
  }, [
    bloodPressureRecords,
    heartRateRecords,
    temperatureRecords,
    weightRecords,
    bodyFatRecords,
    bloodGlucoseRecords,
    spo2Records,
  ]);

  // Group records for list view: BP/HR are grouped together, Weight/BodyFat are grouped together, others are individual
  const groupedRecords = useMemo(() => {
    const allRecords: VitalRecordGroup[] = [];
    const bpHrGroupsByTimestamp = new Map<string, VitalRecordGroup>();
    const weightFatGroupsByTimestamp = new Map<string, VitalRecordGroup>();

    // Group blood pressure and heart rate by timestamp (together)
    bloodPressureRecords.forEach(record => {
      const key = record.recorded_at;
      if (!bpHrGroupsByTimestamp.has(key)) {
        bpHrGroupsByTimestamp.set(key, { recordedAt: key });
      }
      bpHrGroupsByTimestamp.get(key)!.bloodPressure = record;
    });

    heartRateRecords.forEach(record => {
      const key = record.recorded_at;
      if (!bpHrGroupsByTimestamp.has(key)) {
        bpHrGroupsByTimestamp.set(key, { recordedAt: key });
      }
      bpHrGroupsByTimestamp.get(key)!.heartRate = record;
    });

    // Group weight and body fat by timestamp (together)
    weightRecords.forEach(record => {
      const key = record.recorded_at;
      if (!weightFatGroupsByTimestamp.has(key)) {
        weightFatGroupsByTimestamp.set(key, { recordedAt: key });
      }
      weightFatGroupsByTimestamp.get(key)!.weight = record;
    });

    bodyFatRecords.forEach(record => {
      const key = record.recorded_at;
      if (!weightFatGroupsByTimestamp.has(key)) {
        weightFatGroupsByTimestamp.set(key, { recordedAt: key });
      }
      weightFatGroupsByTimestamp.get(key)!.bodyFat = record;
    });

    // Add BP/HR groups (only if they have BP or HR)
    bpHrGroupsByTimestamp.forEach(group => {
      if (group.bloodPressure || group.heartRate) {
        allRecords.push(group);
      }
    });

    // Add Weight/BodyFat groups (only if they have Weight or BodyFat)
    weightFatGroupsByTimestamp.forEach(group => {
      if (group.weight || group.bodyFat) {
        allRecords.push(group);
      }
    });

    // Add other records individually (temperature, blood glucose, SpO2)
    temperatureRecords.forEach(record => {
      allRecords.push({
        recordedAt: record.recorded_at,
        temperature: record,
      });
    });

    bloodGlucoseRecords.forEach(record => {
      allRecords.push({
        recordedAt: record.recorded_at,
        bloodGlucose: record,
      });
    });

    spo2Records.forEach(record => {
      allRecords.push({
        recordedAt: record.recorded_at,
        spo2: record,
      });
    });

    // Sort by recorded_at descending
    return allRecords.sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
  }, [
    bloodPressureRecords,
    heartRateRecords,
    temperatureRecords,
    weightRecords,
    bodyFatRecords,
    bloodGlucoseRecords,
    spo2Records,
  ]);

  // Flatten records for calendar view
  const calendarRecords = useMemo(() => {
    const flatRecords: VitalRecordGroup[] = [];
    recordsByDate.forEach(groups => {
      flatRecords.push(...groups);
    });
    return flatRecords;
  }, [recordsByDate]);

  const isLoading =
    isLoadingBP ||
    isLoadingHR ||
    isLoadingTemp ||
    isLoadingWeight ||
    isLoadingBodyFat ||
    isLoadingBG ||
    isLoadingSpO2;

  // Filter records based on selected filter
  const filteredRecords = useMemo(() => {
    if (filter === 'all') {
      return groupedRecords;
    }

    return groupedRecords.filter(group => {
      switch (filter) {
        case 'bp_hr':
          return !!(group.bloodPressure || group.heartRate);
        case 'weight_fat':
          return !!(group.weight || group.bodyFat);
        case 'temperature':
          return !!group.temperature;
        case 'blood_glucose':
          return !!group.bloodGlucose;
        case 'spo2':
          return !!group.spo2;
        default:
          return true;
      }
    });
  }, [groupedRecords, filter]);

  const records = filteredRecords;

  // Save viewMode to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_VIEW_MODE, viewMode);
    }
  }, [viewMode]);

  // Save chartPeriod to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_CHART_PERIOD, chartPeriod);
    }
  }, [chartPeriod]);

  // Reset zoomed date range when chart period changes
  useEffect(() => {
    setZoomedDateRange(null);
  }, [chartPeriod]);

  // Trigger data refresh when zoomedDateRange changes (after debounce)
  useEffect(() => {
    if (!zoomedDateRange) {
      return;
    }

    // Clear any existing timeout
    if (dataRefreshTimeoutRef.current) {
      clearTimeout(dataRefreshTimeoutRef.current);
    }

    // Set up debounced data refresh
    console.log('[DailyPage] Setting timeout for data fetch (500ms delay)');
    dataRefreshTimeoutRef.current = setTimeout(async () => {
      console.log('[DailyPage] ===== Starting data fetch for zoomed date range =====');
      console.log('[DailyPage] Date range:', {
        startDate: zoomedDateRange.startDate.toISOString(),
        endDate: zoomedDateRange.endDate.toISOString(),
      });

      // Reload data for the new date range
      if (isAuthenticated && user && !authLoading) {
        const startTime = Date.now();
        try {
          console.log('[DailyPage] Fetching blood pressure records...');
          if (refreshBPRef.current) {
            await refreshBPRef.current();
            console.log('[DailyPage] ✓ Blood pressure records fetched');
          } else {
            console.warn('[DailyPage] refreshBPRef.current is not set');
          }

          console.log('[DailyPage] Fetching heart rate records...');
          if (refreshHRRef.current) {
            await refreshHRRef.current();
            console.log('[DailyPage] ✓ Heart rate records fetched');
          } else {
            console.warn('[DailyPage] refreshHRRef.current is not set');
          }

          console.log('[DailyPage] Fetching temperature records...');
          if (refreshTempRef.current) {
            await refreshTempRef.current();
            console.log('[DailyPage] ✓ Temperature records fetched');
          } else {
            console.warn('[DailyPage] refreshTempRef.current is not set');
          }

          console.log('[DailyPage] Fetching weight records...');
          if (refreshWeightRef.current) {
            await refreshWeightRef.current();
            console.log('[DailyPage] ✓ Weight records fetched');
          } else {
            console.warn('[DailyPage] refreshWeightRef.current is not set');
          }

          console.log('[DailyPage] Fetching body fat records...');
          if (refreshBodyFatRef.current) {
            await refreshBodyFatRef.current();
            console.log('[DailyPage] ✓ Body fat records fetched');
          } else {
            console.warn('[DailyPage] refreshBodyFatRef.current is not set');
          }

          console.log('[DailyPage] Fetching blood glucose records...');
          if (refreshBGRef.current) {
            await refreshBGRef.current();
            console.log('[DailyPage] ✓ Blood glucose records fetched');
          } else {
            console.warn('[DailyPage] refreshBGRef.current is not set');
          }

          console.log('[DailyPage] Fetching SpO2 records...');
          if (refreshSpO2Ref.current) {
            await refreshSpO2Ref.current();
            console.log('[DailyPage] ✓ SpO2 records fetched');
          } else {
            console.warn('[DailyPage] refreshSpO2Ref.current is not set');
          }

          const elapsed = Date.now() - startTime;
          console.log('[DailyPage] ===== All data fetched successfully in', elapsed, 'ms =====');
        } catch (error) {
          console.error('[DailyPage] ===== Failed to fetch data =====');
          console.error('[DailyPage] Error:', error);
          console.error('[DailyPage] Error details:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
        }
      } else {
        console.warn('[DailyPage] Cannot fetch data - auth check failed:', {
          isAuthenticated,
          hasUser: !!user,
          authLoading,
        });
      }
    }, 500); // Debounce 500ms

    // Cleanup function
    return () => {
      if (dataRefreshTimeoutRef.current) {
        clearTimeout(dataRefreshTimeoutRef.current);
        dataRefreshTimeoutRef.current = null;
      }
    };
  }, [zoomedDateRange, isAuthenticated, user, authLoading]);

  // Load records when component mounts
  useEffect(() => {
    if (isAuthenticated && user && !authLoading) {
      console.log('[DailyPage] ===== Initial data load =====');
      console.log('[DailyPage] Auth state:', { isAuthenticated, hasUser: !!user, authLoading });
      
      // Load all vital records
      const loadAll = async () => {
        const startTime = Date.now();
        try {
          console.log('[DailyPage] Starting initial data load...');
          
          console.log('[DailyPage] Calling refreshBP()...');
          await refreshBP();
          console.log('[DailyPage] refreshBP() completed');
          
          console.log('[DailyPage] Calling refreshHR()...');
          await refreshHR();
          console.log('[DailyPage] refreshHR() completed');
          
          console.log('[DailyPage] Calling refreshTemp()...');
          await refreshTemp();
          console.log('[DailyPage] refreshTemp() completed');
          
          console.log('[DailyPage] Calling refreshWeight()...');
          await refreshWeight();
          console.log('[DailyPage] refreshWeight() completed');
          
          console.log('[DailyPage] Calling refreshBodyFat()...');
          await refreshBodyFat();
          console.log('[DailyPage] refreshBodyFat() completed');
          
          console.log('[DailyPage] Calling refreshBG()...');
          await refreshBG();
          console.log('[DailyPage] refreshBG() completed');
          
          console.log('[DailyPage] Calling refreshSpO2()...');
          await refreshSpO2();
          console.log('[DailyPage] refreshSpO2() completed');
          
          const elapsed = Date.now() - startTime;
          console.log('[DailyPage] Initial data load completed in', elapsed, 'ms');
        } catch (error) {
          console.error('[DailyPage] Failed to load records:', error);
          console.error('[DailyPage] Error details:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
        }
      };
      loadAll();
    } else {
      console.log('[DailyPage] Skipping initial data load - auth not ready:', {
        isAuthenticated,
        hasUser: !!user,
        authLoading,
      });
    }
  }, [
    isAuthenticated,
    user,
    authLoading,
    refreshBP,
    refreshHR,
    refreshTemp,
    refreshWeight,
    refreshBodyFat,
    refreshBG,
    refreshSpO2,
  ]);

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
  }, [
    refreshBP,
    refreshHR,
    refreshTemp,
    refreshWeight,
    refreshBodyFat,
    refreshBG,
    refreshSpO2,
    isAuthenticated,
    user,
    authLoading,
  ]);

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('subtitleVital')}</p>
        </div>

        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col gap-4">
            {/* First Row: View Mode Toggle and Add Button */}
            <div className="flex items-center justify-between gap-4">
              {/* View Mode Toggle - Icons only on mobile, full buttons on desktop */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center space-x-2 px-3 py-2 md:px-4 md:py-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title={t('viewMode.list')}
                >
                  <List className="w-4 h-4" />
                  <span className="hidden md:inline">{t('viewMode.list')}</span>
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center space-x-2 px-3 py-2 md:px-4 md:py-2 rounded-lg transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title={t('viewMode.calendar')}
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden md:inline">{t('viewMode.calendar')}</span>
                </button>
                <button
                  onClick={() => setViewMode('chart')}
                  className={`flex items-center space-x-2 px-3 py-2 md:px-4 md:py-2 rounded-lg transition-colors ${
                    viewMode === 'chart'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title={t('viewMode.chart') || 'チャート'}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden md:inline">{t('viewMode.chart') || 'チャート'}</span>
                </button>
              </div>

              {/* Add Record Button - Mobile: icon only, Desktop: with text */}
              <button
                onClick={() => openFormModal()}
                className="flex items-center justify-center space-x-2 px-3 py-2 md:px-4 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                title={t('addRecord')}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline">{t('addRecord')}</span>
              </button>
            </div>

            {/* Second Row: Filter */}
            {viewMode === 'list' && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <select
                  value={filter}
                  onChange={e => setFilter(e.target.value as typeof filter)}
                  className="px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                >
                  <option value="all">{t('filter.all')}</option>
                  <option value="bp_hr">{t('addBloodPressureHeartRate')}</option>
                  <option value="weight_fat">{t('addWeightBodyFat')}</option>
                  <option value="temperature">{t('addTemperature')}</option>
                  <option value="blood_glucose">{t('addBloodGlucose')}</option>
                  <option value="spo2">{t('addSpO2')}</option>
                </select>
              </div>
            )}
            {viewMode === 'chart' && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('chart.period') || '期間'}:
                </span>
                <select
                  value={chartPeriod}
                  onChange={e => setChartPeriod(e.target.value as Period)}
                  className="px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                >
                  <option value="1week">{t('chart.periods.1week') || '1週間'}</option>
                  <option value="1month">{t('chart.periods.1month') || '1か月'}</option>
                  <option value="6months">{t('chart.periods.6months') || '半年'}</option>
                  <option value="1year">{t('chart.periods.1year') || '1年'}</option>
                </select>
              </div>
            )}
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
        ) : viewMode === 'calendar' ? (
          <VitalRecordCalendar records={calendarRecords} onDateClick={handleDateClick} />
        ) : (
          <VitalCharts
            period={chartPeriod}
            bloodPressureRecords={filteredBloodPressureRecords}
            heartRateRecords={filteredHeartRateRecords}
            temperatureRecords={filteredTemperatureRecords}
            weightRecords={filteredWeightRecords}
            bodyFatRecords={filteredBodyFatRecords}
            bloodGlucoseRecords={filteredBloodGlucoseRecords}
            spo2Records={filteredSpO2Records}
            zoomedDateRange={zoomedDateRange}
            onZoomChange={(startDate, endDate) => {
              console.log('[DailyPage] ===== User zoom/drag event =====');
              console.log('[DailyPage] Date range:', { 
                startDate: startDate.toISOString(), 
                endDate: endDate.toISOString() 
              });
              
              // Immediately update zoomedDateRange to keep chart position
              // This will trigger the useEffect that handles data refresh
              setZoomedDateRange({ startDate, endDate });
            }}
            onPeriodChange={async () => {
              console.log('[DailyPage] ===== Period changed via arrow buttons =====');
              
              // Log current record counts before refresh
              const beforeCounts = {
                bloodPressure: bloodPressureRecords.length,
                heartRate: heartRateRecords.length,
                temperature: temperatureRecords.length,
                weight: weightRecords.length,
                bodyFat: bodyFatRecords.length,
                bloodGlucose: bloodGlucoseRecords.length,
                spo2: spo2Records.length,
              };
              console.log('[DailyPage] Record counts BEFORE refresh:', beforeCounts);
              
              // Reload data when period changes via arrow buttons
              if (isAuthenticated && user && !authLoading) {
                console.log('[DailyPage] Starting data refresh...', {
                  isAuthenticated,
                  hasUser: !!user,
                  authLoading,
                });
                
                const startTime = Date.now();
                try {
                  console.log('[DailyPage] Calling refreshBP()...');
                  await refreshBP();
                  console.log('[DailyPage] refreshBP() completed');
                  
                  console.log('[DailyPage] Calling refreshHR()...');
                  await refreshHR();
                  console.log('[DailyPage] refreshHR() completed');
                  
                  console.log('[DailyPage] Calling refreshTemp()...');
                  await refreshTemp();
                  console.log('[DailyPage] refreshTemp() completed');
                  
                  console.log('[DailyPage] Calling refreshWeight()...');
                  await refreshWeight();
                  console.log('[DailyPage] refreshWeight() completed');
                  
                  console.log('[DailyPage] Calling refreshBodyFat()...');
                  await refreshBodyFat();
                  console.log('[DailyPage] refreshBodyFat() completed');
                  
                  console.log('[DailyPage] Calling refreshBG()...');
                  await refreshBG();
                  console.log('[DailyPage] refreshBG() completed');
                  
                  console.log('[DailyPage] Calling refreshSpO2()...');
                  await refreshSpO2();
                  console.log('[DailyPage] refreshSpO2() completed');
                  
                  const elapsed = Date.now() - startTime;
                  console.log('[DailyPage] All refresh operations completed in', elapsed, 'ms');
                } catch (error) {
                  console.error('[DailyPage] Failed to reload records after period change:', error);
                  console.error('[DailyPage] Error details:', {
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                  });
                }
              } else {
                console.warn('[DailyPage] Cannot refresh data - auth check failed:', {
                  isAuthenticated,
                  hasUser: !!user,
                  authLoading,
                });
              }
            }}
          />
        )}

        {/* Vital Record Selector Modal */}
        {isFormModalOpen && !selectedVitalType && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-black bg-opacity-50"
                onClick={() => setIsFormModalOpen(false)}
              />
              <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {t('selectVitalToRecord')}
                  </h2>
                  <button
                    onClick={() => setIsFormModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
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
                    {format(selectedDate, locale === 'ja' ? 'yyyy年MM月dd日' : 'MMMM dd, yyyy', { locale: locale === 'ja' ? ja : enUS })}
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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
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
