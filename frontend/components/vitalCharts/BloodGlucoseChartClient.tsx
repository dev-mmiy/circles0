'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { format, parseISO, startOfMonth, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import type { BloodGlucoseRecord } from '@/lib/api/bloodGlucoseRecords';
import type { Period } from '@/hooks/useChartDateRange';
import { ChartTitle } from './ChartTitle';
import { formatXAxisDate, getMonthKey } from '@/utils/chartUtils';

interface BloodGlucoseChartClientProps {
  bloodGlucoseRecords: BloodGlucoseRecord[];
  period: Period;
  dateRange: { startDate: Date; endDate: Date };
  periodTitleRange: string | null;
  weekOffset: number;
  onPrevious: () => void;
  onNext: () => void;
  onZoomChange?: (startDate: Date, endDate: Date) => void;
  zoomedDateRange?: { startDate: Date; endDate: Date } | null;
}

export default function BloodGlucoseChartClient({
  bloodGlucoseRecords,
  period,
  dateRange,
  periodTitleRange,
  weekOffset,
  onPrevious,
  onNext,
  onZoomChange,
  zoomedDateRange,
}: BloodGlucoseChartClientProps) {
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
      console.error('[BloodGlucoseChart] Failed to load Chart.js:', error);
      setLoadError(error.message || 'Failed to load chart library');
    });
  }, []);

  // Prepare data for Chart.js
  // Note: Records are already filtered by zoomed date range in daily/page.tsx
  const chartData = useMemo(() => {
    const filtered = bloodGlucoseRecords;
    const isMonthlyView = period === '6months' || period === '1year';
    const isDailyView = period === '1week' || period === '1month';
    
    // Use zoomedDateRange if set, otherwise use dateRange
    const effectiveDateRange = zoomedDateRange || dateRange;

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
      const allDays = eachDayOfInterval({ start: effectiveDateRange.startDate, end: effectiveDateRange.endDate });
      const dataByDate = new Map<string, number>();
      Array.from(dataMap.values()).forEach(item => {
        const dateKey = format(item.date, 'yyyy-MM-dd');
        if (item.count > 0) {
          dataByDate.set(dateKey, Math.round((item.sum / item.count) * 10) / 10);
        }
      });

      return allDays.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const bloodGlucose = dataByDate.get(dateKey);
        return {
          date: day,
          bloodGlucose: bloodGlucose ?? null,
        };
      });
    }

    if (period === '6months' || period === '1year') {
      const allMonths = eachMonthOfInterval({ start: effectiveDateRange.startDate, end: effectiveDateRange.endDate });
      const dataByMonth = new Map<string, number>();
      Array.from(dataMap.values()).forEach(item => {
        const monthKey = getMonthKey(item.date);
        if (item.count > 0) {
          dataByMonth.set(monthKey, Math.round((item.sum / item.count) * 10) / 10);
        }
      });

      return allMonths.map(month => {
        const monthKey = getMonthKey(month);
        const bloodGlucose = dataByMonth.get(monthKey);
        return {
          date: month,
          bloodGlucose: bloodGlucose ?? null,
        };
      });
    }

    return Array.from(dataMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(item => ({
        date: item.date,
        bloodGlucose: item.count > 0 ? Math.round((item.sum / item.count) * 10) / 10 : null,
      }));
  }, [bloodGlucoseRecords, period, dateRange, zoomedDateRange]);

  const glucoseDomain = useMemo(() => {
    const values = chartData.map(d => d.bloodGlucose).filter((v): v is number => v !== null && v !== undefined);
    if (values.length === 0) return [0, 200];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const minDomain = Math.max(0, Math.floor((min - 20) / 20) * 20);
    const maxDomain = Math.ceil((max + 20) / 20) * 20;
    return [minDomain, maxDomain];
  }, [chartData]);

  const chartJsData = useMemo(() => {
    if (!ChartComponents) return null;

    const glucoseData = chartData
      .filter(d => d.bloodGlucose !== null && d.bloodGlucose !== undefined)
      .map(d => ({ x: d.date.getTime(), y: d.bloodGlucose! }));

    return {
      datasets: [
        {
          label: `${t('chart.labels.bloodGlucose')} (${t('chart.units.mgdL')})`,
          data: glucoseData,
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.3)',
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
              return `${nameWithoutUnit}: ${value} mg/dL`;
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
            if (!chart || !onZoomChange) {
              return;
            }
            
            // Use a small delay to ensure Chart.js has updated the scale
            setTimeout(() => {
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
            }, 50);
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
            text: `${t('chart.labels.bloodGlucose')} (${t('chart.units.mgdL')})`,
            color: textColor,
          },
          min: glucoseDomain[0],
          max: glucoseDomain[1],
          ticks: {
            stepSize: 20,
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
  }, [period, glucoseDomain, t, ChartComponents, onZoomChange, dateRange, zoomedDateRange]);

  useEffect(() => {
    if (chartRef.current && ChartComponents) {
      chartRef.current.resetZoom();
    }
  }, [period, weekOffset, ChartComponents]);

  // Add event listeners to chart after it's created for drag/pan detection
  // Supports both mouse (desktop) and touch (mobile) events
  useEffect(() => {
    if (!chartRef.current || !ChartComponents) return;

    const chart = chartRef.current;
    const canvas = chart.canvas;
    if (canvas) {
      let isDragging = false;
      let dragStartX = 0;
      let panTimeoutId: NodeJS.Timeout | null = null;

      // Common function to check scale and call onZoomChange
      const checkScaleAndUpdate = () => {
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
      };

      // Mouse events (desktop)
      const handleMouseDown = (e: MouseEvent) => {
        isDragging = true;
        dragStartX = e.clientX;
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          const dragDistance = Math.abs(e.clientX - dragStartX);
          if (dragDistance > 10) {
            if (panTimeoutId) {
              clearTimeout(panTimeoutId);
            }
            panTimeoutId = setTimeout(() => {
              if (!isDragging) {
                checkScaleAndUpdate();
              }
            }, 100);
          }
        }
      };

      const handleMouseUp = () => {
        if (isDragging) {
          isDragging = false;
          if (panTimeoutId) {
            clearTimeout(panTimeoutId);
            panTimeoutId = null;
          }
          setTimeout(() => {
            checkScaleAndUpdate();
          }, 150);
        }
      };

      // Touch events (mobile)
      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          isDragging = true;
          dragStartX = e.touches[0].clientX;
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (isDragging && e.touches.length === 1) {
          const dragDistance = Math.abs(e.touches[0].clientX - dragStartX);
          if (dragDistance > 10) {
            if (panTimeoutId) {
              clearTimeout(panTimeoutId);
            }
            panTimeoutId = setTimeout(() => {
              if (!isDragging) {
                checkScaleAndUpdate();
              }
            }, 100);
          }
        }
      };

      const handleTouchEnd = () => {
        if (isDragging) {
          isDragging = false;
          if (panTimeoutId) {
            clearTimeout(panTimeoutId);
            panTimeoutId = null;
          }
          setTimeout(() => {
            checkScaleAndUpdate();
          }, 150);
        }
      };

      // Add mouse event listeners
      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseup', handleMouseUp);
      canvas.addEventListener('mouseleave', handleMouseUp);

      // Add touch event listeners
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd);
      canvas.addEventListener('touchcancel', handleTouchEnd);

      return () => {
        if (panTimeoutId) {
          clearTimeout(panTimeoutId);
        }
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('mouseleave', handleMouseUp);
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('touchcancel', handleTouchEnd);
      };
    }
  }, [ChartComponents, onZoomChange]);

  if (loadError) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
        <ChartTitle
          title={t('chart.titles.bloodGlucose')}
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
          title={t('chart.titles.bloodGlucose')}
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
        title={t('chart.titles.bloodGlucose')}
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
