'use client';

import { useMemo, useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';
import { Line } from 'react-chartjs-2';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import type { WeightRecord } from '@/lib/api/weightRecords';
import type { BodyFatRecord } from '@/lib/api/bodyFatRecords';
import type { Period } from '@/hooks/useChartDateRange';
import { ChartTitle } from './ChartTitle';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin
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

export default function WeightBodyFatChart({
  weightRecords,
  bodyFatRecords,
  period,
  dateRange,
  periodTitleRange,
  weekOffset,
  onPrevious,
  onNext,
}: WeightBodyFatChartProps) {
  const t = useTranslations('daily');
  const chartRef = useRef<ChartJS<'line'>>(null);

  // Filter records by date range
  const filterRecords = <T extends { recorded_at: string }>(records: T[]): T[] => {
    return records.filter(record => {
      const recordDate = parseISO(record.recorded_at);
      const recordDateOnly = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
      const startDateOnly = new Date(dateRange.startDate.getFullYear(), dateRange.startDate.getMonth(), dateRange.startDate.getDate());
      const endDateOnly = new Date(dateRange.endDate.getFullYear(), dateRange.endDate.getMonth(), dateRange.endDate.getDate());
      return recordDateOnly >= startDateOnly && recordDateOnly <= endDateOnly;
    });
  };

  // Prepare data for Chart.js
  const chartData = useMemo(() => {
    const weightFiltered = filterRecords(weightRecords);
    const fatFiltered = filterRecords(bodyFatRecords);
    const isDailyView = period === '1week' || period === '1month';

    // Create a map to aggregate data by date
    const dataMap = new Map<string, { date: Date; weight?: number; bodyFat?: number; weightCount: number; fatCount: number }>();

    weightFiltered.forEach(record => {
      const recordDate = parseISO(record.recorded_at);
      const dateKey = isDailyView 
        ? format(recordDate, 'yyyy-MM-dd')
        : record.recorded_at;
      const dateObj = isDailyView 
        ? new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate())
        : recordDate;
      
      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, { date: dateObj, weightCount: 0, fatCount: 0 });
      }
      const data = dataMap.get(dateKey)!;
      if (data.weight === undefined) {
        data.weight = record.value;
      } else {
        const avgWeight = (data.weight * data.weightCount + record.value) / (data.weightCount + 1);
        data.weight = Math.round(avgWeight * 10) / 10;
      }
      data.weightCount++;
    });

    fatFiltered.forEach(record => {
      const recordDate = parseISO(record.recorded_at);
      const dateKey = isDailyView 
        ? format(recordDate, 'yyyy-MM-dd')
        : record.recorded_at;
      const dateObj = isDailyView 
        ? new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate())
        : recordDate;
      
      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, { date: dateObj, weightCount: 0, fatCount: 0 });
      }
      const data = dataMap.get(dateKey)!;
      if (data.bodyFat === undefined) {
        data.bodyFat = record.percentage;
      } else {
        const avgBodyFat = (data.bodyFat * data.fatCount + record.percentage) / (data.fatCount + 1);
        data.bodyFat = Math.round(avgBodyFat * 10) / 10;
      }
      data.fatCount++;
    });

    // Convert to array and sort by date
    const sortedData = Array.from(dataMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return sortedData;
  }, [weightRecords, bodyFatRecords, period, dateRange]);

  // Calculate weight Y-axis domain
  const weightDomain = useMemo(() => {
    const weights = chartData
      .map(d => d.weight)
      .filter((w): w is number => w !== undefined && w !== null && typeof w === 'number');
    if (weights.length === 0) return [0, 100];
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const minDomain = Math.max(0, minWeight - 10);
    const maxDomain = maxWeight + 10;
    const roundedMin = Math.floor(minDomain);
    const roundedMax = Math.ceil(maxDomain);
    return [roundedMin, roundedMax];
  }, [chartData]);

  // Prepare Chart.js data format
  const chartJsData = useMemo(() => {
    // For time scale, data should be in {x, y} format
    const weightData = chartData
      .filter(d => d.weight !== undefined && d.weight !== null)
      .map(d => ({ x: d.date.getTime(), y: d.weight! }));
    
    const bodyFatData = chartData
      .filter(d => d.bodyFat !== undefined && d.bodyFat !== null)
      .map(d => ({ x: d.date.getTime(), y: d.bodyFat! }));

    return {
      datasets: [
        {
          label: `${t('chart.labels.weight')} (${t('chart.units.kg')})`,
          data: weightData,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          yAxisID: 'y',
          pointRadius: period === '1week' ? 4 : 0,
          pointHoverRadius: 5,
          tension: 0.1,
          spanGaps: false,
        },
        {
          label: `${t('chart.labels.bodyFat')} (${t('chart.units.percent')})`,
          data: bodyFatData,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          yAxisID: 'y1',
          pointRadius: period === '1week' ? 4 : 0,
          pointHoverRadius: 5,
          tension: 0.1,
          spanGaps: false,
        },
      ],
    };
  }, [chartData, period, t]);

  // Chart options
  const options = useMemo(() => {
    const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#d1d5db' : '#374151';
    const gridColor = isDark ? '#374151' : '#e5e7eb';

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            color: textColor,
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: gridColor,
          borderWidth: 1,
          callbacks: {
            label: (context: any) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              if (value === null) return null;
              
              // Remove units from label for display
              const nameWithoutUnit = label.replace(/\s*\([^)]*\)\s*/g, '');
              
              // Determine unit
              let unit = '';
              if (label.includes('kg')) {
                unit = ' kg';
              } else if (label.includes('%')) {
                unit = '%';
              }
              
              return `${nameWithoutUnit}: ${value}${unit}`;
            },
          },
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'x' as const,
            modifierKey: null,
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: 'x' as const,
          },
        },
      },
      scales: {
        x: {
          type: 'time' as const,
          time: {
            unit: period === '1week' || period === '1month' ? 'day' as const : 'month' as const,
            displayFormats: {
              day: 'MM/dd',
              month: 'yyyy/MM',
            },
          },
          ticks: {
            color: textColor,
            maxRotation: 45,
            minRotation: 0,
          },
          grid: {
            color: gridColor,
            drawBorder: false,
          },
        },
        y: {
          type: 'linear' as const,
          position: 'left' as const,
          title: {
            display: true,
            text: `${t('chart.labels.weight')} (${t('chart.units.kg')})`,
            color: textColor,
          },
          min: weightDomain[0],
          max: weightDomain[1],
          ticks: {
            stepSize: 5,
            color: textColor,
            callback: (value: any) => value.toString(),
          },
          grid: {
            color: gridColor,
            drawBorder: false,
          },
        },
        y1: {
          type: 'linear' as const,
          position: 'right' as const,
          title: {
            display: true,
            text: `${t('chart.labels.bodyFat')} (${t('chart.units.percent')})`,
            color: textColor,
          },
          ticks: {
            color: textColor,
          },
          grid: {
            drawOnChartArea: false,
            drawBorder: false,
          },
        },
      },
    };
  }, [period, weightDomain, t]);

  // Reset zoom when period or weekOffset changes
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  }, [period, weekOffset]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
      <ChartTitle
        title={t('chart.titles.weightBodyFat')}
        periodRange={periodTitleRange}
        period={period}
        weekOffset={weekOffset}
        onPrevious={onPrevious}
        onNext={onNext}
      />
      <div style={{ height: '300px', position: 'relative' }}>
        <Line ref={chartRef} data={chartJsData} options={options} />
      </div>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {t('chart.zoomHint') || 'ドラッグで移動、マウスホイールでズーム'}
      </div>
    </div>
  );
}
