import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale/ja';
import type { DateRange } from '@/hooks/useChartDateRange';
import type { Period } from '@/hooks/useChartDateRange';

/**
 * Filter records by date range
 */
export function filterByDateRange<T extends { recorded_at: string }>(
  records: T[],
  dateRange: DateRange,
  period: Period
): T[] {
  const filtered = records.filter(record => {
    const recordDate = parseISO(record.recorded_at);
    // 日付のみで比較（時刻を無視）
    const recordDateOnly = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
    const startDateOnly = new Date(dateRange.startDate.getFullYear(), dateRange.startDate.getMonth(), dateRange.startDate.getDate());
    const endDateOnly = new Date(dateRange.endDate.getFullYear(), dateRange.endDate.getMonth(), dateRange.endDate.getDate());
    return recordDateOnly >= startDateOnly && recordDateOnly <= endDateOnly;
  });
  
  // デバッグログ（1か月の場合のみ）
  if (period === '1month') {
    console.log('[VitalCharts] filterByDateRange:', {
      period,
      totalRecords: records.length,
      filteredRecords: filtered.length,
      dateRange: {
        start: format(dateRange.startDate, 'yyyy-MM-dd'),
        end: format(dateRange.endDate, 'yyyy-MM-dd'),
      },
    });
  }
  
  return filtered;
}

/**
 * Format period title range
 */
export function formatPeriodTitleRange(period: Period, dateRange: DateRange): string | null {
  if (period === '1week' || period === '1month') {
    const start = format(dateRange.startDate, 'M/d', { locale: ja });
    const end = format(dateRange.endDate, 'M/d', { locale: ja });
    return `${start} - ${end}`;
  } else if (period === '6months' || period === '1year') {
    const start = format(dateRange.startDate, 'yyyy年M月', { locale: ja });
    const end = format(dateRange.endDate, 'yyyy年M月', { locale: ja });
    return `${start} - ${end}`;
  }
  return null;
}

/**
 * Format X-axis date label
 */
export function formatXAxisDate(date: string | Date, period: Period): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  switch (period) {
    case '1week':
      return format(d, 'M/d', { locale: ja });
    case '1month':
      return format(d, 'M/d', { locale: ja });
    case '6months':
      return format(d, 'M月', { locale: ja });
    case '1year':
      return format(d, 'M/d', { locale: ja });
    default:
      return format(d, 'M/d', { locale: ja });
  }
}

/**
 * Get month key for grouping
 */
export function getMonthKey(date: Date): string {
  return format(date, 'yyyy-MM');
}

