'use client';

import { useMemo } from 'react';
import { format, eachDayOfInterval, startOfDay, endOfDay, isToday, isYesterday, isSameDay } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import type { Post } from '@/lib/api/posts';
import MealTypeSection from './MealTypeSection';

interface MealTimelineProps {
  records: Post[];
  onAddFood: (date: Date, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => void;
  onEditFood: (post: Post) => void;
  onDeleteFood: (postId: string) => void;
}

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export default function MealTimeline({ records, onAddFood, onEditFood, onDeleteFood }: MealTimelineProps) {
  const locale = useLocale();
  const t = useTranslations('meal');
  const tHealthRecord = useTranslations('postForm.healthRecord.mealForm');
  
  const dateFnsLocale = locale === 'ja' ? ja : enUS;

  // Get date range: today and past 30 days
  const dateRange = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30);
    return { start: startDate, end: today };
  }, []);

  // Generate all dates in range
  const dates = useMemo(() => {
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end }).reverse(); // Most recent first
  }, [dateRange]);

  // Group records by date and meal type
  const recordsByDateAndMealType = useMemo(() => {
    const map = new Map<string, Map<MealType, Post[]>>();
    
    records.forEach(record => {
      if (record.health_record_type !== 'meal' || !record.health_record_data?.recorded_at) {
        return;
      }
      
      const recordDate = new Date(record.health_record_data.recorded_at);
      const dateKey = format(recordDate, 'yyyy-MM-dd');
      const mealType = record.health_record_data.meal_type as MealType;
      
      if (!map.has(dateKey)) {
        map.set(dateKey, new Map());
      }
      
      const mealTypeMap = map.get(dateKey)!;
      if (!mealTypeMap.has(mealType)) {
        mealTypeMap.set(mealType, []);
      }
      
      mealTypeMap.get(mealType)!.push(record);
    });
    
    return map;
  }, [records]);

  const formatDateLabel = (date: Date): string => {
    if (isToday(date)) {
      return t('today');
    }
    if (isYesterday(date)) {
      return t('yesterday');
    }
    return format(date, locale === 'ja' ? 'M月d日(E)' : 'MMM d, EEE', { locale: dateFnsLocale });
  };

  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const mealTypeLabels = {
    breakfast: tHealthRecord('breakfast'),
    lunch: tHealthRecord('lunch'),
    dinner: tHealthRecord('dinner'),
    snack: tHealthRecord('snack'),
  };

  return (
    <div className="space-y-6">
      {dates.map(date => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const mealTypeMap = recordsByDateAndMealType.get(dateKey) || new Map();
        
        return (
          <div key={dateKey} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            {/* Date Header */}
            <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatDateLabel(date)}
              </h2>
            </div>

            {/* Meal Type Sections */}
            <div className="space-y-4">
              {mealTypes.map(mealType => {
                const mealRecords = mealTypeMap.get(mealType) || [];
                
                return (
                  <MealTypeSection
                    key={mealType}
                    date={date}
                    mealType={mealType}
                    mealTypeLabel={mealTypeLabels[mealType]}
                    records={mealRecords}
                    onAddFood={() => onAddFood(date, mealType)}
                    onEditFood={onEditFood}
                    onDeleteFood={onDeleteFood}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

