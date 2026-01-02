import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Period } from '@/hooks/useChartDateRange';

interface ChartTitleProps {
  title: string;
  periodRange: string | null;
  period: Period;
  weekOffset: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function ChartTitle({
  title,
  periodRange,
  period,
  weekOffset,
  onPrevious,
  onNext,
}: ChartTitleProps) {
  const t = useTranslations('daily');
  const getAriaLabel = (direction: 'previous' | 'next') => {
    const labels: Record<Period, { previous: string; next: string }> = {
      '1week': { previous: t('chart.navigation.previousWeek'), next: t('chart.navigation.nextWeek') },
      '1month': { previous: t('chart.navigation.previousPeriod'), next: t('chart.navigation.nextPeriod') },
      '6months': { previous: t('chart.navigation.previous6Months'), next: t('chart.navigation.next6Months') },
      '1year': { previous: t('chart.navigation.previousYear'), next: t('chart.navigation.nextYear') },
    };
    return labels[period][direction];
  };

  return (
    <div className="flex items-center justify-between mb-3">
      <button
        onClick={onPrevious}
        className="p-1 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        aria-label={getAriaLabel('previous')}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {title}
        {periodRange && (
          <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
            ({periodRange})
          </span>
        )}
      </h3>
      <button
        onClick={onNext}
        disabled={weekOffset === 0}
        className={`p-1 rounded-lg transition-colors ${
          weekOffset > 0
            ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
            : 'opacity-0 cursor-default'
        }`}
        aria-label={getAriaLabel('next')}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

