'use client';

import { useTranslations } from 'next-intl';
import type { WeightRecord } from '@/lib/api/weightRecords';
import type { BodyFatRecord } from '@/lib/api/bodyFatRecords';
import type { Period } from '@/hooks/useChartDateRange';
import dynamic from 'next/dynamic';

// Dynamically import Chart.js component to avoid SSR issues
// Use a function that returns a promise to ensure it's only loaded on client
const WeightBodyFatChartClient = dynamic(
  () => {
    // This check prevents Next.js from trying to resolve the module during build
    if (typeof window === 'undefined') {
      // Return a dummy component for SSR
      return Promise.resolve({
        default: () => null,
      });
    }
    // Only import on client-side
    return import('./WeightBodyFatChartClient');
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

interface WeightBodyFatChartProps {
  weightRecords: WeightRecord[];
  bodyFatRecords: BodyFatRecord[];
  period: Period;
  dateRange: { startDate: Date; endDate: Date };
  periodTitleRange: string | null;
  weekOffset: number;
  onPrevious: () => void;
  onNext: () => void;
}

export default function WeightBodyFatChart(props: WeightBodyFatChartProps) {
  // Check if there's any data to display
  const hasData = props.weightRecords.length > 0 || props.bodyFatRecords.length > 0;
  
  if (!hasData) {
    return null;
  }

  return <WeightBodyFatChartClient {...props} />;
}
