'use client';

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
  Brush,
} from 'recharts';
import { format, subDays, subMonths, subYears, parseISO, startOfMonth, startOfWeek, endOfWeek, endOfMonth, eachDayOfInterval, addDays } from 'date-fns';
import { ja } from 'date-fns/locale/ja';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BloodPressureRecord } from '@/lib/api/bloodPressureRecords';
import type { HeartRateRecord } from '@/lib/api/heartRateRecords';
import type { TemperatureRecord } from '@/lib/api/temperatureRecords';
import type { WeightRecord } from '@/lib/api/weightRecords';
import type { BodyFatRecord } from '@/lib/api/bodyFatRecords';
import type { BloodGlucoseRecord } from '@/lib/api/bloodGlucoseRecords';
import type { SpO2Record } from '@/lib/api/spo2Records';

type Period = '1week' | '1month' | '6months' | '1year';

interface VitalChartsProps {
  period: Period;
  bloodPressureRecords: BloodPressureRecord[];
  heartRateRecords: HeartRateRecord[];
  temperatureRecords: TemperatureRecord[];
  weightRecords: WeightRecord[];
  bodyFatRecords: BodyFatRecord[];
  bloodGlucoseRecords: BloodGlucoseRecord[];
  spo2Records: SpO2Record[];
}

export default function VitalCharts({
  period,
  bloodPressureRecords,
  heartRateRecords,
  temperatureRecords,
  weightRecords,
  bodyFatRecords,
  bloodGlucoseRecords,
  spo2Records,
}: VitalChartsProps) {
  // 1週間チャートの場合、表示する週の開始日を管理
  const [weekOffset, setWeekOffset] = useState(0); // 0 = 今週、1 = 1週間前、-1 = 1週間後

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case '1week':
        // 1週間チャート：weekOffsetに基づいて表示する週を決定
        const weekTargetStart = startOfWeek(subDays(now, weekOffset * 7), { weekStartsOn: 0 });
        startDate = weekTargetStart;
        endDate = addDays(weekTargetStart, 6); // 週の終わり（土曜日）
        break;
      case '1month':
        // 1か月チャート：weekOffsetに基づいて表示する5週間を決定
        // weekOffset = 0: 現在の週を含む5週間
        // weekOffset = 1: 1か月前の週を含む5週間
        // 1か月 = 約4週間なので、weekOffset * 4週間分移動
        const monthCurrentWeekStart = startOfWeek(now, { weekStartsOn: 0 });
        const monthTargetWeekStart = startOfWeek(subDays(monthCurrentWeekStart, weekOffset * 4 * 7), { weekStartsOn: 0 });
        startDate = monthTargetWeekStart;
        endDate = addDays(monthTargetWeekStart, 34); // 5週間分（35日 - 1日 = 34日後）
        break;
      case '6months':
        // 半年チャート：weekOffsetに基づいて表示する6か月を決定
        // weekOffset = 0: 現在の月から過去6か月
        // weekOffset = 1: 6か月前からさらに6か月前（12か月前から6か月前まで）
        const sixMonthsEndMonth = weekOffset === 0 ? now : subMonths(now, weekOffset * 6);
        const sixMonthsStartMonth = subMonths(sixMonthsEndMonth, 6);
        startDate = startOfMonth(sixMonthsStartMonth);
        endDate = subDays(startOfMonth(sixMonthsEndMonth), 1); // 終了月の前日まで
        break;
      case '1year':
        // 1年チャート：weekOffsetに基づいて表示する1年を決定
        // weekOffset = 0: 現在の月から過去1年
        // weekOffset = 1: 1年前からさらに1年前（2年前から1年前まで）
        const oneYearEndMonth = weekOffset === 0 ? now : subMonths(now, weekOffset * 12);
        const oneYearStartMonth = subMonths(oneYearEndMonth, 12);
        startDate = startOfMonth(oneYearStartMonth);
        endDate = subDays(startOfMonth(oneYearEndMonth), 1); // 終了月の前日まで
        break;
    }

    return { startDate, endDate };
  }, [period, weekOffset]);

  // チャートのナビゲーション関数（全期間共通）
  const goToPreviousPeriod = () => {
    setWeekOffset(prev => prev + 1);
  };

  const goToNextPeriod = () => {
    setWeekOffset(prev => prev - 1);
  };

  // チャートのタイトル表示用の日付範囲
  const periodTitleRange = useMemo(() => {
    if (period === '1week') {
      const start = format(dateRange.startDate, 'M/d', { locale: ja });
      const end = format(dateRange.endDate, 'M/d', { locale: ja });
      return `${start} - ${end}`;
    } else if (period === '1month') {
      const start = format(dateRange.startDate, 'M/d', { locale: ja });
      const end = format(dateRange.endDate, 'M/d', { locale: ja });
      return `${start} - ${end}`;
    } else if (period === '6months') {
      const start = format(dateRange.startDate, 'yyyy年M月', { locale: ja });
      const end = format(dateRange.endDate, 'yyyy年M月', { locale: ja });
      return `${start} - ${end}`;
    } else if (period === '1year') {
      const start = format(dateRange.startDate, 'yyyy年M月', { locale: ja });
      const end = format(dateRange.endDate, 'yyyy年M月', { locale: ja });
      return `${start} - ${end}`;
    }
    return null;
  }, [period, dateRange]);

  // Filter records by date range
  const filterByDateRange = <T extends { recorded_at: string }>(records: T[]): T[] => {
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
  };

  // Format date for X-axis based on period
  const formatXAxisDate = (date: string | Date) => {
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
  };

  // Get month key for grouping (for 1month and 6months periods)
  const getMonthKey = (date: Date): string => {
    return format(startOfMonth(date), 'yyyy-MM');
  };

  // Helper function to aggregate data by month or date
  const aggregateData = <T extends { recorded_at: string }>(
    records: T[],
    getValue: (record: T) => number | undefined,
    isMonthlyView: boolean
  ): Array<{ date: string; dateObj: Date; value?: number }> => {
    const dataMap = new Map<
      string,
      { date: string; dateObj: Date; sum: number; count: number }
    >();

    records.forEach(record => {
      const recordDate = parseISO(record.recorded_at);
      const key = isMonthlyView ? getMonthKey(recordDate) : record.recorded_at;
      const dateObj = isMonthlyView ? startOfMonth(recordDate) : recordDate;
      const value = getValue(record);
      
      if (value === undefined) return;

      if (!dataMap.has(key)) {
        dataMap.set(key, { date: key, dateObj, sum: 0, count: 0 });
      }
      const data = dataMap.get(key)!;
      data.sum += value;
      data.count++;
    });

    return Array.from(dataMap.values())
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(item => ({
        date: formatXAxisDate(item.dateObj),
        dateObj: item.dateObj,
        value: item.count > 0 ? item.sum / item.count : undefined,
      }));
  };

  // Blood Pressure & Heart Rate Chart
  const bpHrData = useMemo(() => {
    const bpFiltered = filterByDateRange(bloodPressureRecords);
    const hrFiltered = filterByDateRange(heartRateRecords);
    const isMonthlyView = period === '6months';

    // 1週間または1か月の場合、日単位で集計する
    const isDailyView = period === '1week' || period === '1month';
    
    const dataMap = new Map<
      string,
      { date: string; dateObj: Date; systolic?: number; diastolic?: number; heartRate?: number; bpCount: number; hrCount: number }
    >();

    bpFiltered.forEach(record => {
      const recordDate = parseISO(record.recorded_at);
      // 1週間または1か月の場合は日単位でキーを作成
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
        dataMap.set(key, { date: key, dateObj, bpCount: 0, hrCount: 0 });
      }
      const data = dataMap.get(key)!;
      if (data.systolic === undefined) {
        data.systolic = record.systolic;
        data.diastolic = record.diastolic;
      } else {
        data.systolic = (data.systolic * data.bpCount + record.systolic) / (data.bpCount + 1);
        data.diastolic = (data.diastolic! * data.bpCount + record.diastolic) / (data.bpCount + 1);
      }
      data.bpCount++;
    });

    hrFiltered.forEach(record => {
      const recordDate = parseISO(record.recorded_at);
      // 1週間または1か月の場合は日単位でキーを作成
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
        dataMap.set(key, { date: key, dateObj, bpCount: 0, hrCount: 0 });
      }
      const data = dataMap.get(key)!;
      if (data.heartRate === undefined) {
        data.heartRate = record.bpm;
      } else {
        data.heartRate = (data.heartRate * data.hrCount + record.bpm) / (data.hrCount + 1);
      }
      data.hrCount++;
    });

    // 1週間の場合、データがない日も含めて全期間のデータポイントを作成（1日の平均値で表示）
    if (period === '1week') {
      const allDays = eachDayOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
      const result: Array<{ date: string; systolic?: number | null; diastolic?: number | null; heartRate?: number | null }> = [];
      
      const dataByDate = new Map<string, { systolic?: number; diastolic?: number; heartRate?: number }>();
      Array.from(dataMap.values()).forEach(item => {
        const dateKey = format(item.dateObj, 'yyyy-MM-dd');
        dataByDate.set(dateKey, {
          systolic: item.systolic,
          diastolic: item.diastolic,
          heartRate: item.heartRate,
        });
      });
      
      allDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const data = dataByDate.get(dateKey);
        const systolic: number | null | undefined = data?.systolic ?? null;
        const diastolic: number | null | undefined = data?.diastolic ?? null;
        const heartRate: number | null | undefined = data?.heartRate ?? null;
        result.push({
          date: formatXAxisDate(day),
          systolic,
          diastolic,
          heartRate,
        });
      });
      
      return result;
    }

    // 1か月の場合、データがない日も含めて全期間のデータポイントを作成
    if (period === '1month') {
      const allDays = eachDayOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
      const result: Array<{ date: string; systolic?: number | null; diastolic?: number | null; heartRate?: number | null }> = [];
      
      const dataByDate = new Map<string, { systolic?: number; diastolic?: number; heartRate?: number }>();
      Array.from(dataMap.values()).forEach(item => {
        const dateKey = format(item.dateObj, 'yyyy-MM-dd');
        dataByDate.set(dateKey, {
          systolic: item.systolic,
          diastolic: item.diastolic,
          heartRate: item.heartRate,
        });
      });
      
      allDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const data = dataByDate.get(dateKey);
        const systolic: number | null | undefined = data?.systolic ?? null;
        const diastolic: number | null | undefined = data?.diastolic ?? null;
        const heartRate: number | null | undefined = data?.heartRate ?? null;
        result.push({
          date: formatXAxisDate(day),
          systolic,
          diastolic,
          heartRate,
        });
      });
      
      return result;
    }
    
    return Array.from(dataMap.values())
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(item => ({
        date: formatXAxisDate(item.dateObj),
        systolic: item.systolic,
        diastolic: item.diastolic,
        heartRate: item.heartRate,
      }));
  }, [bloodPressureRecords, heartRateRecords, period, dateRange, formatXAxisDate, getMonthKey]);

  // Weight & Body Fat Chart
  const weightFatData = useMemo(() => {
    const weightFiltered = filterByDateRange(weightRecords);
    const fatFiltered = filterByDateRange(bodyFatRecords);
    const isDailyView = period === '1week' || period === '1month';

    const dataMap = new Map<string, { date: string; dateObj: Date; weight?: number; bodyFat?: number; weightCount: number; fatCount: number }>();

    weightFiltered.forEach(record => {
      const recordDate = parseISO(record.recorded_at);
      const key = isDailyView ? format(recordDate, 'yyyy-MM-dd') : record.recorded_at;
      const dateObj = isDailyView 
        ? new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate())
        : recordDate;
      
      if (!dataMap.has(key)) {
        dataMap.set(key, { date: key, dateObj, weightCount: 0, fatCount: 0 });
      }
      const data = dataMap.get(key)!;
      if (data.weight === undefined) {
        data.weight = record.value;
      } else {
        data.weight = (data.weight * data.weightCount + record.value) / (data.weightCount + 1);
      }
      data.weightCount++;
    });

    fatFiltered.forEach(record => {
      const recordDate = parseISO(record.recorded_at);
      const key = isDailyView ? format(recordDate, 'yyyy-MM-dd') : record.recorded_at;
      const dateObj = isDailyView 
        ? new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate())
        : recordDate;
      
      if (!dataMap.has(key)) {
        dataMap.set(key, { date: key, dateObj, weightCount: 0, fatCount: 0 });
      }
      const data = dataMap.get(key)!;
      if (data.bodyFat === undefined) {
        data.bodyFat = record.percentage;
      } else {
        data.bodyFat = (data.bodyFat * data.fatCount + record.percentage) / (data.fatCount + 1);
      }
      data.fatCount++;
    });

    // 1週間の場合、データがない日も含めて全期間のデータポイントを作成（1日の平均値で表示）
    if (period === '1week') {
      const allDays = eachDayOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
      const result: Array<{ date: string; weight?: number | null; bodyFat?: number | null }> = [];
      
      const dataByDate = new Map<string, { weight?: number; bodyFat?: number }>();
      Array.from(dataMap.values()).forEach(item => {
        const dateKey = format(item.dateObj, 'yyyy-MM-dd');
        dataByDate.set(dateKey, {
          weight: item.weight,
          bodyFat: item.bodyFat,
        });
      });
      
      allDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const data = dataByDate.get(dateKey);
        result.push({
          date: formatXAxisDate(day),
          weight: data?.weight ?? null,
          bodyFat: data?.bodyFat ?? null,
        });
      });
      
      return result;
    }

    // 1か月の場合、データがない日も含めて全期間のデータポイントを作成
    if (period === '1month') {
      const allDays = eachDayOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
      const result: Array<{ date: string; weight?: number | null; bodyFat?: number | null }> = [];
      
      const dataByDate = new Map<string, { weight?: number; bodyFat?: number }>();
      Array.from(dataMap.values()).forEach(item => {
        const recordDate = parseISO(item.date);
        const dateKey = format(recordDate, 'yyyy-MM-dd');
        dataByDate.set(dateKey, {
          weight: item.weight,
          bodyFat: item.bodyFat,
        });
      });
      
      allDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const data = dataByDate.get(dateKey);
        result.push({
          date: formatXAxisDate(day),
          weight: data?.weight ?? null,
          bodyFat: data?.bodyFat ?? null,
        });
      });
      
      return result;
    }
    
    return Array.from(dataMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(item => ({
        ...item,
        date: formatXAxisDate(item.date),
      }));
  }, [weightRecords, bodyFatRecords, period, dateRange, formatXAxisDate]);

  // Calculate weight Y-axis domain dynamically
  const weightDomain = useMemo(() => {
    const weights = weightFatData
      .map(d => d.weight)
      .filter((w): w is number => w !== undefined);
    if (weights.length === 0) return [0, 100];
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const minDomain = Math.max(0, minWeight - 10);
    const maxDomain = maxWeight + 10;
    // Round to nice numbers for better display (5kg intervals)
    const roundedMin = Math.floor(minDomain / 5) * 5;
    const roundedMax = Math.ceil(maxDomain / 5) * 5;
    return [roundedMin, roundedMax];
  }, [weightFatData]);

  // Generate weight Y-axis ticks (5kg intervals)
  const weightTicks = useMemo(() => {
    const [min, max] = weightDomain;
    const ticks: number[] = [];
    for (let i = min; i <= max; i += 5) {
      ticks.push(i);
    }
    return ticks;
  }, [weightDomain]);

  // Temperature Chart
  const temperatureData = useMemo(() => {
    const filtered = filterByDateRange(temperatureRecords);
    const isMonthlyView = period === '6months';
    const isDailyView = period === '1week' || period === '1month';

    const dataMap = new Map<
      string,
      { date: string; dateObj: Date; sum: number; count: number }
    >();

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
        dataMap.set(key, { date: key, dateObj, sum: 0, count: 0 });
      }
      const data = dataMap.get(key)!;
      data.sum += record.value;
      data.count++;
    });

    // 1週間の場合、データがない日も含めて全期間のデータポイントを作成（1日の平均値で表示）
    if (period === '1week') {
      const allDays = eachDayOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
      const result: Array<{ date: string; temperature?: number | null }> = [];
      
      const dataByDate = new Map<string, number>();
      Array.from(dataMap.values()).forEach(item => {
        const dateKey = format(item.dateObj, 'yyyy-MM-dd');
        if (item.count > 0) {
          dataByDate.set(dateKey, item.sum / item.count);
        }
      });
      
      allDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const temperature = dataByDate.get(dateKey);
        result.push({
          date: formatXAxisDate(day),
          temperature: temperature ?? null,
        });
      });
      
      return result;
    }

    // 1か月の場合、データがない日も含めて全期間のデータポイントを作成
    if (period === '1month') {
      const allDays = eachDayOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
      const result: Array<{ date: string; temperature?: number | null }> = [];
      
      const dataByDate = new Map<string, number>();
      Array.from(dataMap.values()).forEach(item => {
        const dateKey = format(item.dateObj, 'yyyy-MM-dd');
        if (item.count > 0) {
          dataByDate.set(dateKey, item.sum / item.count);
        }
      });
      
      allDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const temperature = dataByDate.get(dateKey);
        result.push({
          date: formatXAxisDate(day),
          temperature: temperature ?? null,
        });
      });
      
      return result;
    }
    
    return Array.from(dataMap.values())
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(item => ({
        date: formatXAxisDate(item.dateObj),
        temperature: item.count > 0 ? item.sum / item.count : undefined,
      }));
  }, [temperatureRecords, period, dateRange, formatXAxisDate, getMonthKey]);

  // Blood Glucose Chart
  const bloodGlucoseData = useMemo(() => {
    const filtered = filterByDateRange(bloodGlucoseRecords);
    const isMonthlyView = period === '6months';
    const isDailyView = period === '1week' || period === '1month';

    const dataMap = new Map<
      string,
      { date: string; dateObj: Date; sum: number; count: number }
    >();

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
        dataMap.set(key, { date: key, dateObj, sum: 0, count: 0 });
      }
      const data = dataMap.get(key)!;
      data.sum += record.value;
      data.count++;
    });

    // 1週間の場合、データがない日も含めて全期間のデータポイントを作成（1日の平均値で表示）
    if (period === '1week') {
      const allDays = eachDayOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
      const result: Array<{ date: string; bloodGlucose?: number | null }> = [];
      
      const dataByDate = new Map<string, number>();
      Array.from(dataMap.values()).forEach(item => {
        const dateKey = format(item.dateObj, 'yyyy-MM-dd');
        if (item.count > 0) {
          dataByDate.set(dateKey, item.sum / item.count);
        }
      });
      
      allDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const bloodGlucose = dataByDate.get(dateKey);
        result.push({
          date: formatXAxisDate(day),
          bloodGlucose: bloodGlucose ?? null,
        });
      });
      
      return result;
    }

    // 1か月の場合、データがない日も含めて全期間のデータポイントを作成
    if (period === '1month') {
      const allDays = eachDayOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
      const result: Array<{ date: string; bloodGlucose?: number | null }> = [];
      
      const dataByDate = new Map<string, number>();
      Array.from(dataMap.values()).forEach(item => {
        const dateKey = format(item.dateObj, 'yyyy-MM-dd');
        if (item.count > 0) {
          dataByDate.set(dateKey, item.sum / item.count);
        }
      });
      
      allDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const bloodGlucose = dataByDate.get(dateKey);
        result.push({
          date: formatXAxisDate(day),
          bloodGlucose: bloodGlucose ?? null,
        });
      });
      
      return result;
    }
    
    return Array.from(dataMap.values())
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(item => ({
        date: formatXAxisDate(item.dateObj),
        bloodGlucose: item.count > 0 ? item.sum / item.count : undefined,
      }));
  }, [bloodGlucoseRecords, period, dateRange, formatXAxisDate, getMonthKey]);

  // SpO2 Chart
  const spo2Data = useMemo(() => {
    const filtered = filterByDateRange(spo2Records);
    const isMonthlyView = period === '6months';
    const isDailyView = period === '1week' || period === '1month';

    const dataMap = new Map<
      string,
      { date: string; dateObj: Date; sum: number; count: number }
    >();

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
        dataMap.set(key, { date: key, dateObj, sum: 0, count: 0 });
      }
      const data = dataMap.get(key)!;
      data.sum += record.percentage;
      data.count++;
    });

    // 1週間の場合、データがない日も含めて全期間のデータポイントを作成（1日の平均値で表示）
    if (period === '1week') {
      const allDays = eachDayOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
      const result: Array<{ date: string; spo2?: number | null }> = [];
      
      const dataByDate = new Map<string, number>();
      Array.from(dataMap.values()).forEach(item => {
        const dateKey = format(item.dateObj, 'yyyy-MM-dd');
        if (item.count > 0) {
          dataByDate.set(dateKey, item.sum / item.count);
        }
      });
      
      allDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const spo2 = dataByDate.get(dateKey);
        result.push({
          date: formatXAxisDate(day),
          spo2: spo2 ?? null,
        });
      });
      
      return result;
    }

    // 1か月の場合、データがない日も含めて全期間のデータポイントを作成
    if (period === '1month') {
      const allDays = eachDayOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
      const result: Array<{ date: string; spo2?: number | null }> = [];
      
      const dataByDate = new Map<string, number>();
      Array.from(dataMap.values()).forEach(item => {
        const dateKey = format(item.dateObj, 'yyyy-MM-dd');
        if (item.count > 0) {
          dataByDate.set(dateKey, item.sum / item.count);
        }
      });
      
      allDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const spo2 = dataByDate.get(dateKey);
        result.push({
          date: formatXAxisDate(day),
          spo2: spo2 ?? null,
        });
      });
      
      return result;
    }

    return Array.from(dataMap.values())
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(item => ({
        date: formatXAxisDate(item.dateObj),
        spo2: item.count > 0 ? item.sum / item.count : undefined,
      }));
  }, [spo2Records, period, dateRange, formatXAxisDate, getMonthKey]);

  // Generate week divider lines for 1month period
  const weekDividers = useMemo(() => {
    if (period !== '1month') return [];
    
    const dividers: string[] = [];
    const start = startOfWeek(dateRange.startDate, { weekStartsOn: 0 });
    const end = dateRange.endDate;
    let currentWeek = new Date(start);
    
    while (currentWeek <= end) {
      dividers.push(formatXAxisDate(currentWeek));
      currentWeek = new Date(currentWeek);
      currentWeek.setDate(currentWeek.getDate() + 7);
    }
    
    return dividers;
  }, [period, dateRange, formatXAxisDate]);

  return (
    <div className="space-y-6">
      {/* Blood Pressure & Heart Rate Chart */}
      {bpHrData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={goToPreviousPeriod}
              className="p-1 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              aria-label={
                period === '1week' ? '前の週' :
                period === '1month' ? '前の期間' :
                period === '6months' ? '前の半年' :
                period === '1year' ? '前の年' : ''
              }
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              血圧・心拍数
              {periodTitleRange && (
                <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                  ({periodTitleRange})
                </span>
              )}
            </h3>
            <button
              onClick={goToNextPeriod}
              disabled={weekOffset === 0}
              className={`p-1 rounded-lg transition-colors ${
                weekOffset > 0
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                  : 'opacity-0 cursor-default'
              }`}
              aria-label={
                period === '1week' ? '次の週' :
                period === '1month' ? '次の期間' :
                period === '6months' ? '次の半年' :
                period === '1year' ? '次の年' : ''
              }
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          {typeof window !== 'undefined' ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={bpHrData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                {period === '1month' && weekDividers.map((divider, index) => (
                  <ReferenceLine
                    key={`week-divider-${index}`}
                    x={divider}
                    yAxisId="bp"
                    stroke="#9ca3af"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    isFront={false}
                  />
                ))}
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280' }}
                  className="dark:text-gray-400"
                />
                <YAxis
                  yAxisId="bp"
                  label={{ value: '血圧 (mmHg)', angle: -90, position: 'insideLeft' }}
                  stroke="#ef4444"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  className="dark:text-gray-400"
                  domain={[30, 210]}
                  ticks={[30, 60, 90, 120, 150, 180, 210]}
                  width={50}
                  tickMargin={4}
                />
                <YAxis
                  yAxisId="hr"
                  orientation="right"
                  label={{ value: '心拍数 (bpm)', angle: 90, position: 'insideRight' }}
                  stroke="#3b82f6"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  className="dark:text-gray-400"
                  domain={[30, 210]}
                  ticks={[30, 60, 90, 120, 150, 180, 210]}
                  width={50}
                  tickMargin={4}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    border: '1px solid var(--tooltip-border, #e5e7eb)',
                    borderRadius: '8px',
                    color: 'var(--tooltip-text, #000)',
                  }}
                  wrapperStyle={{ color: 'inherit' }}
                  formatter={(value: any, name: string) => {
                    if (name === '収縮期血圧 (mmHg)') {
                      return [`${value} mmHg`, name];
                    } else if (name === '拡張期血圧 (mmHg)') {
                      return [`${value} mmHg`, name];
                    } else if (name === '心拍数 (bpm)') {
                      return [`${value} bpm`, name];
                    }
                    return [value, name];
                  }}
                />
                <Legend />
                {bpHrData.some(d => d.systolic !== undefined) && (
                  <Line
                    yAxisId="bp"
                    type="linear"
                    dataKey="systolic"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="収縮期血圧 (mmHg)"
                    dot={period === '1week' ? { r: 4 } : false}
                    connectNulls={true}
                  />
                )}
                {bpHrData.some(d => d.diastolic !== undefined) && (
                  <Line
                    yAxisId="bp"
                    type="linear"
                    dataKey="diastolic"
                    stroke="#dc2626"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="拡張期血圧 (mmHg)"
                    dot={period === '1week' ? { r: 4 } : false}
                    connectNulls={true}
                  />
                )}
                {bpHrData.some(d => d.heartRate !== undefined) && (
                  <Line
                    yAxisId="hr"
                    type="linear"
                    dataKey="heartRate"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="心拍数 (bpm)"
                    dot={period === '1week' ? { r: 4 } : false}
                    connectNulls={true}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      )}

      {/* Weight & Body Fat Chart */}
      {weightFatData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={goToPreviousPeriod}
              disabled={period !== '1week' && period !== '1month'}
              className={`p-1 rounded-lg transition-colors ${
                (period === '1week' || period === '1month')
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                  : 'opacity-0 cursor-default'
              }`}
              aria-label={period === '1week' ? '前の週' : period === '1month' ? '前の期間' : ''}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              体重・体脂肪率
              {periodTitleRange && (
                <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                  ({periodTitleRange})
                </span>
              )}
            </h3>
            <button
              onClick={goToNextPeriod}
              disabled={(period !== '1week' && period !== '1month') || weekOffset === 0}
              className={`p-1 rounded-lg transition-colors ${
                (period === '1week' || period === '1month') && weekOffset > 0
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                  : 'opacity-0 cursor-default'
              }`}
              aria-label={period === '1week' ? '次の週' : period === '1month' ? '次の期間' : ''}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          {typeof window !== 'undefined' ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weightFatData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                {period === '1month' && weekDividers.map((divider, index) => (
                  <ReferenceLine
                    key={`week-divider-${index}`}
                    x={divider}
                    yAxisId="left"
                    stroke="#9ca3af"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    isFront={false}
                  />
                ))}
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280' }} />
                <YAxis 
                  yAxisId="left" 
                  label={{ value: '体重 (kg)', angle: -90, position: 'insideLeft' }}
                  stroke="#3b82f6" 
                  tick={{ fill: '#6b7280' }}
                  domain={weightDomain}
                  allowDecimals={false}
                  ticks={weightTicks}
                  tickFormatter={(value) => value.toString()}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{ value: '体脂肪率 (%)', angle: 90, position: 'insideRight' }}
                  stroke="#f59e0b"
                  tick={{ fill: '#6b7280' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                {weightFatData.some(d => d.weight !== undefined) && (
                  <Line
                    yAxisId="left"
                    type="linear"
                    dataKey="weight"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="体重 (kg)"
                    dot={period === '1week' ? { r: 4 } : false}
                    connectNulls={true}
                  />
                )}
                {weightFatData.some(d => d.bodyFat !== undefined) && (
                  <Line
                    yAxisId="right"
                    type="linear"
                    dataKey="bodyFat"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="体脂肪率 (%)"
                    dot={period === '1week' ? { r: 4 } : false}
                    connectNulls={true}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      )}

      {/* Temperature Chart */}
      {temperatureData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={goToPreviousPeriod}
              disabled={period !== '1week' && period !== '1month'}
              className={`p-1 rounded-lg transition-colors ${
                (period === '1week' || period === '1month')
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                  : 'opacity-0 cursor-default'
              }`}
              aria-label={period === '1week' ? '前の週' : period === '1month' ? '前の期間' : ''}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              体温
              {periodTitleRange && (
                <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                  ({periodTitleRange})
                </span>
              )}
            </h3>
            <button
              onClick={goToNextPeriod}
              disabled={(period !== '1week' && period !== '1month') || weekOffset === 0}
              className={`p-1 rounded-lg transition-colors ${
                (period === '1week' || period === '1month') && weekOffset > 0
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                  : 'opacity-0 cursor-default'
              }`}
              aria-label={period === '1week' ? '次の週' : period === '1month' ? '次の期間' : ''}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          {typeof window !== 'undefined' ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={temperatureData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                {period === '1month' && weekDividers.map((divider, index) => (
                  <ReferenceLine
                    key={`week-divider-${index}`}
                    x={divider}
                    stroke="#9ca3af"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    isFront={false}
                  />
                ))}
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280' }} />
                <YAxis stroke="#3b82f6" tick={{ fill: '#6b7280' }} domain={[34, 43]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="linear"
                  dataKey="temperature"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="体温 (°C)"
                  dot={{ r: 4 }}
                  connectNulls={true}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      )}

      {/* Blood Glucose Chart */}
      {bloodGlucoseData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={goToPreviousPeriod}
              disabled={period !== '1week' && period !== '1month'}
              className={`p-1 rounded-lg transition-colors ${
                (period === '1week' || period === '1month')
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                  : 'opacity-0 cursor-default'
              }`}
              aria-label={period === '1week' ? '前の週' : period === '1month' ? '前の期間' : ''}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              血糖値
              {periodTitleRange && (
                <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                  ({periodTitleRange})
                </span>
              )}
            </h3>
            <button
              onClick={goToNextPeriod}
              disabled={(period !== '1week' && period !== '1month') || weekOffset === 0}
              className={`p-1 rounded-lg transition-colors ${
                (period === '1week' || period === '1month') && weekOffset > 0
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                  : 'opacity-0 cursor-default'
              }`}
              aria-label={period === '1week' ? '次の週' : period === '1month' ? '次の期間' : ''}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          {typeof window !== 'undefined' ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={bloodGlucoseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                {period === '1month' && weekDividers.map((divider, index) => (
                  <ReferenceLine
                    key={`week-divider-${index}`}
                    x={divider}
                    stroke="#9ca3af"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    isFront={false}
                  />
                ))}
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280' }} />
                <YAxis stroke="#f97316" tick={{ fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Area
                  type="linear"
                  dataKey="bloodGlucose"
                  stroke="#f97316"
                  fill="#f97316"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  name="血糖値 (mg/dL)"
                  connectNulls={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      )}

      {/* SpO2 Chart */}
      {spo2Data.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={goToPreviousPeriod}
              disabled={period !== '1week' && period !== '1month'}
              className={`p-1 rounded-lg transition-colors ${
                (period === '1week' || period === '1month')
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                  : 'opacity-0 cursor-default'
              }`}
              aria-label={period === '1week' ? '前の週' : period === '1month' ? '前の期間' : ''}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              血中酸素濃度
              {periodTitleRange && (
                <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                  ({periodTitleRange})
                </span>
              )}
            </h3>
            <button
              onClick={goToNextPeriod}
              disabled={(period !== '1week' && period !== '1month') || weekOffset === 0}
              className={`p-1 rounded-lg transition-colors ${
                (period === '1week' || period === '1month') && weekOffset > 0
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                  : 'opacity-0 cursor-default'
              }`}
              aria-label={period === '1week' ? '次の週' : period === '1month' ? '次の期間' : ''}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          {typeof window !== 'undefined' ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={spo2Data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                {period === '1month' && weekDividers.map((divider, index) => (
                  <ReferenceLine
                    key={`week-divider-${index}`}
                    x={divider}
                    stroke="#9ca3af"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    isFront={false}
                  />
                ))}
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280' }} />
                <YAxis stroke="#ec4899" tick={{ fill: '#6b7280' }} domain={[70, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Area
                  type="linear"
                  dataKey="spo2"
                  stroke="#ec4899"
                  fill="#ec4899"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  name="SpO2 (%)"
                  connectNulls={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      )}

      {/* No Data Message */}
      {bpHrData.length === 0 &&
        weightFatData.length === 0 &&
        temperatureData.length === 0 &&
        bloodGlucoseData.length === 0 &&
        spo2Data.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">選択した期間に記録がありません</p>
          </div>
        )}
    </div>
  );
}
