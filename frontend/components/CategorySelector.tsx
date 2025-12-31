/**
 * Category Selector Component
 * Hierarchical category selection dropdown
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { DiseaseCategory } from '@/lib/api/diseases';

interface CategorySelectorProps {
  categories: DiseaseCategory[];
  selectedCategoryId?: number;
  onSelect: (categoryId: number | undefined) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export function CategorySelector({
  categories,
  selectedCategoryId,
  onSelect,
  label,
  placeholder,
  required = false,
}: CategorySelectorProps) {
  const t = useTranslations('categorySelector');
  const locale = useLocale();
  const [selectedId, setSelectedId] = useState<number | undefined>(selectedCategoryId);

  // Use provided label/placeholder or fallback to translations
  const displayLabel = label ?? t('label');
  const displayPlaceholder = placeholder ?? t('placeholder');

  // Update local state when prop changes
  useEffect(() => {
    setSelectedId(selectedCategoryId);
  }, [selectedCategoryId]);

  // Get category name (with translation if available)
  const getCategoryName = (category: DiseaseCategory): string => {
    if (category.translations && category.translations.length > 0) {
      // Try to find translation matching current locale
      const localeTranslation = category.translations.find(trans => trans.language_code === locale);
      if (localeTranslation) {
        return localeTranslation.translated_name;
      }
      // Fallback to Japanese translation
      const jaTranslation = category.translations.find(trans => trans.language_code === 'ja');
      if (jaTranslation) {
        return jaTranslation.translated_name;
      }
      // Fallback to first available translation
      return category.translations[0].translated_name;
    }
    return category.category_code;
  };

  // Build hierarchical category tree
  const buildCategoryTree = (): DiseaseCategory[] => {
    const rootCategories = categories.filter(c => !c.parent_category_id);
    return rootCategories.sort((a, b) => a.display_order - b.display_order);
  };

  // Get child categories
  const getChildCategories = (parentId: number): DiseaseCategory[] => {
    return categories
      .filter(c => c.parent_category_id === parentId)
      .sort((a, b) => a.display_order - b.display_order);
  };

  // Render category option with indentation for hierarchy
  const renderCategoryOption = (category: DiseaseCategory, level: number = 0): JSX.Element[] => {
    // Use regular space for English, full-width space for Japanese
    const indent = locale === 'ja' ? '　'.repeat(level) : '  '.repeat(level);
    const options: JSX.Element[] = [
      <option key={category.id} value={category.id}>
        {indent}
        {level > 0 && '└ '}
        {getCategoryName(category)}
      </option>,
    ];

    // Add child categories
    const children = getChildCategories(category.id);
    children.forEach(child => {
      options.push(...renderCategoryOption(child, level + 1));
    });

    return options;
  };

  // Handle selection change
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const categoryId = value ? parseInt(value, 10) : undefined;
    setSelectedId(categoryId);
    onSelect(categoryId);
  };

  const rootCategories = buildCategoryTree();

  return (
    <div>
      {displayLabel && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {displayLabel}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        value={selectedId || ''}
        onChange={handleChange}
        required={required}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">{displayPlaceholder}</option>
        {rootCategories.map(category => renderCategoryOption(category))}
      </select>
    </div>
  );
}

/**
 * Category Breadcrumb Component
 * Shows the hierarchical path of a category
 */

interface CategoryBreadcrumbProps {
  categories: DiseaseCategory[];
  categoryId: number;
}

export function CategoryBreadcrumb({ categories, categoryId }: CategoryBreadcrumbProps) {
  const locale = useLocale();

  // Get category name
  const getCategoryName = (category: DiseaseCategory): string => {
    if (category.translations && category.translations.length > 0) {
      // Try to find translation matching current locale
      const localeTranslation = category.translations.find(trans => trans.language_code === locale);
      if (localeTranslation) {
        return localeTranslation.translated_name;
      }
      // Fallback to Japanese translation
      const jaTranslation = category.translations.find(trans => trans.language_code === 'ja');
      if (jaTranslation) {
        return jaTranslation.translated_name;
      }
      // Fallback to first available translation
      return category.translations[0].translated_name;
    }
    return category.category_code;
  };

  // Build breadcrumb path
  const buildBreadcrumb = (id: number): DiseaseCategory[] => {
    const category = categories.find(c => c.id === id);
    if (!category) return [];

    if (category.parent_category_id) {
      return [...buildBreadcrumb(category.parent_category_id), category];
    }

    return [category];
  };

  const breadcrumb = buildBreadcrumb(categoryId);

  if (breadcrumb.length === 0) return null;

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {breadcrumb.map((category, index) => (
          <li key={category.id} className="inline-flex items-center">
            {index > 0 && (
              <svg
                className="w-3 h-3 text-gray-400 mx-1"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 6 10"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m1 9 4-4-4-4"
                />
              </svg>
            )}
            <span
              className={`text-sm ${
                index === breadcrumb.length - 1 ? 'font-medium text-gray-700' : 'text-gray-500'
              }`}
            >
              {getCategoryName(category)}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
