'use client';

import { useTranslations } from 'next-intl';
import type { TemperatureRecord } from '@/lib/api/temperatureRecords';
import type { Period } from '@/hooks/useChartDateRange';
import dynamic from 'next/dynamic';

const TemperatureChartClient = dynamic(
  () => {
    if (typeof window === 'undefined') {
      return Promise.resolve({
        default: () => null,
      });
    }
    return import('./TemperatureChartClient');
  },
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

interface TemperatureChartProps {
  temperatureRecords: TemperatureRecord[];
  period: Period;
  dateRange: { startDate: Date; endDate: Date };
  periodTitleRange: string | null;
  weekOffset: number;
  onPrevious: () => void;
  onNext: () => void;
  onZoomChange?: (startDate: Date, endDate: Date) => void;
  zoomedDateRange?: { startDate: Date; endDate: Date } | null;
}

export default function TemperatureChart(props: TemperatureChartProps) {
  // Always render chart, even if there's no data, to allow period navigation
  return <TemperatureChartClient {...props} />;
}
