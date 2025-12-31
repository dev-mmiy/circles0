'use client';

import { useMemo } from 'react';
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
} from 'recharts';
import { format, subDays, subMonths, subYears, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
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
  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '1week':
        startDate = subDays(now, 7);
        break;
      case '1month':
        startDate = subMonths(now, 1);
        break;
      case '6months':
        startDate = subMonths(now, 6);
        break;
      case '1year':
        startDate = subYears(now, 1);
        break;
    }

    return { startDate, endDate: now };
  }, [period]);

  // Filter records by date range
  const filterByDateRange = <T extends { recorded_at: string }>(records: T[]): T[] => {
    return records.filter(record => {
      const recordDate = parseISO(record.recorded_at);
      return recordDate >= dateRange.startDate && recordDate <= dateRange.endDate;
    });
  };

  // Format date for X-axis based on period
  const formatXAxisDate = (date: string) => {
    const d = parseISO(date);
    switch (period) {
      case '1week':
        return format(d, 'M/d', { locale: ja });
      case '1month':
        return format(d, 'M/d', { locale: ja });
      case '6months':
        return format(d, 'M/d', { locale: ja });
      case '1year':
        return format(d, 'M/d', { locale: ja });
      default:
        return format(d, 'M/d', { locale: ja });
    }
  };

  // Blood Pressure & Heart Rate Chart
  const bpHrData = useMemo(() => {
    const bpFiltered = filterByDateRange(bloodPressureRecords);
    const hrFiltered = filterByDateRange(heartRateRecords);

    const dataMap = new Map<
      string,
      { date: string; systolic?: number; diastolic?: number; heartRate?: number }
    >();

    bpFiltered.forEach(record => {
      const key = record.recorded_at;
      if (!dataMap.has(key)) {
        dataMap.set(key, { date: key });
      }
      const data = dataMap.get(key)!;
      data.systolic = record.systolic;
      data.diastolic = record.diastolic;
    });

    hrFiltered.forEach(record => {
      const key = record.recorded_at;
      if (!dataMap.has(key)) {
        dataMap.set(key, { date: key });
      }
      const data = dataMap.get(key)!;
      data.heartRate = record.bpm;
    });

    return Array.from(dataMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(item => ({
        ...item,
        date: formatXAxisDate(item.date),
      }));
  }, [bloodPressureRecords, heartRateRecords, period, dateRange]);

  // Weight & Body Fat Chart
  const weightFatData = useMemo(() => {
    const weightFiltered = filterByDateRange(weightRecords);
    const fatFiltered = filterByDateRange(bodyFatRecords);

    const dataMap = new Map<string, { date: string; weight?: number; bodyFat?: number }>();

    weightFiltered.forEach(record => {
      const key = record.recorded_at;
      if (!dataMap.has(key)) {
        dataMap.set(key, { date: key });
      }
      const data = dataMap.get(key)!;
      data.weight = record.value;
    });

    fatFiltered.forEach(record => {
      const key = record.recorded_at;
      if (!dataMap.has(key)) {
        dataMap.set(key, { date: key });
      }
      const data = dataMap.get(key)!;
      data.bodyFat = record.percentage;
    });

    return Array.from(dataMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(item => ({
        ...item,
        date: formatXAxisDate(item.date),
      }));
  }, [weightRecords, bodyFatRecords, period, dateRange]);

  // Temperature Chart
  const temperatureData = useMemo(() => {
    const filtered = filterByDateRange(temperatureRecords);
    return filtered
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .map(record => ({
        date: formatXAxisDate(record.recorded_at),
        temperature: record.value,
      }));
  }, [temperatureRecords, period, dateRange]);

  // Blood Glucose Chart
  const bloodGlucoseData = useMemo(() => {
    const filtered = filterByDateRange(bloodGlucoseRecords);
    return filtered
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .map(record => ({
        date: formatXAxisDate(record.recorded_at),
        bloodGlucose: record.value,
      }));
  }, [bloodGlucoseRecords, period, dateRange]);

  // SpO2 Chart
  const spo2Data = useMemo(() => {
    const filtered = filterByDateRange(spo2Records);
    return filtered
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .map(record => ({
        date: formatXAxisDate(record.recorded_at),
        spo2: record.percentage,
      }));
  }, [spo2Records, period, dateRange]);

  return (
    <div className="space-y-6">
      {/* Blood Pressure & Heart Rate Chart */}
      {bpHrData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            血圧・心拍数
          </h3>
          {typeof window !== 'undefined' ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={bpHrData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
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
                  tick={{ fill: '#6b7280' }}
                  className="dark:text-gray-400"
                />
                <YAxis
                  yAxisId="hr"
                  orientation="right"
                  label={{ value: '心拍数 (bpm)', angle: 90, position: 'insideRight' }}
                  stroke="#3b82f6"
                  tick={{ fill: '#6b7280' }}
                  className="dark:text-gray-400"
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
                    dot={{ r: 4 }}
                  />
                )}
                {bpHrData.some(d => d.diastolic !== undefined) && (
                  <Line
                    yAxisId="bp"
                    type="linear"
                    dataKey="diastolic"
                    stroke="#dc2626"
                    strokeWidth={2}
                    name="拡張期血圧 (mmHg)"
                    dot={{ r: 4 }}
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
                    dot={{ r: 4 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      )}

      {/* Weight & Body Fat Chart */}
      {weightFatData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            体重・体脂肪率
          </h3>
          {typeof window !== 'undefined' ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weightFatData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280' }} />
                <YAxis yAxisId="left" stroke="#10b981" tick={{ fill: '#6b7280' }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#059669"
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
                    type="monotone"
                    dataKey="weight"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="体重 (kg)"
                    dot={{ r: 4 }}
                  />
                )}
                {weightFatData.some(d => d.bodyFat !== undefined) && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="bodyFat"
                    stroke="#059669"
                    strokeWidth={2}
                    name="体脂肪率 (%)"
                    dot={{ r: 4 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      )}

      {/* Temperature Chart */}
      {temperatureData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">体温</h3>
          {typeof window !== 'undefined' ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={temperatureData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280' }} />
                <YAxis stroke="#3b82f6" tick={{ fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="temperature"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  name="体温 (°C)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      )}

      {/* Blood Glucose Chart */}
      {bloodGlucoseData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">血糖値</h3>
          {typeof window !== 'undefined' ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={bloodGlucoseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
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
                  type="monotone"
                  dataKey="bloodGlucose"
                  stroke="#f97316"
                  fill="#f97316"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  name="血糖値 (mg/dL)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      )}

      {/* SpO2 Chart */}
      {spo2Data.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            血中酸素濃度
          </h3>
          {typeof window !== 'undefined' ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={spo2Data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280' }} />
                <YAxis stroke="#ec4899" tick={{ fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="spo2"
                  stroke="#ec4899"
                  fill="#ec4899"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  name="SpO2 (%)"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">選択した期間に記録がありません</p>
          </div>
        )}
    </div>
  );
}
