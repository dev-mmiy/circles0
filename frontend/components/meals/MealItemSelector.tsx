'use client';

import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface MealItem {
  type: 'menu' | 'food';
  id?: string;
  name: string;
  amount?: number;
  unit?: string;
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    sodium?: number;
    potassium?: number;
    phosphorus?: number;
  };
}

interface MealItemSelectorProps {
  items: MealItem[];
  onItemsChange: (items: MealItem[]) => void;
  disabled?: boolean;
}

export default function MealItemSelector({ items, onItemsChange, disabled }: MealItemSelectorProps) {
  const t = useTranslations('postForm.healthRecord.mealForm');
  const [searchQuery, setSearchQuery] = useState('');
  const [itemType, setItemType] = useState<'menu' | 'food'>('food');

  const handleAddItem = () => {
    const newItem: MealItem = {
      type: itemType,
      name: '',
      amount: undefined,
      unit: itemType === 'menu' ? '1食' : '100g',
    };
    onItemsChange([...items, newItem]);
  };

  const handleUpdateItem = (index: number, updates: Partial<MealItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onItemsChange(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onItemsChange(newItems);
  };

  return (
    <div className="space-y-4">
      {/* Add Item Controls */}
      <div className="flex items-center space-x-2">
        <select
          value={itemType}
          onChange={e => setItemType(e.target.value as 'menu' | 'food')}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          disabled={disabled}
        >
          <option value="menu">{t('menu')}</option>
          <option value="food">{t('food')}</option>
        </select>
        <button
          type="button"
          onClick={handleAddItem}
          className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          disabled={disabled}
        >
          <Plus className="w-4 h-4" />
          <span>{t('addItem')}</span>
        </button>
      </div>

      {/* Items List */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50"
          >
            <div className="flex items-start space-x-2 mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded">
                {item.type === 'menu' ? t('menu') : t('food')}
              </span>
              <input
                type="text"
                value={item.name || ''}
                onChange={e => handleUpdateItem(index, { name: e.target.value })}
                placeholder={item.type === 'menu' ? t('menuName') : t('foodName')}
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                disabled={disabled}
              />
              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                disabled={disabled}
              >
                ×
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                step="0.1"
                value={item.amount != null ? String(item.amount) : ''}
                onChange={e => {
                  const value = e.target.value;
                  handleUpdateItem(index, {
                    amount: value === '' ? undefined : (value === '0' || value === '0.' || value.startsWith('0.') ? parseFloat(value) || 0 : parseFloat(value) || undefined),
                  });
                }}
                placeholder={t('amount')}
                className="w-24 p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                disabled={disabled}
              />
              <input
                type="text"
                value={item.unit || ''}
                onChange={e => handleUpdateItem(index, { unit: e.target.value })}
                placeholder={item.type === 'menu' ? '1食' : '100g'}
                className="w-20 p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                disabled={disabled}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

