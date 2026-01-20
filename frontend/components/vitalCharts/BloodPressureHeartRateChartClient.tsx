'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { format, parseISO, startOfMonth, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import type { BloodPressureRecord } from '@/lib/api/bloodPressureRecords';
import type { HeartRateRecord } from '@/lib/api/heartRateRecords';
import type { Period } from '@/hooks/useChartDateRange';
import { ChartTitle } from './ChartTitle';
import { formatXAxisDate, getMonthKey } from '@/utils/chartUtils';

interface BloodPressureHeartRateChartClientProps {
  bloodPressureRecords: BloodPressureRecord[];
  heartRateRecords: HeartRateRecord[];
  period: Period;
  dateRange: { startDate: Date; endDate: Date };
  periodTitleRange: string | null;
  weekOffset: number;
  onPrevious: () => void;
  onNext: () => void;
  onZoomChange?: (startDate: Date, endDate: Date) => void;
  zoomedDateRange?: { startDate: Date; endDate: Date } | null;
}

export default function BloodPressureHeartRateChartClient({
  bloodPressureRecords,
  heartRateRecords,
  period,
  dateRange,
  periodTitleRange,
  weekOffset,
  onPrevious,
  onNext,
  onZoomChange,
  zoomedDateRange,
}: BloodPressureHeartRateChartClientProps) {
  const t = useTranslations('daily');
  const [ChartComponents, setChartComponents] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const chartRef = useRef<any>(null);

  // Dynamically load Chart.js only on client-side
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
      console.error('[BloodPressureHeartRateChart] Failed to load Chart.js:', error);
      setLoadError(error.message || 'Failed to load chart library');
    });
  }, []);

  // Prepare data for Chart.js
  // Note: Records are already filtered by zoomed date range in daily/page.tsx
  const chartData = useMemo(() => {
    const bpFiltered = bloodPressureRecords;
    const hrFiltered = heartRateRecords;
    const isMonthlyView = period === '6months' || period === '1year';
    const isDailyView = period === '1week' || period === '1month';
    
    // Use zoomedDateRange if set, otherwise use dateRange
    const effectiveDateRange = zoomedDateRange || dateRange;

    const dataMap = new Map<string, { date: Date; systolic?: number; diastolic?: number; heartRate?: number; bpCount: number; hrCount: number }>();

    bpFiltered.forEach(record => {
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
        dataMap.set(key, { date: dateObj, bpCount: 0, hrCount: 0 });
      }
      const data = dataMap.get(key)!;
      if (data.systolic === undefined) {
        data.systolic = record.systolic;
        data.diastolic = record.diastolic;
      } else {
        const avgSystolic = (data.systolic * data.bpCount + record.systolic) / (data.bpCount + 1);
        const avgDiastolic = (data.diastolic! * data.bpCount + record.diastolic) / (data.bpCount + 1);
        data.systolic = Math.round(avgSystolic * 10) / 10;
        data.diastolic = Math.round(avgDiastolic * 10) / 10;
      }
      data.bpCount++;
    });

    hrFiltered.forEach(record => {
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
        dataMap.set(key, { date: dateObj, bpCount: 0, hrCount: 0 });
      }
      const data = dataMap.get(key)!;
      if (data.heartRate === undefined) {
        data.heartRate = record.bpm;
      } else {
        const avgHeartRate = (data.heartRate * data.hrCount + record.bpm) / (data.hrCount + 1);
        data.heartRate = Math.round(avgHeartRate * 10) / 10;
      }
      data.hrCount++;
    });

    // Handle different periods
    if (period === '1week' || period === '1month') {
      const allDays = eachDayOfInterval({ start: effectiveDateRange.startDate, end: effectiveDateRange.endDate });
      const dataByDate = new Map<string, { systolic?: number; diastolic?: number; heartRate?: number }>();
      Array.from(dataMap.values()).forEach(item => {
        const dateKey = format(item.date, 'yyyy-MM-dd');
        dataByDate.set(dateKey, {
          systolic: item.systolic,
          diastolic: item.diastolic,
          heartRate: item.heartRate,
        });
      });

      return allDays.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const data = dataByDate.get(dateKey);
        return {
          date: day,
          systolic: data?.systolic ?? null,
          diastolic: data?.diastolic ?? null,
          heartRate: data?.heartRate ?? null,
        };
      });
    }

    if (period === '6months' || period === '1year') {
      const allMonths = eachMonthOfInterval({ start: effectiveDateRange.startDate, end: effectiveDateRange.endDate });
      const dataByMonth = new Map<string, { systolic?: number; diastolic?: number; heartRate?: number }>();
      Array.from(dataMap.values()).forEach(item => {
        const monthKey = getMonthKey(item.date);
        dataByMonth.set(monthKey, {
          systolic: item.systolic,
          diastolic: item.diastolic,
          heartRate: item.heartRate,
        });
      });

      return allMonths.map(month => {
        const monthKey = getMonthKey(month);
        const data = dataByMonth.get(monthKey);
        return {
          date: month,
          systolic: data?.systolic ?? null,
          diastolic: data?.diastolic ?? null,
          heartRate: data?.heartRate ?? null,
        };
      });
    }

    return Array.from(dataMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(item => ({
        date: item.date,
        systolic: item.systolic ?? null,
        diastolic: item.diastolic ?? null,
        heartRate: item.heartRate ?? null,
      }));
  }, [bloodPressureRecords, heartRateRecords, period, dateRange, zoomedDateRange]);

  // Calculate Y-axis domains
  const bpDomain = useMemo(() => {
    const sysValues = chartData.map(d => d.systolic).filter((v): v is number => v !== null && v !== undefined);
    const diaValues = chartData.map(d => d.diastolic).filter((v): v is number => v !== null && v !== undefined);
    const allValues = [...sysValues, ...diaValues];
    if (allValues.length === 0) return [30, 210];
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const minDomain = Math.max(30, Math.floor((min - 10) / 10) * 10);
    const maxDomain = Math.ceil((max + 10) / 10) * 10;
    return [minDomain, maxDomain];
  }, [chartData]);

  const hrDomain = useMemo(() => {
    const hrValues = chartData.map(d => d.heartRate).filter((v): v is number => v !== null && v !== undefined);
    if (hrValues.length === 0) return [30, 210];
    const min = Math.min(...hrValues);
    const max = Math.max(...hrValues);
    const minDomain = Math.max(30, Math.floor((min - 10) / 10) * 10);
    const maxDomain = Math.ceil((max + 10) / 10) * 10;
    return [minDomain, maxDomain];
  }, [chartData]);

  // Prepare Chart.js data format
  const chartJsData = useMemo(() => {
    if (!ChartComponents) return null;

    const systolicData = chartData
      .filter(d => d.systolic !== null && d.systolic !== undefined)
      .map(d => ({ x: d.date.getTime(), y: d.systolic! }));
    
    const diastolicData = chartData
      .filter(d => d.diastolic !== null && d.diastolic !== undefined)
      .map(d => ({ x: d.date.getTime(), y: d.diastolic! }));

    const heartRateData = chartData
      .filter(d => d.heartRate !== null && d.heartRate !== undefined)
      .map(d => ({ x: d.date.getTime(), y: d.heartRate! }));

    return {
      datasets: [
        {
          label: `${t('chart.labels.systolic')} (${t('chart.units.mmHg')})`,
          data: systolicData,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          yAxisID: 'y',
          pointRadius: period === '1week' ? 4 : 0,
          pointHoverRadius: 5,
          tension: 0.1,
          spanGaps: false,
        },
        {
          label: `${t('chart.labels.diastolic')} (${t('chart.units.mmHg')})`,
          data: diastolicData,
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220, 38, 38, 0.1)',
          yAxisID: 'y',
          pointRadius: period === '1week' ? 4 : 0,
          pointHoverRadius: 5,
          tension: 0.1,
          borderDash: [5, 5],
          spanGaps: false,
        },
        {
          label: `${t('chart.labels.heartRate')} (${t('chart.units.bpm')})`,
          data: heartRateData,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          yAxisID: 'y1',
          pointRadius: period === '1week' ? 4 : 0,
          pointHoverRadius: 5,
          tension: 0.1,
          spanGaps: false,
        },
      ],
    };
  }, [chartData, period, t, ChartComponents]);

  // Chart options
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
              let unit = '';
              if (label.includes('mmHg')) {
                unit = ' mmHg';
              } else if (label.includes('bpm')) {
                unit = ' bpm';
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
            threshold: 10,
          },
          onPanStart: () => {
            // Pan started
          },
          onPanComplete: ({ chart }: { chart: any }) => {
            if (!chart || !onZoomChange) {
              return;
            }
            
            const xScale = chart.scales?.x;
            if (!xScale) {
              return;
            }
            
            const min = typeof xScale.min === 'number' ? xScale.min : (typeof xScale.min === 'string' ? new Date(xScale.min).getTime() : null);
            const max = typeof xScale.max === 'number' ? xScale.max : (typeof xScale.max === 'string' ? new Date(xScale.max).getTime() : null);
            
            if (min !== null && max !== null) {
              const startDate = new Date(min);
              const endDate = new Date(max);
              
              if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                onZoomChange(startDate, endDate);
              }
            }
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
            if (!chart || !onZoomChange) {
              return;
            }
            
            const xScale = chart.scales?.x;
            if (!xScale) {
              return;
            }
            
            const min = typeof xScale.min === 'number' ? xScale.min : (typeof xScale.min === 'string' ? new Date(xScale.min).getTime() : null);
            const max = typeof xScale.max === 'number' ? xScale.max : (typeof xScale.max === 'string' ? new Date(xScale.max).getTime() : null);
            
            if (min !== null && max !== null) {
              const startDate = new Date(min);
              const endDate = new Date(max);
              
              if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                onZoomChange(startDate, endDate);
              }
            }
          },
          onPan: () => {
            // Pan event
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
            text: `${t('chart.labels.bloodPressure')} (${t('chart.units.mmHg')})`,
            color: textColor,
          },
          min: bpDomain[0],
          max: bpDomain[1],
          ticks: {
            stepSize: 10,
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
            text: `${t('chart.labels.heartRate')} (${t('chart.units.bpm')})`,
            color: textColor,
          },
          min: hrDomain[0],
          max: hrDomain[1],
          ticks: {
            stepSize: 10,
            color: textColor,
            callback: (value: any) => value.toString(),
          },
          grid: {
            drawOnChartArea: false,
            drawBorder: false,
          },
        },
      },
    };
  }, [period, bpDomain, hrDomain, t, ChartComponents, onZoomChange, dateRange, zoomedDateRange]);

  // Reset zoom when period or weekOffset changes
  useEffect(() => {
    if (chartRef.current && ChartComponents) {
      chartRef.current.resetZoom();
    }
  }, [period, weekOffset, ChartComponents]);

  // Add event listeners to chart after it's created for drag/pan detection
  useEffect(() => {
    if (!chartRef.current || !ChartComponents) return;

    const chart = chartRef.current;

    // Listen for chart update events
    const canvas = chart.canvas;
    if (canvas) {
      let isDragging = false;

      const handleMouseDown = () => {
        isDragging = true;
      };

      const handleMouseUp = () => {
        if (isDragging) {
          isDragging = false;
          
          // Wait a bit for Chart.js to update the scale after pan
          setTimeout(() => {
            if (chart?.scales?.x && onZoomChange) {
              const xScale = chart.scales.x;
              const min = typeof xScale.min === 'number' ? xScale.min : (typeof xScale.min === 'string' ? new Date(xScale.min).getTime() : null);
              const max = typeof xScale.max === 'number' ? xScale.max : (typeof xScale.max === 'string' ? new Date(xScale.max).getTime() : null);
              
              if (min !== null && max !== null) {
                const startDate = new Date(min);
                const endDate = new Date(max);
                
                if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                  onZoomChange(startDate, endDate);
                }
              }
            }
          }, 150);
        }
      };

      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('mouseup', handleMouseUp);
      canvas.addEventListener('mouseleave', handleMouseUp);

      return () => {
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('mouseleave', handleMouseUp);
      };
    }
  }, [ChartComponents, onZoomChange]);

  if (loadError) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
        <ChartTitle
          title={t('chart.titles.bloodPressureHeartRate')}
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
          title={t('chart.titles.bloodPressureHeartRate')}
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
        title={t('chart.titles.bloodPressureHeartRate')}
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
