'use client';

import { useMemo, useState, useEffect } from 'react';
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
} from 'recharts';
import { format, parseISO, startOfMonth, startOfWeek, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, addDays, addWeeks, addMonths, isSunday, endOfMonth } from 'date-fns';
import { ja } from 'date-fns/locale/ja';
import { useTranslations } from 'next-intl';
import type { BloodPressureRecord } from '@/lib/api/bloodPressureRecords';
import type { HeartRateRecord } from '@/lib/api/heartRateRecords';
import type { TemperatureRecord } from '@/lib/api/temperatureRecords';
import type { WeightRecord } from '@/lib/api/weightRecords';
import type { BodyFatRecord } from '@/lib/api/bodyFatRecords';
import type { BloodGlucoseRecord } from '@/lib/api/bloodGlucoseRecords';
import type { SpO2Record } from '@/lib/api/spo2Records';
import { useChartDateRange, type Period } from '@/hooks/useChartDateRange';
import { filterByDateRange, formatPeriodTitleRange, formatXAxisDate, getMonthKey } from '@/utils/chartUtils';
import { ChartTitle } from './vitalCharts/ChartTitle';

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
  const t = useTranslations('daily');
  // 1週間チャートの場合、表示する週の開始日を管理
  const [weekOffset, setWeekOffset] = useState(0); // 0 = 今週、1 = 1週間前、-1 = 1週間後

  // Calculate date range based on period
  const dateRange = useChartDateRange(period, weekOffset);

  // チャートのナビゲーション関数（全期間共通）
  const goToPreviousPeriod = () => {
    setWeekOffset(prev => prev + 1);
  };

  const goToNextPeriod = () => {
    setWeekOffset(prev => prev - 1);
  };

  // チャートのタイトル表示用の日付範囲
  const periodTitleRange = useMemo(() => {
    return formatPeriodTitleRange(period, dateRange);
  }, [period, dateRange]);

  // Filter records by date range (wrapper for utility function)
  const filterRecords = <T extends { recorded_at: string }>(records: T[]): T[] => {
    return filterByDateRange(records, dateRange, period);
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
        date: formatXAxisDate(item.dateObj, period),
        dateObj: item.dateObj,
        value: item.count > 0 ? Math.round((item.sum / item.count) * 10) / 10 : undefined,
      }));
  };

  // Blood Pressure & Heart Rate Chart
  const bpHrData = useMemo(() => {
    const bpFiltered = filterRecords(bloodPressureRecords);
    const hrFiltered = filterRecords(heartRateRecords);
    const isMonthlyView = period === '6months' || period === '1year';

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
        const avgSystolic = (data.systolic * data.bpCount + record.systolic) / (data.bpCount + 1);
        const avgDiastolic = (data.diastolic! * data.bpCount + record.diastolic) / (data.bpCount + 1);
        data.systolic = Math.round(avgSystolic * 10) / 10;
        data.diastolic = Math.round(avgDiastolic * 10) / 10;
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
        const avgHeartRate = (data.heartRate * data.hrCount + record.bpm) / (data.hrCount + 1);
        data.heartRate = Math.round(avgHeartRate * 10) / 10;
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
          date: formatXAxisDate(day, period),
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
          date: formatXAxisDate(day, period),
          systolic,
          diastolic,
          heartRate,
        });
      });
      
      return result;
    }

    // 半年または1年の場合、月単位でデータポイントを作成
    if (period === '6months' || period === '1year') {
      const allMonths = eachMonthOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
      const result: Array<{ date: string; systolic?: number | null; diastolic?: number | null; heartRate?: number | null }> = [];
      
      const dataByMonth = new Map<string, { systolic?: number; diastolic?: number; heartRate?: number }>();
      Array.from(dataMap.values()).forEach(item => {
        const monthKey = getMonthKey(item.dateObj);
        dataByMonth.set(monthKey, {
          systolic: item.systolic,
          diastolic: item.diastolic,
          heartRate: item.heartRate,
        });
      });
      
      allMonths.forEach(month => {
        const monthKey = getMonthKey(month);
        const data = dataByMonth.get(monthKey);
        result.push({
          date: formatXAxisDate(month, period),
          systolic: data?.systolic ?? null,
          diastolic: data?.diastolic ?? null,
          heartRate: data?.heartRate ?? null,
        });
      });
      
      return result;
    }
    
    return Array.from(dataMap.values())
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(item => ({
        date: formatXAxisDate(item.dateObj, period),
        systolic: item.systolic,
        diastolic: item.diastolic,
        heartRate: item.heartRate,
      }));
  }, [bloodPressureRecords, heartRateRecords, period, dateRange, formatXAxisDate, getMonthKey]);

  // Weight & Body Fat Chart
  const weightFatData = useMemo(() => {
    const weightFiltered = filterRecords(weightRecords);
    const fatFiltered = filterRecords(bodyFatRecords);
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
        const avgWeight = (data.weight * data.weightCount + record.value) / (data.weightCount + 1);
        data.weight = Math.round(avgWeight * 10) / 10;
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
        const avgBodyFat = (data.bodyFat * data.fatCount + record.percentage) / (data.fatCount + 1);
        data.bodyFat = Math.round(avgBodyFat * 10) / 10;
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
          date: formatXAxisDate(day, period),
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
          date: formatXAxisDate(day, period),
          weight: data?.weight ?? null,
          bodyFat: data?.bodyFat ?? null,
        });
      });
      
      return result;
    }

    // 半年または1年の場合、月単位でデータポイントを作成
    if (period === '6months' || period === '1year') {
      const allMonths = eachMonthOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
      const result: Array<{ date: string; weight?: number | null; bodyFat?: number | null }> = [];
      
      const dataByMonth = new Map<string, { weight?: number; bodyFat?: number }>();
      Array.from(dataMap.values()).forEach(item => {
        const recordDate = parseISO(item.date);
        const monthKey = getMonthKey(recordDate);
        dataByMonth.set(monthKey, {
          weight: item.weight,
          bodyFat: item.bodyFat,
        });
      });
      
      allMonths.forEach(month => {
        const monthKey = getMonthKey(month);
        const data = dataByMonth.get(monthKey);
        result.push({
          date: formatXAxisDate(month, period),
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
        date: formatXAxisDate(item.date, period),
      }));
  }, [weightRecords, bodyFatRecords, period, dateRange, formatXAxisDate, getMonthKey]);

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
    // Round to nice numbers for better display (1kg intervals)
    const roundedMin = Math.floor(minDomain);
    const roundedMax = Math.ceil(maxDomain);
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
    const filtered = filterRecords(temperatureRecords);
    const isMonthlyView = period === '6months' || period === '1year';
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
          dataByDate.set(dateKey, Math.round((item.sum / item.count) * 10) / 10);
        }
      });
      
      allDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const temperature = dataByDate.get(dateKey);
        result.push({
          date: formatXAxisDate(day, period),
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
          dataByDate.set(dateKey, Math.round((item.sum / item.count) * 10) / 10);
        }
      });
      
      allDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const temperature = dataByDate.get(dateKey);
        result.push({
          date: formatXAxisDate(day, period),
          temperature: temperature ?? null,
        });
      });
      
      return result;
    }

    // 半年または1年の場合、月単位でデータポイントを作成
    if (period === '6months' || period === '1year') {
      const allMonths = eachMonthOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
      const result: Array<{ date: string; temperature?: number | null }> = [];
      
      const dataByMonth = new Map<string, number>();
      Array.from(dataMap.values()).forEach(item => {
        const monthKey = getMonthKey(item.dateObj);
        if (item.count > 0) {
          dataByMonth.set(monthKey, Math.round((item.sum / item.count) * 10) / 10);
        }
      });
      
      allMonths.forEach(month => {
        const monthKey = getMonthKey(month);
        const temperature = dataByMonth.get(monthKey);
        result.push({
          date: formatXAxisDate(month, period),
          temperature: temperature ?? null,
        });
      });
      
      return result;
    }
    
    return Array.from(dataMap.values())
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(item => ({
        date: formatXAxisDate(item.dateObj, period),
        temperature: item.count > 0 ? Math.round((item.sum / item.count) * 10) / 10 : undefined,
      }));
  }, [temperatureRecords, period, dateRange, formatXAxisDate, getMonthKey]);

  // Blood Glucose Chart
  const bloodGlucoseData = useMemo(() => {
    const filtered = filterRecords(bloodGlucoseRecords);
    const isMonthlyView = period === '6months' || period === '1year';
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
          dataByDate.set(dateKey, Math.round((item.sum / item.count) * 10) / 10);
        }
      });
      
      allDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const bloodGlucose = dataByDate.get(dateKey);
        result.push({
          date: formatXAxisDate(day, period),
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
          dataByDate.set(dateKey, Math.round((item.sum / item.count) * 10) / 10);
        }
      });
      
      allDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const bloodGlucose = dataByDate.get(dateKey);
        result.push({
          date: formatXAxisDate(day, period),
          bloodGlucose: bloodGlucose ?? null,
        });
      });
      
      return result;
    }

    // 半年または1年の場合、月単位でデータポイントを作成
    if (period === '6months' || period === '1year') {
      const allMonths = eachMonthOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
      const result: Array<{ date: string; bloodGlucose?: number | null }> = [];
      
      const dataByMonth = new Map<string, number>();
      Array.from(dataMap.values()).forEach(item => {
        const monthKey = getMonthKey(item.dateObj);
        if (item.count > 0) {
          dataByMonth.set(monthKey, Math.round((item.sum / item.count) * 10) / 10);
        }
      });
      
      allMonths.forEach(month => {
        const monthKey = getMonthKey(month);
        const bloodGlucose = dataByMonth.get(monthKey);
        result.push({
          date: formatXAxisDate(month, period),
          bloodGlucose: bloodGlucose ?? null,
        });
      });
      
      return result;
    }
    
    return Array.from(dataMap.values())
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(item => ({
        date: formatXAxisDate(item.dateObj, period),
        bloodGlucose: item.count > 0 ? Math.round((item.sum / item.count) * 10) / 10 : undefined,
      }));
  }, [bloodGlucoseRecords, period, dateRange, formatXAxisDate, getMonthKey]);

  // SpO2 Chart
  const spo2Data = useMemo(() => {
    const filtered = filterRecords(spo2Records);
    const isMonthlyView = period === '6months' || period === '1year';
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
          dataByDate.set(dateKey, Math.round((item.sum / item.count) * 10) / 10);
        }
      });
      
      allDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const spo2 = dataByDate.get(dateKey);
        result.push({
          date: formatXAxisDate(day, period),
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
          dataByDate.set(dateKey, Math.round((item.sum / item.count) * 10) / 10);
        }
      });
      
      allDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const spo2 = dataByDate.get(dateKey);
        result.push({
          date: formatXAxisDate(day, period),
          spo2: spo2 ?? null,
        });
      });
      
      return result;
    }

    // 半年または1年の場合、月単位でデータポイントを作成
    if (period === '6months' || period === '1year') {
      const allMonths = eachMonthOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
      const result: Array<{ date: string; spo2?: number | null }> = [];
      
      const dataByMonth = new Map<string, number>();
      Array.from(dataMap.values()).forEach(item => {
        const monthKey = getMonthKey(item.dateObj);
        if (item.count > 0) {
          dataByMonth.set(monthKey, Math.round((item.sum / item.count) * 10) / 10);
        }
      });
      
      allMonths.forEach(month => {
        const monthKey = getMonthKey(month);
        const spo2 = dataByMonth.get(monthKey);
        result.push({
          date: formatXAxisDate(month, period),
          spo2: spo2 ?? null,
        });
      });
      
      return result;
    }

    return Array.from(dataMap.values())
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(item => ({
        date: formatXAxisDate(item.dateObj, period),
        spo2: item.count > 0 ? Math.round((item.sum / item.count) * 10) / 10 : undefined,
      }));
  }, [spo2Records, period, dateRange, formatXAxisDate, getMonthKey]);

  // Detect if mobile device
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px以下をモバイルとする
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Generate vertical divider lines based on period
  const verticalDividers = useMemo(() => {
    const dividers: string[] = [];
    
    switch (period) {
      case '1week':
        // 1日ごとに縦線
        const weekStart = startOfWeek(dateRange.startDate, { weekStartsOn: 0 });
        const weekEnd = dateRange.endDate;
        let currentDay = new Date(weekStart);
        while (currentDay <= weekEnd) {
          dividers.push(formatXAxisDate(currentDay, period));
          currentDay = addDays(currentDay, 1);
        }
        break;
        
      case '1month':
        // 毎週の月曜日に縦線
        const monthStart = startOfWeek(dateRange.startDate, { weekStartsOn: 1 });
        const monthEnd = dateRange.endDate;
        let currentWeek = new Date(monthStart);
        while (currentWeek <= monthEnd) {
          dividers.push(formatXAxisDate(currentWeek, period));
          currentWeek = addWeeks(currentWeek, 1);
        }
        break;
        
      case '6months':
        // 月ごとに縦線
        const sixMonthsStart = startOfMonth(dateRange.startDate);
        const sixMonthsEnd = dateRange.endDate;
        let currentMonth = new Date(sixMonthsStart);
        while (currentMonth <= sixMonthsEnd) {
          dividers.push(formatXAxisDate(currentMonth, period));
          currentMonth = addMonths(currentMonth, 1);
        }
        break;
        
      case '1year':
        // PCでは毎月、モバイルでは奇数の月に縦線
        const yearStart = startOfMonth(dateRange.startDate);
        const yearEnd = dateRange.endDate;
        let currentYearMonth = new Date(yearStart);
        let monthIndex = 0;
        while (currentYearMonth <= yearEnd) {
          if (!isMobile || monthIndex % 2 === 0) {
            dividers.push(formatXAxisDate(currentYearMonth, period));
          }
          currentYearMonth = addMonths(currentYearMonth, 1);
          monthIndex++;
        }
        break;
    }
    
    return dividers;
  }, [period, dateRange, formatXAxisDate, isMobile]);

  return (
    <div className="space-y-6">
      {/* Blood Pressure & Heart Rate Chart */}
      {bpHrData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
          <ChartTitle
            title={t('chart.titles.bloodPressureHeartRate')}
            periodRange={periodTitleRange}
            period={period}
            weekOffset={weekOffset}
            onPrevious={goToPreviousPeriod}
            onNext={goToNextPeriod}
          />
          {typeof window !== 'undefined' ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={bpHrData} margin={{ top: 10, right: 5, left: 5, bottom: 5 }} style={{ overflow: 'visible' }}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#e5e7eb" 
                  vertical={period !== '1month'} 
                  horizontal={true}
                />
                {verticalDividers.map((divider, index) => (
                  <ReferenceLine
                    key={`vertical-divider-${index}`}
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
                  label={{ 
                    value: `${t('chart.labels.bloodPressure')} (${t('chart.units.mmHg')})`, 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle' }
                  }}
                  stroke="#ef4444"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  className="dark:text-gray-400"
                  domain={[30, 210]}
                  ticks={[30, 60, 90, 120, 150, 180, 210]}
                  width={75}
                  tickMargin={4}
                />
                <YAxis
                  yAxisId="hr"
                  orientation="right"
                  label={{ 
                    value: `${t('chart.labels.heartRate')} (${t('chart.units.bpm')})`, 
                    angle: 90, 
                    position: 'insideRight',
                    style: { textAnchor: 'middle' }
                  }}
                  stroke="#3b82f6"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  className="dark:text-gray-400"
                  domain={[30, 210]}
                  ticks={[30, 60, 90, 120, 150, 180, 210]}
                  width={75}
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
                    // Remove units from measurement names (anything in parentheses)
                    const nameWithoutUnit = name.replace(/\s*\([^)]*\)\s*/g, '');
                    
                    // Determine unit based on the original name
                    let unit = '';
                    if (name.includes('mmHg')) {
                      unit = ' mmHg';
                    } else if (name.includes('bpm')) {
                      unit = ' bpm';
                    } else if (name.includes('°C') || name.includes('°F')) {
                      unit = name.includes('°C') ? ' °C' : ' °F';
                    } else if (name.includes('kg')) {
                      unit = ' kg';
                    } else if (name.includes('%')) {
                      unit = '%';
                    } else if (name.includes('mg/dL')) {
                      unit = ' mg/dL';
                    }
                    
                    return [`${value}${unit}`, nameWithoutUnit];
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
                    name={`${t('chart.labels.systolic')} (${t('chart.units.mmHg')})`}
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
                    name={`${t('chart.labels.diastolic')} (${t('chart.units.mmHg')})`}
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
                    name={`${t('chart.labels.heartRate')} (${t('chart.units.bpm')})`}
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
          <ChartTitle
            title={t('chart.titles.weightBodyFat')}
            periodRange={periodTitleRange}
            period={period}
            weekOffset={weekOffset}
            onPrevious={goToPreviousPeriod}
            onNext={goToNextPeriod}
          />
          {typeof window !== 'undefined' ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weightFatData} margin={{ top: 10, right: 5, left: 5, bottom: 5 }} style={{ overflow: 'visible' }}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#e5e7eb" 
                  vertical={period !== '1month'} 
                  horizontal={true}
                />
                {verticalDividers.map((divider, index) => (
                  <ReferenceLine
                    key={`vertical-divider-${index}`}
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
                  label={{ 
                    value: `${t('chart.labels.weight')} (${t('chart.units.kg')})`, 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle' }
                  }}
                  stroke="#3b82f6" 
                  tick={{ fill: '#6b7280' }}
                  domain={weightDomain}
                  allowDecimals={false}
                  ticks={weightTicks}
                  tickFormatter={(value) => value.toString()}
                  width={75}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{ 
                    value: `${t('chart.labels.bodyFat')} (${t('chart.units.percent')})`, 
                    angle: 90, 
                    position: 'insideRight',
                    style: { textAnchor: 'middle' }
                  }}
                  stroke="#f59e0b"
                  tick={{ fill: '#6b7280' }}
                  width={75}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any, name: string) => {
                    // Remove units from measurement names (anything in parentheses)
                    const nameWithoutUnit = name.replace(/\s*\([^)]*\)\s*/g, '');
                    
                    // Determine unit based on the original name
                    let unit = '';
                    if (name.includes('kg')) {
                      unit = ' kg';
                    } else if (name.includes('%')) {
                      unit = '%';
                    }
                    
                    return [`${value}${unit}`, nameWithoutUnit];
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
                    name={`${t('chart.labels.weight')} (${t('chart.units.kg')})`}
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
                    name={`${t('chart.labels.bodyFat')} (${t('chart.units.percent')})`}
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
          <ChartTitle
            title={t('chart.titles.temperature')}
            periodRange={periodTitleRange}
            period={period}
            weekOffset={weekOffset}
            onPrevious={goToPreviousPeriod}
            onNext={goToNextPeriod}
          />
          {typeof window !== 'undefined' ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={temperatureData} margin={{ top: 10, right: isMobile ? 10 : 20, left: isMobile ? 0 : 5, bottom: isMobile ? 30 : 5 }}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#e5e7eb" 
                  vertical={period !== '1month'} 
                  horizontal={true}
                />
                {verticalDividers.map((divider, index) => (
                  <ReferenceLine
                    key={`vertical-divider-${index}`}
                    x={divider}
                    stroke="#9ca3af"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    isFront={false}
                  />
                ))}
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280" 
                  tick={{ fill: '#6b7280', fontSize: isMobile ? 10 : 12 }} 
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? 'end' : 'middle'}
                  height={isMobile ? 60 : 30}
                />
                <YAxis stroke="#3b82f6" tick={{ fill: '#6b7280' }} domain={[34, 43]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any, name: string) => {
                    // Remove units from measurement names (anything in parentheses)
                    const nameWithoutUnit = name.replace(/\s*\([^)]*\)\s*/g, '');
                    
                    // Determine unit based on the original name
                    let unit = '';
                    if (name.includes('°C')) {
                      unit = ' °C';
                    } else if (name.includes('°F')) {
                      unit = ' °F';
                    }
                    
                    return [`${value}${unit}`, nameWithoutUnit];
                  }}
                />
                <Legend />
                <Line
                  type="linear"
                  dataKey="temperature"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name={`${t('chart.labels.temperature')} (${t('chart.units.celsius')})`}
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
          <ChartTitle
            title={t('chart.titles.bloodGlucose')}
            periodRange={periodTitleRange}
            period={period}
            weekOffset={weekOffset}
            onPrevious={goToPreviousPeriod}
            onNext={goToNextPeriod}
          />
          {typeof window !== 'undefined' ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={bloodGlucoseData} margin={{ top: 10, right: isMobile ? 10 : 20, left: isMobile ? 0 : 5, bottom: isMobile ? 30 : 5 }}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#e5e7eb" 
                  vertical={period !== '1month'} 
                  horizontal={true}
                />
                {verticalDividers.map((divider, index) => (
                  <ReferenceLine
                    key={`vertical-divider-${index}`}
                    x={divider}
                    stroke="#9ca3af"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    isFront={false}
                  />
                ))}
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280" 
                  tick={{ fill: '#6b7280', fontSize: isMobile ? 10 : 12 }} 
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? 'end' : 'middle'}
                  height={isMobile ? 60 : 30}
                />
                <YAxis stroke="#f97316" tick={{ fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any, name: string) => {
                    // Remove units from measurement names (anything in parentheses)
                    const nameWithoutUnit = name.replace(/\s*\([^)]*\)\s*/g, '');
                    return [`${value} mg/dL`, nameWithoutUnit];
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
                  name={`${t('chart.labels.bloodGlucose')} (${t('chart.units.mgdL')})`}
                  connectNulls={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      )}

      {/* SpO2 Chart */}
      {spo2Data.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
          <ChartTitle
            title={t('chart.titles.spo2')}
            periodRange={periodTitleRange}
            period={period}
            weekOffset={weekOffset}
            onPrevious={goToPreviousPeriod}
            onNext={goToNextPeriod}
          />
          {typeof window !== 'undefined' ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={spo2Data} margin={{ top: 10, right: isMobile ? 10 : 20, left: isMobile ? 0 : 5, bottom: isMobile ? 30 : 5 }}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#e5e7eb" 
                  vertical={period !== '1month'} 
                  horizontal={true}
                />
                {verticalDividers.map((divider, index) => (
                  <ReferenceLine
                    key={`vertical-divider-${index}`}
                    x={divider}
                    stroke="#9ca3af"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    isFront={false}
                  />
                ))}
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280" 
                  tick={{ fill: '#6b7280', fontSize: isMobile ? 10 : 12 }} 
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? 'end' : 'middle'}
                  height={isMobile ? 60 : 30}
                />
                <YAxis stroke="#ec4899" tick={{ fill: '#6b7280' }} domain={[70, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any, name: string) => {
                    // Remove units from measurement names (anything in parentheses)
                    const nameWithoutUnit = name.replace(/\s*\([^)]*\)\s*/g, '');
                    return [`${value}%`, nameWithoutUnit];
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
                  name={`${t('chart.labels.spo2')} (${t('chart.units.percent')})`}
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
            <p className="text-gray-600 dark:text-gray-400">{t('chart.noData')}</p>
          </div>
        )}
    </div>
  );
}
