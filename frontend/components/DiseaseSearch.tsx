/**
 * Disease Search Component
 * Advanced search UI for finding diseases
 */

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DiseaseSearchParams, DiseaseSearchResult } from '@/lib/api/search';
import { getLocalizedDiseaseName } from '@/lib/api/users';

interface DiseaseSearchProps {
  onSearch: (params: DiseaseSearchParams) => Promise<DiseaseSearchResult[]>;
  onSelect?: (disease: DiseaseSearchResult) => void;
  categories?: Array<{ id: number; name: string }>;
  preferredLanguage?: string;
}

export function DiseaseSearch({
  onSearch,
  onSelect,
  categories = [],
  preferredLanguage = 'ja',
}: DiseaseSearchProps) {
  const t = useTranslations('diseaseSearch');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [icdCode, setIcdCode] = useState('');
  const [results, setResults] = useState<DiseaseSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: DiseaseSearchParams = {
        language: preferredLanguage,
        limit: 20,
      };

      if (searchQuery) params.q = searchQuery;
      if (selectedCategories.length > 0) {
        params.category_ids = selectedCategories.join(',');
      }
      if (icdCode) params.icd_code = icdCode;

      const searchResults = await onSearch(params);
      setResults(searchResults);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : t('errors.searchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getDiseaseName = (disease: DiseaseSearchResult): string => {
    if (!disease.translations || disease.translations.length === 0) {
      return disease.name;
    }

    const translation = disease.translations.find(
      (t) => t.language_code === preferredLanguage
    );

    if (translation) {
      return translation.translated_name;
    }

    const jaTranslation = disease.translations.find((t) => t.language_code === 'ja');
    return jaTranslation?.translated_name || disease.name;
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={t('placeholder')}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? t('searching') : t('search')}
        </button>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {showAdvanced ? t('hideAdvanced') : t('advancedSearch')}
        </button>
      </div>

      {/* Advanced Search Options */}
      {showAdvanced && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          {/* ICD-10 Code Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('icdCodeLabel')}
            </label>
            <input
              type="text"
              value={icdCode}
              onChange={(e) => setIcdCode(e.target.value)}
              placeholder={t('icdCodePlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('categoryLabel')}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {categories.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center p-2 border rounded cursor-pointer hover:bg-white transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                      className="mr-2"
                    />
                    <span className="text-sm">{category.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('resultsTitle', { count: results.length })}
          </h3>
          <div className="space-y-2">
            {results.map((disease) => (
              <div
                key={disease.id}
                onClick={() => onSelect && onSelect(disease)}
                className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${
                  onSelect ? 'cursor-pointer hover:bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900">
                      {getDiseaseName(disease)}
                    </h4>
                    {disease.disease_code && (
                      <p className="text-sm text-gray-500 mt-1">
                        {t('code')}: {disease.disease_code}
                      </p>
                    )}
                    {disease.description && (
                      <p className="text-sm text-gray-600 mt-2">{disease.description}</p>
                    )}
                  </div>
                  {onSelect && (
                    <button className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                      {t('select')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && results.length === 0 && searchQuery && (
        <div className="text-center py-8 text-gray-500">
          {t('noResults')}
        </div>
      )}
    </div>
  );
}
