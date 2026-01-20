'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { format, parseISO, startOfMonth, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import type { WeightRecord } from '@/lib/api/weightRecords';
import type { BodyFatRecord } from '@/lib/api/bodyFatRecords';
import type { Period } from '@/hooks/useChartDateRange';
import { ChartTitle } from './ChartTitle';
import { getMonthKey } from '@/utils/chartUtils';

interface WeightBodyFatChartClientProps {
  weightRecords: WeightRecord[];
  bodyFatRecords: BodyFatRecord[];
  period: Period;
  dateRange: { startDate: Date; endDate: Date };
  periodTitleRange: string | null;
  weekOffset: number;
  onPrevious: () => void;
  onNext: () => void;
  onZoomChange?: (startDate: Date, endDate: Date) => void;
  zoomedDateRange?: { startDate: Date; endDate: Date } | null;
}

export default function WeightBodyFatChartClient({
  weightRecords,
  bodyFatRecords,
  period,
  dateRange,
  periodTitleRange,
  weekOffset,
  onPrevious,
  onNext,
  onZoomChange,
  zoomedDateRange,
}: WeightBodyFatChartClientProps) {
  const t = useTranslations('daily');
  const [ChartComponents, setChartComponents] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const chartRef = useRef<any>(null);

  // Dynamically load Chart.js only on client-side
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Use direct string literals for dynamic imports
    // Webpack needs to be able to statically analyze the import paths
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
        zoom.default
      );

      setChartComponents({
        ChartJS,
        Line: reactChartJs2.Line,
      });
      setLoadError(null);
      console.log('[WeightBodyFatChart] Chart.js loaded successfully');
    }).catch((error) => {
      console.error('[WeightBodyFatChart] Failed to load Chart.js:', error);
      setLoadError(error.message || 'Failed to load chart library');
    });
  }, []);

  // Prepare data for Chart.js
  // Note: Records are already filtered by zoomed date range in daily/page.tsx
  const chartData = useMemo(() => {
    const weightFiltered = weightRecords;
    const fatFiltered = bodyFatRecords;
    const isMonthlyView = period === '6months' || period === '1year';
    const isDailyView = period === '1week' || period === '1month';
    
    // Use zoomedDateRange if set, otherwise use dateRange
    const effectiveDateRange = zoomedDateRange || dateRange;

    // Create a map to aggregate data by date
    const dataMap = new Map<string, { date: Date; weight?: number; bodyFat?: number; weightCount: number; fatCount: number }>();

    weightFiltered.forEach(record => {
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
        dataMap.set(key, { date: dateObj, weightCount: 0, fatCount: 0 });
      }
      const data = dataMap.get(key)!;
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
        dataMap.set(key, { date: dateObj, weightCount: 0, fatCount: 0 });
      }
      const data = dataMap.get(key)!;
      if (data.bodyFat === undefined) {
        data.bodyFat = record.percentage;
      } else {
        const avgBodyFat = (data.bodyFat * data.fatCount + record.percentage) / (data.fatCount + 1);
        data.bodyFat = Math.round(avgBodyFat * 10) / 10;
      }
      data.fatCount++;
    });

    // Handle different periods - always generate date range even if no data
    if (period === '1week' || period === '1month') {
      const allDays = eachDayOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
      const dataByDate = new Map<string, { weight?: number; bodyFat?: number }>();
      Array.from(dataMap.values()).forEach(item => {
        const dateKey = format(item.date, 'yyyy-MM-dd');
        dataByDate.set(dateKey, {
          weight: item.weight,
          bodyFat: item.bodyFat,
        });
      });

      return allDays.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const data = dataByDate.get(dateKey);
        return {
          date: day,
          weight: data?.weight ?? null,
          bodyFat: data?.bodyFat ?? null,
        };
      });
    }

    if (period === '6months' || period === '1year') {
      const allMonths = eachMonthOfInterval({ start: effectiveDateRange.startDate, end: effectiveDateRange.endDate });
      const dataByMonth = new Map<string, { weight?: number; bodyFat?: number }>();
      Array.from(dataMap.values()).forEach(item => {
        const monthKey = getMonthKey(item.date);
        dataByMonth.set(monthKey, {
          weight: item.weight,
          bodyFat: item.bodyFat,
        });
      });

      return allMonths.map(month => {
        const monthKey = getMonthKey(month);
        const data = dataByMonth.get(monthKey);
        return {
          date: month,
          weight: data?.weight ?? null,
          bodyFat: data?.bodyFat ?? null,
        };
      });
    }

    // Fallback: return sorted data from map
    return Array.from(dataMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(item => ({
        date: item.date,
        weight: item.weight ?? null,
        bodyFat: item.bodyFat ?? null,
      }));
  }, [weightRecords, bodyFatRecords, period, dateRange, zoomedDateRange]);

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

  // Calculate body fat Y-axis domain
  const bodyFatDomain = useMemo(() => {
    const bodyFats = chartData
      .map(d => d.bodyFat)
      .filter((f): f is number => f !== undefined && f !== null && typeof f === 'number');
    if (bodyFats.length === 0) return [0, 50];
    const minBodyFat = Math.min(...bodyFats);
    const maxBodyFat = Math.max(...bodyFats);
    const minDomain = Math.max(0, minBodyFat - 1);
    const maxDomain = maxBodyFat + 1;
    // Round to 1 decimal place for better display
    const roundedMin = Math.floor(minDomain * 10) / 10;
    const roundedMax = Math.ceil(maxDomain * 10) / 10;
    return [roundedMin, roundedMax];
  }, [chartData]);

  // Prepare Chart.js data format
  const chartJsData = useMemo(() => {
    if (!ChartComponents) return null;

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
          min: bodyFatDomain[0],
          max: bodyFatDomain[1],
          ticks: {
            color: textColor,
            stepSize: 1,
            callback: (value: any) => `${value}%`,
          },
          grid: {
            drawOnChartArea: false,
            drawBorder: false,
          },
        },
      },
    };
  }, [period, weightDomain, bodyFatDomain, t, ChartComponents, onZoomChange, dateRange, zoomedDateRange]);

  // Track previous scale values to detect changes
  const prevScaleRef = useRef<{ min: number | null; max: number | null } | null>(null);

  // Reset zoom when period or weekOffset changes
  useEffect(() => {
    if (chartRef.current && ChartComponents) {
      chartRef.current.resetZoom();
      prevScaleRef.current = null;
    }
  }, [period, weekOffset, ChartComponents]);

  // Maintain scale after data updates (only when zoomedDateRange is explicitly set, not during pan/zoom)
  useEffect(() => {
    if (!chartRef.current || !ChartComponents) return;
    
    const chart = chartRef.current;
    if (!chart.scales || !chart.scales.x) return;
    
    // Only maintain scale if zoomedDateRange is set (user has explicitly zoomed)
    // If zoomedDateRange is null, let Chart.js handle the scale naturally
    if (!zoomedDateRange) {
      // For initial load, set to dateRange
      const targetMin = dateRange.startDate.getTime();
      const targetMax = dateRange.endDate.getTime();
      
      const currentMin = typeof chart.scales.x.min === 'number' ? chart.scales.x.min : (typeof chart.scales.x.min === 'string' ? new Date(chart.scales.x.min).getTime() : null);
      const currentMax = typeof chart.scales.x.max === 'number' ? chart.scales.x.max : (typeof chart.scales.x.max === 'string' ? new Date(chart.scales.x.max).getTime() : null);
      
      const minDiff = currentMin !== null ? Math.abs(currentMin - targetMin) : Infinity;
      const maxDiff = currentMax !== null ? Math.abs(currentMax - targetMax) : Infinity;
      
      // Update if scale is significantly different (more than 1 day difference)
      if (minDiff > 86400000 || maxDiff > 86400000) {
        console.log('[WeightBodyFatChart] Setting initial date range:', {
          target: { min: targetMin, max: targetMax },
          current: { min: currentMin, max: currentMax },
        });
        chart.scales.x.min = targetMin;
        chart.scales.x.max = targetMax;
        chart.update('none');
        prevScaleRef.current = {
          min: targetMin,
          max: targetMax,
        };
      }
      return;
    }
    
    // If zoomedDateRange is set, only update if the scale has drifted significantly
    // This allows pan/zoom to work while still maintaining the zoomed range after data updates
    const targetMin = zoomedDateRange.startDate.getTime();
    const targetMax = zoomedDateRange.endDate.getTime();
    
    const currentMin = typeof chart.scales.x.min === 'number' ? chart.scales.x.min : (typeof chart.scales.x.min === 'string' ? new Date(chart.scales.x.min).getTime() : null);
    const currentMax = typeof chart.scales.x.max === 'number' ? chart.scales.x.max : (typeof chart.scales.x.max === 'string' ? new Date(chart.scales.x.max).getTime() : null);
    
    const minDiff = currentMin !== null ? Math.abs(currentMin - targetMin) : Infinity;
    const maxDiff = currentMax !== null ? Math.abs(currentMax - targetMax) : Infinity;
    
    // Only update if scale has drifted significantly (more than 1 day difference)
    // This prevents interfering with active pan/zoom operations
    if (minDiff > 86400000 || maxDiff > 86400000) {
      console.log('[WeightBodyFatChart] Maintaining zoomed date range after data update:', {
        target: { min: targetMin, max: targetMax },
        current: { min: currentMin, max: currentMax },
      });
      chart.scales.x.min = targetMin;
      chart.scales.x.max = targetMax;
      chart.update('none');
      prevScaleRef.current = {
        min: targetMin,
        max: targetMax,
      };
    }
  }, [ChartComponents, zoomedDateRange, dateRange, weightRecords.length, bodyFatRecords.length]);

  // Removed periodic scale change monitoring - only use explicit user interactions (onPanComplete, onZoomComplete, mouse events)

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

  if (!ChartComponents || !chartJsData || !options) {
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
        title={t('chart.titles.weightBodyFat')}
        periodRange={periodTitleRange}
        period={period}
        weekOffset={weekOffset}
        onPrevious={onPrevious}
        onNext={onNext}
      />
      <Line data={chartJsData} options={options} />
    </div>
  );
}
