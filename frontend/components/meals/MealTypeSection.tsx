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
            const foods = record.health_record_data?.foods || [];
            const nutrition = record.health_record_data?.nutrition;
            
            return (
              <div
                key={record.id}
                className="bg-gray-50 dark:bg-gray-700/50 rounded p-2 space-y-1"
              >
                {/* Foods */}
                {foods.length > 0 && (
                  <div className="space-y-1">
                    {foods.map((food: any, index: number) => (
                      <div key={index} className="text-sm text-gray-700 dark:text-gray-300">
                        • {food.name}
                        {food.amount && (
                          <span className="text-gray-500 dark:text-gray-400 ml-1">
                            ({food.amount}{food.unit || 'g'})
                          </span>
                        )}
                      </div>
                    ))}
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
    </div>
  );
}

