'use client';

import { useMemo, useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { VitalRecordGroup } from '@/types/vitalRecords';

interface VitalRecordCalendarProps {
  records: VitalRecordGroup[];
  onDateClick: (date: Date, records: VitalRecordGroup[]) => void;
}

// 記録があるかどうかをチェック
const hasRecords = (group: VitalRecordGroup): boolean => {
  return !!(
    group.bloodPressure ||
    group.heartRate ||
    group.temperature ||
    group.weight ||
    group.bodyFat ||
    group.bloodGlucose ||
    group.spo2
  );
};

export default function VitalRecordCalendar({ records, onDateClick }: VitalRecordCalendarProps) {
  const locale = useLocale();
  const t = useTranslations('daily.calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 現在のロケールに応じた date-fns ロケールを取得
  const dateFnsLocale = useMemo(() => {
    return locale === 'ja' ? ja : enUS;
  }, [locale]);

  // 曜日ヘッダーをロケールに応じて取得
  const weekDays = useMemo(() => {
    if (locale === 'ja') {
      return ['日', '月', '火', '水', '木', '金', '土'];
    } else {
      // 英語の場合は date-fns のロケールから取得
      const days = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(2024, 0, 7 + i); // 2024年1月7日は日曜日
        days.push(format(date, 'EEE', { locale: dateFnsLocale }));
      }
      return days;
    }
  }, [locale, dateFnsLocale]);

  // 日付をキーとして記録をグループ化（yyyy-MM-dd形式）
  const recordsByDate = useMemo(() => {
    const map = new Map<string, VitalRecordGroup[]>();
    records.forEach(record => {
      const dateKey = format(new Date(record.recordedAt), 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(record);
    });
    return map;
  }, [records]);

  // カレンダーの日付を生成（月の開始日から終了日まで、週の開始と終了も含める）
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // 日曜日開始
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // 各日に記録があるかチェック
  const getRecordsForDate = (date: Date): VitalRecordGroup[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return recordsByDate.get(dateKey) || [];
  };

  // 前月に移動
  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  // 次月に移動
  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // 今日の日付
  const today = new Date();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {/* 月のナビゲーション */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={t('previousMonth')}
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {format(currentMonth, locale === 'ja' ? 'yyyy年MM月' : 'MMMM yyyy', { locale: dateFnsLocale })}
        </h2>
        <button
          onClick={goToNextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={t('nextMonth')}
        >
          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 gap-2">
        {/* 曜日ヘッダー */}
        {weekDays.map(day => (
          <div
            key={day}
            className="text-center text-sm font-medium text-gray-700 dark:text-gray-300 py-2"
          >
            {day}
          </div>
        ))}

        {/* 日付セル */}
        {calendarDays.map(day => {
          const dayRecords = getRecordsForDate(day);
          const hasRecords = dayRecords.length > 0;
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, today);

          return (
            <button
              key={day.toISOString()}
              onClick={() => hasRecords && onDateClick(day, dayRecords)}
              disabled={!hasRecords}
              className={`
                relative p-2 rounded-lg text-sm transition-all
                ${
                  !isCurrentMonth
                    ? hasRecords
                      ? 'text-blue-900 dark:text-blue-200'
                      : 'text-gray-300 dark:text-gray-600'
                    : 'text-gray-900 dark:text-gray-100'
                }
                ${isToday ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
                ${
                  hasRecords
                    ? 'bg-blue-200 dark:bg-blue-800/50 hover:bg-blue-300 dark:hover:bg-blue-800/60 cursor-pointer font-semibold ring-2 ring-blue-400 dark:ring-blue-500 shadow-sm'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-default'
                }
                ${!isCurrentMonth && hasRecords ? 'opacity-60' : ''}
              `}
            >
              <div className="text-center">{format(day, 'd')}</div>
            </button>
          );
        })}
      </div>

      {/* 凡例 */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('legend')}</div>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/40" />
            <span className="text-gray-600 dark:text-gray-400">{t('hasRecords')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
