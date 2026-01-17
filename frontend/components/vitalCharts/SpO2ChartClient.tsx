'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { format, parseISO, startOfMonth, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import type { SpO2Record } from '@/lib/api/spo2Records';
import type { Period } from '@/hooks/useChartDateRange';
import { ChartTitle } from './ChartTitle';
import { formatXAxisDate, getMonthKey } from '@/utils/chartUtils';

interface SpO2ChartClientProps {
  spo2Records: SpO2Record[];
  period: Period;
  dateRange: { startDate: Date; endDate: Date };
  periodTitleRange: string | null;
  weekOffset: number;
  onPrevious: () => void;
  onNext: () => void;
  onZoomChange?: (startDate: Date, endDate: Date) => void;
}

export default function SpO2ChartClient({
  spo2Records,
  period,
  dateRange,
  periodTitleRange,
  weekOffset,
  onPrevious,
  onNext,
  onZoomChange,
  zoomedDateRange,
}: SpO2ChartClientProps) {
  const t = useTranslations('daily');
  const [ChartComponents, setChartComponents] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    Promise.all([
      import(/* webpackChunkName: "chartjs" */ 'chart.js'),
      import(/* webpackChunkName: "chartjs-zoom" */ 'chartjs-plugin-zoom'),
      import(/* webpackChunkName: "chartjs-adapter" */ 'chartjs-adapter-date-fns'),
      import(/* webpackChunkName: "react-chartjs" */ 'react-chartjs-2'),
    ]).then(([chartJs, zoom, adapter, reactChartJs2]) => {
      const ChartJS = chartJs.Chart;
      const {
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        Filler,
        Title,
        Tooltip,
        Legend,
        TimeScale,
      } = chartJs;

      ChartJS.register(
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        Filler,
        Title,
        Tooltip,
        Legend,
        TimeScale,
        zoom.default
      );

      setChartComponents({
        ChartJS,
        Line: reactChartJs2.Line,
      });
      setLoadError(null);
    }).catch((error) => {
      console.error('[SpO2Chart] Failed to load Chart.js:', error);
      setLoadError(error.message || 'Failed to load chart library');
    });
  }, []);

  // Prepare data for Chart.js
  // Note: Records are already filtered by zoomed date range in daily/page.tsx
  const chartData = useMemo(() => {
    const filtered = spo2Records;
    const isMonthlyView = period === '6months' || period === '1year';
    const isDailyView = period === '1week' || period === '1month';

    const dataMap = new Map<string, { date: Date; sum: number; count: number }>();

    filtered.forEach(record => {
      const recordDate = parseISO(record.recorded_at);
      const key = isMonthlyView 
        ? getMonthKey(recordDate) 
        : isDailyView 
          ? format(recordDate, 'yyyy-MM-dd')
          : record.recorded_at;
      const dateObj = isMonthlyView 
        ? startOfMonth(recordDate) 
        : isDailyView
          ? new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate())
          : recordDate;
      
      if (!dataMap.has(key)) {
        dataMap.set(key, { date: dateObj, sum: 0, count: 0 });
      }
      const data = dataMap.get(key)!;
      data.sum += record.percentage;
      data.count++;
    });

    if (period === '1week' || period === '1month') {
      const allDays = eachDayOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
      const dataByDate = new Map<string, number>();
      Array.from(dataMap.values()).forEach(item => {
        const dateKey = format(item.date, 'yyyy-MM-dd');
        if (item.count > 0) {
          dataByDate.set(dateKey, Math.round((item.sum / item.count) * 10) / 10);
        }
      });

      return allDays.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const spo2 = dataByDate.get(dateKey);
        return {
          date: day,
          spo2: spo2 ?? null,
        };
      });
    }

    if (period === '6months' || period === '1year') {
      const allMonths = eachMonthOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
      const dataByMonth = new Map<string, number>();
      Array.from(dataMap.values()).forEach(item => {
        const monthKey = getMonthKey(item.date);
        if (item.count > 0) {
          dataByMonth.set(monthKey, Math.round((item.sum / item.count) * 10) / 10);
        }
      });

      return allMonths.map(month => {
        const monthKey = getMonthKey(month);
        const spo2 = dataByMonth.get(monthKey);
        return {
          date: month,
          spo2: spo2 ?? null,
        };
      });
    }

    return Array.from(dataMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(item => ({
        date: item.date,
        spo2: item.count > 0 ? Math.round((item.sum / item.count) * 10) / 10 : null,
      }));
  }, [spo2Records, period, dateRange]);

  const spo2Domain = useMemo(() => {
    const values = chartData.map(d => d.spo2).filter((v): v is number => v !== null && v !== undefined);
    if (values.length === 0) return [70, 100];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const minDomain = Math.max(70, Math.floor((min - 5) / 5) * 5);
    const maxDomain = Math.min(100, Math.ceil((max + 5) / 5) * 5);
    return [minDomain, maxDomain];
  }, [chartData]);

  const chartJsData = useMemo(() => {
    if (!ChartComponents) return null;

    const spo2Data = chartData
      .filter(d => d.spo2 !== null && d.spo2 !== undefined)
      .map(d => ({ x: d.date.getTime(), y: d.spo2! }));

    return {
      datasets: [
        {
          label: `${t('chart.labels.spo2')} (${t('chart.units.percent')})`,
          data: spo2Data,
          borderColor: '#ec4899',
          backgroundColor: 'rgba(236, 72, 153, 0.3)',
          yAxisID: 'y',
          pointRadius: period === '1week' ? 4 : 0,
          pointHoverRadius: 5,
          tension: 0.1,
          fill: true,
          spanGaps: false,
        },
      ],
    };
  }, [chartData, period, t, ChartComponents]);

  const options = useMemo(() => {
    if (!ChartComponents) return null;

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
              
              const nameWithoutUnit = label.replace(/\s*\([^)]*\)\s*/g, '');
              return `${nameWithoutUnit}: ${value}%`;
            },
          },
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'x' as const,
            modifierKey: null,
            threshold: 10,
          },
          onPanStart: ({ chart }: { chart: any }) => {
            console.log('[SpO2Chart] ===== onPanStart called =====');
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
          onZoomComplete: ({ chart }: { chart: any }) => {
            if (!chart || !onZoomChange) return;
            
            const scales = chart.scales;
            const xScale = scales.x;
            if (!xScale) return;
            
            // Get the zoomed range - for time scale, min/max are typically numbers (timestamps)
            let min = xScale.min;
            let max = xScale.max;
            
            // Convert to Date objects
            let startDate: Date;
            let endDate: Date;
            
            if (typeof min === 'number') {
              startDate = new Date(min);
            } else if (min instanceof Date) {
              startDate = min;
            } else if (typeof min === 'string') {
              startDate = new Date(min);
            } else {
              return;
            }
            
            if (typeof max === 'number') {
              endDate = new Date(max);
            } else if (max instanceof Date) {
              endDate = max;
            } else if (typeof max === 'string') {
              endDate = new Date(max);
            } else {
              return;
            }
            
            // Check if dates are valid
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              onZoomChange(startDate, endDate);
            }
          },
          onPanComplete: ({ chart }: { chart: any }) => {
            console.log('[SpO2Chart] ===== onPanComplete called =====');
            console.log('[SpO2Chart] Chart:', !!chart, 'onZoomChange:', !!onZoomChange);
            
            if (!chart || !onZoomChange) {
              console.log('[SpO2Chart] Missing chart or onZoomChange, returning');
              return;
            }
            
            const scales = chart.scales;
            const xScale = scales.x;
            if (!xScale) {
              console.log('[SpO2Chart] No xScale found');
              return;
            }
            
            // Get the panned range
            let min = xScale.min;
            let max = xScale.max;
            
            console.log('[SpO2Chart] xScale min/max:', { 
              min, 
              max, 
              minType: typeof min, 
              maxType: typeof max 
            });
            
            // Convert to Date objects
            let startDate: Date;
            let endDate: Date;
            
            if (typeof min === 'number') {
              startDate = new Date(min);
            } else if (min instanceof Date) {
              startDate = min;
            } else if (typeof min === 'string') {
              startDate = new Date(min);
            } else {
              console.log('[SpO2Chart] Invalid min value:', min);
              return;
            }
            
            if (typeof max === 'number') {
              endDate = new Date(max);
            } else if (max instanceof Date) {
              endDate = max;
            } else if (typeof max === 'string') {
              endDate = new Date(max);
            } else {
              console.log('[SpO2Chart] Invalid max value:', max);
              return;
            }
            
            // Check if dates are valid
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              console.log('[SpO2Chart] Pan complete, calling onZoomChange:', {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
              });
              onZoomChange(startDate, endDate);
            } else {
              console.log('[SpO2Chart] Invalid dates:', { startDate, endDate });
            }
          },
          onPan: ({ chart }: { chart: any }) => {
            console.log('[SpO2Chart] onPan event fired');
          },
        },
      },
      scales: {
        x: {
          type: 'time' as const,
          min: zoomedDateRange ? zoomedDateRange.startDate.getTime() : dateRange.startDate.getTime(),
          max: zoomedDateRange ? zoomedDateRange.endDate.getTime() : dateRange.endDate.getTime(),
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
            text: `${t('chart.labels.spo2')} (${t('chart.units.percent')})`,
            color: textColor,
          },
          min: spo2Domain[0],
          max: spo2Domain[1],
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
      },
    };
  }, [period, spo2Domain, t, ChartComponents, onZoomChange, dateRange, zoomedDateRange]);

  useEffect(() => {
    if (chartRef.current && ChartComponents) {
      chartRef.current.resetZoom();
    }
  }, [period, weekOffset, ChartComponents]);

  if (loadError) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
        <ChartTitle
          title={t('chart.titles.spo2')}
          periodRange={periodTitleRange}
          period={period}
          weekOffset={weekOffset}
          onPrevious={onPrevious}
          onNext={onNext}
        />
        <div className="h-[300px] flex items-center justify-center">
          <div className="text-red-600 dark:text-red-400">
            <p>チャートの読み込みに失敗しました</p>
            <p className="text-sm mt-2">{loadError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!ChartComponents || !chartJsData || !options) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
        <ChartTitle
          title={t('chart.titles.spo2')}
          periodRange={periodTitleRange}
          period={period}
          weekOffset={weekOffset}
          onPrevious={onPrevious}
          onNext={onNext}
        />
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const { Line } = ChartComponents;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
      <ChartTitle
        title={t('chart.titles.spo2')}
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
