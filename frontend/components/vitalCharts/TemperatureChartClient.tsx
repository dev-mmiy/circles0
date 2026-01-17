'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { format, parseISO, startOfMonth, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import type { TemperatureRecord } from '@/lib/api/temperatureRecords';
import type { Period } from '@/hooks/useChartDateRange';
import { ChartTitle } from './ChartTitle';
import { formatXAxisDate, getMonthKey } from '@/utils/chartUtils';

interface TemperatureChartClientProps {
  temperatureRecords: TemperatureRecord[];
  period: Period;
  dateRange: { startDate: Date; endDate: Date };
  periodTitleRange: string | null;
  weekOffset: number;
  onPrevious: () => void;
  onNext: () => void;
  onZoomChange?: (startDate: Date, endDate: Date) => void;
}

export default function TemperatureChartClient({
  temperatureRecords,
  period,
  dateRange,
  periodTitleRange,
  weekOffset,
  onPrevious,
  onNext,
  onZoomChange,
  zoomedDateRange,
}: TemperatureChartClientProps) {
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
      console.error('[TemperatureChart] Failed to load Chart.js:', error);
      setLoadError(error.message || 'Failed to load chart library');
    });
  }, []);

  // Prepare data for Chart.js
  // Note: Records are already filtered by zoomed date range in daily/page.tsx
  const chartData = useMemo(() => {
    const filtered = temperatureRecords;
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
      data.sum += record.value;
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
        const temperature = dataByDate.get(dateKey);
        return {
          date: day,
          temperature: temperature ?? null,
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
        const temperature = dataByMonth.get(monthKey);
        return {
          date: month,
          temperature: temperature ?? null,
        };
      });
    }

    return Array.from(dataMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(item => ({
        date: item.date,
        temperature: item.count > 0 ? Math.round((item.sum / item.count) * 10) / 10 : null,
      }));
  }, [temperatureRecords, period, dateRange]);

  const temperatureDomain = useMemo(() => {
    const temps = chartData.map(d => d.temperature).filter((t): t is number => t !== null && t !== undefined);
    if (temps.length === 0) return [34, 43];
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const minDomain = Math.max(34, Math.floor((min - 1) / 1) * 1);
    const maxDomain = Math.ceil((max + 1) / 1) * 1;
    return [minDomain, maxDomain];
  }, [chartData]);

  const chartJsData = useMemo(() => {
    if (!ChartComponents) return null;

    const temperatureData = chartData
      .filter(d => d.temperature !== null && d.temperature !== undefined)
      .map(d => ({ x: d.date.getTime(), y: d.temperature! }));

    return {
      datasets: [
        {
          label: `${t('chart.labels.temperature')} (${t('chart.units.celsius')})`,
          data: temperatureData,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          yAxisID: 'y',
          pointRadius: period === '1week' ? 4 : 0,
          pointHoverRadius: 5,
          tension: 0.1,
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
              return `${nameWithoutUnit}: ${value} °C`;
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
            console.log('[TemperatureChart] ===== onPanStart called =====');
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
            console.log('[TemperatureChart] ===== onPanComplete called =====');
            console.log('[TemperatureChart] Chart:', !!chart, 'onZoomChange:', !!onZoomChange);
            
            if (!chart || !onZoomChange) {
              console.log('[TemperatureChart] Missing chart or onZoomChange, returning');
              return;
            }
            
            const scales = chart.scales;
            const xScale = scales.x;
            if (!xScale) {
              console.log('[TemperatureChart] No xScale found');
              return;
            }
            
            // Get the panned range
            let min = xScale.min;
            let max = xScale.max;
            
            console.log('[TemperatureChart] xScale min/max:', { 
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
              console.log('[TemperatureChart] Invalid min value:', min);
              return;
            }
            
            if (typeof max === 'number') {
              endDate = new Date(max);
            } else if (max instanceof Date) {
              endDate = max;
            } else if (typeof max === 'string') {
              endDate = new Date(max);
            } else {
              console.log('[TemperatureChart] Invalid max value:', max);
              return;
            }
            
            // Check if dates are valid
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              console.log('[TemperatureChart] Pan complete, calling onZoomChange:', {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
              });
              onZoomChange(startDate, endDate);
            } else {
              console.log('[TemperatureChart] Invalid dates:', { startDate, endDate });
            }
          },
          onPan: ({ chart }: { chart: any }) => {
            console.log('[TemperatureChart] onPan event fired');
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
            text: `${t('chart.labels.temperature')} (${t('chart.units.celsius')})`,
            color: textColor,
          },
          min: temperatureDomain[0],
          max: temperatureDomain[1],
          ticks: {
            stepSize: 1,
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
  }, [period, temperatureDomain, t, ChartComponents, onZoomChange, dateRange, zoomedDateRange]);

  useEffect(() => {
    if (chartRef.current && ChartComponents) {
      chartRef.current.resetZoom();
    }
  }, [period, weekOffset, ChartComponents]);

  if (loadError) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
        <ChartTitle
          title={t('chart.titles.temperature')}
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
          title={t('chart.titles.temperature')}
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
        title={t('chart.titles.temperature')}
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
