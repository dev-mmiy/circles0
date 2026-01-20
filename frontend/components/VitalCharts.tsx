'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { BloodPressureRecord } from '@/lib/api/bloodPressureRecords';
import type { HeartRateRecord } from '@/lib/api/heartRateRecords';
import type { TemperatureRecord } from '@/lib/api/temperatureRecords';
import type { WeightRecord } from '@/lib/api/weightRecords';
import type { BodyFatRecord } from '@/lib/api/bodyFatRecords';
import type { BloodGlucoseRecord } from '@/lib/api/bloodGlucoseRecords';
import type { SpO2Record } from '@/lib/api/spo2Records';
import { useChartDateRange, type Period } from '@/hooks/useChartDateRange';
import { formatPeriodTitleRange } from '@/utils/chartUtils';
import dynamic from 'next/dynamic';

// Dynamically import all Chart.js components to avoid SSR issues
const WeightBodyFatChart = dynamic(
  () => import('./vitalCharts/WeightBodyFatChart'),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    ),
  }
);

const BloodPressureHeartRateChart = dynamic(
  () => import('./vitalCharts/BloodPressureHeartRateChart'),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    ),
  }
);

const TemperatureChart = dynamic(
  () => import('./vitalCharts/TemperatureChart'),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    ),
  }
);

const BloodGlucoseChart = dynamic(
  () => import('./vitalCharts/BloodGlucoseChart'),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    ),
  }
);

const SpO2Chart = dynamic(
  () => import('./vitalCharts/SpO2Chart'),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    ),
  }
);

interface VitalChartsProps {
  period: Period;
  bloodPressureRecords: BloodPressureRecord[];
  heartRateRecords: HeartRateRecord[];
  temperatureRecords: TemperatureRecord[];
  weightRecords: WeightRecord[];
  bodyFatRecords: BodyFatRecord[];
  bloodGlucoseRecords: BloodGlucoseRecord[];
  spo2Records: SpO2Record[];
  onZoomChange?: (startDate: Date, endDate: Date) => void;
  onPeriodChange?: () => void;
  onDateRangeChange?: (dateRange: { startDate: Date; endDate: Date }) => void;
  zoomedDateRange?: { startDate: Date; endDate: Date } | null;
}

export default function VitalCharts({
  period,
  bloodPressureRecords,
  heartRateRecords,
  temperatureRecords,
  weightRecords,
  bodyFatRecords,
  bloodGlucoseRecords,
  spo2Records,
  onZoomChange,
  onPeriodChange,
  onDateRangeChange,
  zoomedDateRange,
}: VitalChartsProps) {
  const t = useTranslations('daily');
  // 1週間チャートの場合、表示する週の開始日を管理
  const [weekOffset, setWeekOffset] = useState(0); // 0 = 今週、1 = 1週間前、-1 = 1週間後

  // Calculate date range based on period
  const dateRange = useChartDateRange(period, weekOffset);
  
  // 実際の表示日付範囲を決定（zoomedDateRangeが優先）
  const effectiveDateRange = useMemo(() => {
    return zoomedDateRange || dateRange;
  }, [zoomedDateRange, dateRange]);
  
  // 日付範囲が変更されたときに親に通知
  // weekOffsetやperiodが変更されたときだけ呼ぶ（zoomedDateRangeの変更はonZoomChangeで処理される）
  useEffect(() => {
    // zoomedDateRangeが設定されている場合は、onZoomChangeで処理されるためスキップ
    if (zoomedDateRange) {
      return;
    }
    
    if (onDateRangeChange) {
      onDateRangeChange(dateRange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset, period]); // dateRangeはweekOffsetとperiodに依存しているため、依存配列から除外

  // チャートのナビゲーション関数（全期間共通）
  const goToPreviousPeriod = () => {
    setWeekOffset(prev => prev + 1);
    // Notify parent to reload data
    if (onPeriodChange) {
      onPeriodChange();
    }
  };

  const goToNextPeriod = () => {
    setWeekOffset(prev => prev - 1);
    // Notify parent to reload data
    if (onPeriodChange) {
      onPeriodChange();
    }
  };

  // チャートのタイトル表示用の日付範囲
  const periodTitleRange = useMemo(() => {
    return formatPeriodTitleRange(period, dateRange);
  }, [period, dateRange]);

  return (
    <div className="space-y-6">
      {/* Blood Pressure & Heart Rate Chart */}
      <BloodPressureHeartRateChart
        bloodPressureRecords={bloodPressureRecords}
        heartRateRecords={heartRateRecords}
        period={period}
        dateRange={dateRange}
        periodTitleRange={periodTitleRange}
        weekOffset={weekOffset}
        onPrevious={goToPreviousPeriod}
        onNext={goToNextPeriod}
        onZoomChange={onZoomChange}
        zoomedDateRange={zoomedDateRange}
      />

      {/* Weight & Body Fat Chart */}
      <WeightBodyFatChart
        weightRecords={weightRecords}
        bodyFatRecords={bodyFatRecords}
        period={period}
        dateRange={dateRange}
        periodTitleRange={periodTitleRange}
        weekOffset={weekOffset}
        onPrevious={goToPreviousPeriod}
        onNext={goToNextPeriod}
        onZoomChange={onZoomChange}
        zoomedDateRange={zoomedDateRange}
      />

      {/* Temperature Chart */}
      <TemperatureChart
        temperatureRecords={temperatureRecords}
        period={period}
        dateRange={dateRange}
        periodTitleRange={periodTitleRange}
        weekOffset={weekOffset}
        onPrevious={goToPreviousPeriod}
        onNext={goToNextPeriod}
        onZoomChange={onZoomChange}
        zoomedDateRange={zoomedDateRange}
      />

      {/* Blood Glucose Chart */}
      <BloodGlucoseChart
        bloodGlucoseRecords={bloodGlucoseRecords}
        period={period}
        dateRange={dateRange}
        periodTitleRange={periodTitleRange}
        weekOffset={weekOffset}
        onPrevious={goToPreviousPeriod}
        onNext={goToNextPeriod}
        onZoomChange={onZoomChange}
        zoomedDateRange={zoomedDateRange}
      />

      {/* SpO2 Chart */}
      <SpO2Chart
        spo2Records={spo2Records}
        period={period}
        dateRange={dateRange}
        periodTitleRange={periodTitleRange}
        weekOffset={weekOffset}
        onPrevious={goToPreviousPeriod}
        onNext={goToNextPeriod}
        onZoomChange={onZoomChange}
        zoomedDateRange={zoomedDateRange}
      />

      {/* No "No Data" message - charts are always displayed to allow period navigation */}
    </div>
  );
}
