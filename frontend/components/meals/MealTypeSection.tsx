'use client';

import { Plus, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import type { Post } from '@/lib/api/posts';

interface MealTypeSectionProps {
  date: Date;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  mealTypeLabel: string;
  records: Post[];
  onAddFood: () => void;
  onEditFood: (post: Post) => void;
  onDeleteFood: (postId: string) => void;
}

export default function MealTypeSection({
  date,
  mealType,
  mealTypeLabel,
  records,
  onAddFood,
  onEditFood,
  onDeleteFood,
}: MealTypeSectionProps) {
  const tHealthRecord = useTranslations('postForm.healthRecord.mealForm');

  // Calculate total nutrition for all records in this meal type
  const totalNutrition = records.reduce((acc, record) => {
    const nutrition = record.health_record_data?.nutrition;
    if (nutrition) {
      return {
        calories: (acc.calories || 0) + (nutrition.calories || 0),
        protein: (acc.protein || 0) + (nutrition.protein || 0),
        carbs: (acc.carbs || 0) + (nutrition.carbs || 0),
        fat: (acc.fat || 0) + (nutrition.fat || 0),
        sodium: (acc.sodium || 0) + (nutrition.sodium || 0),
        potassium: (acc.potassium || 0) + (nutrition.potassium || 0),
        phosphorus: (acc.phosphorus || 0) + (nutrition.phosphorus || 0),
      };
    }
    return acc;
  }, {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    sodium: 0,
    potassium: 0,
    phosphorus: 0,
  });

  const hasNutrition = Object.values(totalNutrition).some(val => val > 0);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
      {/* Meal Type Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {mealTypeLabel}
        </h3>
        <button
          onClick={onAddFood}
          className="flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>{tHealthRecord('addFood')}</span>
        </button>
      </div>

      {/* Foods List */}
      {records.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic py-2">
          {tHealthRecord('noFoods')}
        </p>
      ) : (
        <div className="space-y-2">
          {records.map(record => {
            const items = record.health_record_data?.items || [];
            const nutrition = record.health_record_data?.nutrition;
            
            // Debug: Log record data
            console.log('[MealTypeSection] Record:', {
              id: record.id,
              items: items,
              itemsLength: items.length,
              health_record_data: record.health_record_data,
            });
            
            return (
              <div
                key={record.id}
                className="bg-gray-50 dark:bg-gray-700/50 rounded p-2 space-y-1"
              >
                {/* Items */}
                {items.length > 0 ? (
                  <div className="space-y-1">
                    {items.map((item: any, index: number) => (
                      <div key={index} className="text-sm text-gray-700 dark:text-gray-300">
                        • {item.name || '(名前なし)'}
                        {item.amount != null && (
                          <span className="text-gray-500 dark:text-gray-400 ml-1">
                            ({item.amount}{item.unit || 'g'})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 dark:text-gray-500 italic">
                    {tHealthRecord('noFoods')}
                  </div>
                )}

                {/* Nutrition Info */}
                {nutrition && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 grid grid-cols-2 gap-1 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                    {nutrition.calories && (
                      <div>{tHealthRecord('calories')}: {nutrition.calories} kcal</div>
                    )}
                    {nutrition.protein && (
                      <div>{tHealthRecord('protein')}: {nutrition.protein} g</div>
                    )}
                    {nutrition.carbs && (
                      <div>{tHealthRecord('carbs')}: {nutrition.carbs} g</div>
                    )}
                    {nutrition.fat && (
                      <div>{tHealthRecord('fat')}: {nutrition.fat} g</div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {record.health_record_data?.notes && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {record.health_record_data.notes}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end space-x-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <button
                    onClick={() => onEditFood(record)}
                    className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title={tHealthRecord('edit')}
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDeleteFood(record.id)}
                    className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title={tHealthRecord('delete')}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Total Nutrition Summary */}
      {hasNutrition && (
        <div className="mt-3 pt-3 border-t-2 border-gray-300 dark:border-gray-600">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {tHealthRecord('totalNutrition') || '合計'}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 grid grid-cols-2 gap-1">
            {totalNutrition.calories > 0 && (
              <div>{tHealthRecord('calories')}: {Math.round(totalNutrition.calories * 10) / 10} kcal</div>
            )}
            {totalNutrition.protein > 0 && (
              <div>{tHealthRecord('protein')}: {Math.round(totalNutrition.protein * 100) / 100} g</div>
            )}
            {totalNutrition.carbs > 0 && (
              <div>{tHealthRecord('carbs')}: {Math.round(totalNutrition.carbs * 10) / 10} g</div>
            )}
            {totalNutrition.fat > 0 && (
              <div>{tHealthRecord('fat')}: {Math.round(totalNutrition.fat * 10) / 10} g</div>
            )}
            {totalNutrition.sodium > 0 && (
              <div>{tHealthRecord('sodium')}: {Math.round(totalNutrition.sodium * 100) / 100} g</div>
            )}
            {totalNutrition.potassium > 0 && (
              <div>{tHealthRecord('potassium')}: {Math.round(totalNutrition.potassium * 10) / 10} mg</div>
            )}
            {totalNutrition.phosphorus > 0 && (
              <div>{tHealthRecord('phosphorus')}: {Math.round(totalNutrition.phosphorus * 10) / 10} mg</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

