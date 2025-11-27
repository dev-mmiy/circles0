/**
 * Disease Search Component
 * Advanced search UI for finding diseases
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { DiseaseSearchParams, DiseaseSearchResult, autocompleteIcdCodes } from '@/lib/api/search';
import { getLocalizedDiseaseName } from '@/lib/api/users';
import { useAuth0 } from '@auth0/auth0-react';
import {
  getSearchHistory,
  addToSearchHistory,
  clearSearchHistory,
  removeFromSearchHistory,
  type SearchHistoryItem,
} from '@/lib/utils/searchHistory';
import {
  getDiseaseSearchFilterSettings,
  saveDiseaseSearchFilterSettings,
  clearDiseaseSearchFilterSettings,
  type DiseaseSearchFilterSettings,
} from '@/lib/utils/filterSettings';
import { X, Clock } from 'lucide-react';

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
  const { getAccessTokenSilently } = useAuth0();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [icdCode, setIcdCode] = useState('');
  const [useRangeSearch, setUseRangeSearch] = useState(false);
  const [icdCodeFrom, setIcdCodeFrom] = useState('');
  const [icdCodeTo, setIcdCodeTo] = useState('');
  const [icdCodeSuggestions, setIcdCodeSuggestions] = useState<string[]>([]);
  const [icdCodeFromSuggestions, setIcdCodeFromSuggestions] = useState<string[]>([]);
  const [icdCodeToSuggestions, setIcdCodeToSuggestions] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showAutocompleteFrom, setShowAutocompleteFrom] = useState(false);
  const [showAutocompleteTo, setShowAutocompleteTo] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'disease_code' | 'created_at'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [results, setResults] = useState<DiseaseSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: DiseaseSearchParams = {
        language: preferredLanguage,
        limit: 20,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (searchQuery) params.q = searchQuery;
      if (selectedCategories.length > 0) {
        params.category_ids = selectedCategories.join(',');
      }
      if (useRangeSearch) {
        if (icdCodeFrom) params.icd_code_from = icdCodeFrom;
        if (icdCodeTo) params.icd_code_to = icdCodeTo;
      } else {
        if (icdCode) params.icd_code = icdCode;
      }

      const searchResults = await onSearch(params);
      setResults(searchResults);
      
      // Save to search history if query exists
      if (searchQuery.trim()) {
        addToSearchHistory('disease', searchQuery, {
          category_ids: selectedCategories.length > 0 ? selectedCategories.join(',') : undefined,
          icd_code: icdCode || undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
        });
        setSearchHistory(getSearchHistory('disease'));
      }
      
      setShowHistory(false);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : t('errors.searchFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Load search history and filter settings on mount
  useEffect(() => {
    setSearchHistory(getSearchHistory('disease'));
    
    // Restore saved filter settings
    const savedSettings = getDiseaseSearchFilterSettings();
    if (savedSettings) {
      if (savedSettings.categoryIds && savedSettings.categoryIds.length > 0) {
        setSelectedCategories(savedSettings.categoryIds);
      }
      if (savedSettings.icdCode) setIcdCode(savedSettings.icdCode);
      if (savedSettings.sortBy) setSortBy(savedSettings.sortBy);
      if (savedSettings.sortOrder) setSortOrder(savedSettings.sortOrder);
    }
  }, []);

  // Autocomplete ICD codes for single code input
  useEffect(() => {
    if (useRangeSearch) return; // Skip if range search is enabled
    
    const fetchAutocomplete = async () => {
      if (icdCode && icdCode.length >= 1) {
        try {
          const token = await getAccessTokenSilently().catch(() => undefined);
          const suggestions = await autocompleteIcdCodes(icdCode, 10, token);
          setIcdCodeSuggestions(suggestions);
          setShowAutocomplete(suggestions.length > 0);
        } catch (err) {
          // Silently fail autocomplete
          setIcdCodeSuggestions([]);
          setShowAutocomplete(false);
        }
      } else {
        setIcdCodeSuggestions([]);
        setShowAutocomplete(false);
      }
    };

    const debounceTimer = setTimeout(fetchAutocomplete, 300);
    return () => clearTimeout(debounceTimer);
  }, [icdCode, useRangeSearch, getAccessTokenSilently]);

  // Autocomplete ICD codes for range search - From
  useEffect(() => {
    if (!useRangeSearch) return; // Skip if range search is disabled
    
    const fetchAutocomplete = async () => {
      if (icdCodeFrom && icdCodeFrom.length >= 1) {
        try {
          const token = await getAccessTokenSilently().catch(() => undefined);
          const suggestions = await autocompleteIcdCodes(icdCodeFrom, 10, token);
          setIcdCodeFromSuggestions(suggestions);
          setShowAutocompleteFrom(suggestions.length > 0);
        } catch (err) {
          // Silently fail autocomplete
          setIcdCodeFromSuggestions([]);
          setShowAutocompleteFrom(false);
        }
      } else {
        setIcdCodeFromSuggestions([]);
        setShowAutocompleteFrom(false);
      }
    };

    const debounceTimer = setTimeout(fetchAutocomplete, 300);
    return () => clearTimeout(debounceTimer);
  }, [icdCodeFrom, useRangeSearch, getAccessTokenSilently]);

  // Autocomplete ICD codes for range search - To
  useEffect(() => {
    if (!useRangeSearch) return; // Skip if range search is disabled
    
    const fetchAutocomplete = async () => {
      if (icdCodeTo && icdCodeTo.length >= 1) {
        try {
          const token = await getAccessTokenSilently().catch(() => undefined);
          const suggestions = await autocompleteIcdCodes(icdCodeTo, 10, token);
          setIcdCodeToSuggestions(suggestions);
          setShowAutocompleteTo(suggestions.length > 0);
        } catch (err) {
          // Silently fail autocomplete
          setIcdCodeToSuggestions([]);
          setShowAutocompleteTo(false);
        }
      } else {
        setIcdCodeToSuggestions([]);
        setShowAutocompleteTo(false);
      }
    };

    const debounceTimer = setTimeout(fetchAutocomplete, 300);
    return () => clearTimeout(debounceTimer);
  }, [icdCodeTo, useRangeSearch, getAccessTokenSilently]);

  // Save filter settings when they change
  useEffect(() => {
    const settings: DiseaseSearchFilterSettings = {
      categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
      icdCode: icdCode || undefined,
      sortBy,
      sortOrder,
    };
    saveDiseaseSearchFilterSettings(settings);
  }, [selectedCategories, icdCode, sortBy, sortOrder]);

  // Handle search from history
  const handleHistoryClick = (historyItem: SearchHistoryItem) => {
    setSearchQuery(historyItem.query);
    setShowHistory(false);
    // Optionally restore params if stored
    if (historyItem.params) {
      if (historyItem.params.category_ids) {
        setSelectedCategories(historyItem.params.category_ids.split(',').map(Number));
      }
      if (historyItem.params.icd_code) setIcdCode(historyItem.params.icd_code);
      if (historyItem.params.sort_by) setSortBy(historyItem.params.sort_by);
      if (historyItem.params.sort_order) setSortOrder(historyItem.params.sort_order);
    }
    // Trigger search
    setTimeout(() => {
      handleSearch();
    }, 100);
  };

  // Clear search history
  const handleClearHistory = () => {
    clearSearchHistory('disease');
    setSearchHistory([]);
  };

  // Remove single history item
  const handleRemoveHistoryItem = (e: React.MouseEvent, query: string) => {
    e.stopPropagation();
    removeFromSearchHistory('disease', query);
    setSearchHistory(getSearchHistory('disease'));
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
      <div className="flex gap-2 relative">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowHistory(e.target.value === '' && searchHistory.length > 0);
            }}
            onFocus={() => {
              if (searchHistory.length > 0 && !searchQuery) {
                setShowHistory(true);
              }
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t('placeholder')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          
          {/* Search History Dropdown */}
          {showHistory && searchHistory.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {t('searchHistory')}
                </span>
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {t('clearHistory')}
                </button>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {searchHistory.map((item) => (
                  <button
                    key={`${item.query}-${item.timestamp}`}
                    onClick={() => handleHistoryClick(item)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between group"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{item.query}</span>
                    <button
                      onClick={(e) => handleRemoveHistoryItem(e, item.query)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-opacity"
                      aria-label="Remove"
                    >
                      <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? t('searching') : t('search')}
        </button>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          {showAdvanced ? t('hideAdvanced') : t('advancedSearch')}
        </button>
      </div>
      
      {/* Click outside to close history */}
      {showHistory && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowHistory(false)}
        />
      )}

      {/* Advanced Search Options */}
      {showAdvanced && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          {/* Clear Filters Button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setSelectedCategories([]);
                setIcdCode('');
                setIcdCodeFrom('');
                setIcdCodeTo('');
                setUseRangeSearch(false);
                setSortBy('name');
                setSortOrder('asc');
                clearDiseaseSearchFilterSettings();
              }}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800"
            >
              {t('clearFilters')}
            </button>
          </div>
          {/* ICD-10 Code Search */}
          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={useRangeSearch}
                  onChange={(e) => {
                    setUseRangeSearch(e.target.checked);
                    if (!e.target.checked) {
                      setIcdCodeFrom('');
                      setIcdCodeTo('');
                    }
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('useRangeSearch')}
                </span>
              </label>
            </div>

            {useRangeSearch ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('icdCodeFromLabel')}
                  </label>
                  <input
                    type="text"
                    value={icdCodeFrom}
                    onChange={(e) => {
                      setIcdCodeFrom(e.target.value);
                    }}
                    onFocus={() => setShowAutocompleteFrom(icdCodeFrom.length >= 1 && icdCodeFromSuggestions.length > 0)}
                    onBlur={() => setTimeout(() => setShowAutocompleteFrom(false), 200)}
                    placeholder={t('icdCodeFromPlaceholder')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  {showAutocompleteFrom && icdCodeFromSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        {t('autocompleteSuggestions')}
                      </div>
                      {icdCodeFromSuggestions.map((code) => (
                        <button
                          key={code}
                          onClick={() => {
                            setIcdCodeFrom(code);
                            setShowAutocompleteFrom(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-100"
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('icdCodeToLabel')}
                  </label>
                  <input
                    type="text"
                    value={icdCodeTo}
                    onChange={(e) => {
                      setIcdCodeTo(e.target.value);
                    }}
                    onFocus={() => setShowAutocompleteTo(icdCodeTo.length >= 1 && icdCodeToSuggestions.length > 0)}
                    onBlur={() => setTimeout(() => setShowAutocompleteTo(false), 200)}
                    placeholder={t('icdCodeToPlaceholder')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  {showAutocompleteTo && icdCodeToSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        {t('autocompleteSuggestions')}
                      </div>
                      {icdCodeToSuggestions.map((code) => (
                        <button
                          key={code}
                          onClick={() => {
                            setIcdCodeTo(code);
                            setShowAutocompleteTo(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-100"
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('icdCodeLabel')}
                </label>
                <input
                  type="text"
                  value={icdCode}
                  onChange={(e) => {
                    setIcdCode(e.target.value);
                    setShowAutocomplete(e.target.value.length >= 1);
                  }}
                  onFocus={() => setShowAutocomplete(icdCode.length >= 1 && icdCodeSuggestions.length > 0)}
                  onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                  placeholder={t('icdCodePlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                />
                {showAutocomplete && icdCodeSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      {t('autocompleteSuggestions')}
                    </div>
                    {icdCodeSuggestions.map((code) => (
                      <button
                        key={code}
                        onClick={() => {
                          setIcdCode(code);
                          setShowAutocomplete(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-100"
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('categoryLabel')}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {categories.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center p-2 border border-gray-200 dark:border-gray-700 rounded cursor-pointer hover:bg-white dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{category.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Sort Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('sortByLabel')}
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'disease_code' | 'created_at')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="name">{t('sortByName')}</option>
                <option value="disease_code">{t('sortByCode')}</option>
                <option value="created_at">{t('sortByDate')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('sortOrderAsc')} / {t('sortOrderDesc')}
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="asc">{t('sortOrderAsc')}</option>
                <option value="desc">{t('sortOrderDesc')}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('resultsTitle', { count: results.length })}
          </h3>
          <div className="space-y-2">
            {results.map((disease) => (
              <div
                key={disease.id}
                onClick={() => onSelect && onSelect(disease)}
                className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow ${
                  onSelect ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30' : ''
                } bg-white dark:bg-gray-800`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {getDiseaseName(disease)}
                    </h4>
                    {disease.disease_code && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {t('code')}: {disease.disease_code}
                      </p>
                    )}
                    {disease.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{disease.description}</p>
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
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {t('noResults')}
        </div>
      )}
    </div>
  );
}
