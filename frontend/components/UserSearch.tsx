/**
 * User Search Component
 * Search for users by various criteria
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { UserSearchParams } from '@/lib/api/search';
import { UserPublicProfile, getLocalizedDiseaseName } from '@/lib/api/users';
import {
  getSearchHistory,
  addToSearchHistory,
  clearSearchHistory,
  removeFromSearchHistory,
  type SearchHistoryItem,
} from '@/lib/utils/searchHistory';
import {
  getUserSearchFilterSettings,
  saveUserSearchFilterSettings,
  clearUserSearchFilterSettings,
  type UserSearchFilterSettings,
} from '@/lib/utils/filterSettings';
import { X, Clock } from 'lucide-react';

interface UserSearchProps {
  onSearch: (params: UserSearchParams) => Promise<UserPublicProfile[]>;
  diseases?: Array<{ id: number; name: string; translations?: any[] }>;
  preferredLanguage?: string;
}

export function UserSearch({
  onSearch,
  diseases = [],
  preferredLanguage = 'ja',
}: UserSearchProps) {
  const t = useTranslations('userSearch');
  const [searchQuery, setSearchQuery] = useState('');
  const [memberId, setMemberId] = useState('');
  const [selectedDiseases, setSelectedDiseases] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<'created_at' | 'last_login' | 'nickname'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [results, setResults] = useState<UserPublicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: UserSearchParams = {
        limit: 20,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (searchQuery) params.q = searchQuery;
      if (memberId) params.member_id = memberId;
      if (selectedDiseases.length > 0) {
        params.disease_ids = selectedDiseases.join(',');
      }

      const searchResults = await onSearch(params);
      setResults(searchResults);
      
      // Save to search history if query exists
      if (searchQuery.trim()) {
        addToSearchHistory('user', searchQuery, {
          member_id: memberId || undefined,
          disease_ids: selectedDiseases.length > 0 ? selectedDiseases.join(',') : undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
        });
        setSearchHistory(getSearchHistory('user'));
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
    setSearchHistory(getSearchHistory('user'));
    
    // Restore saved filter settings
    const savedSettings = getUserSearchFilterSettings();
    if (savedSettings) {
      if (savedSettings.memberId) setMemberId(savedSettings.memberId);
      if (savedSettings.diseaseIds && savedSettings.diseaseIds.length > 0) {
        setSelectedDiseases(savedSettings.diseaseIds);
      }
      if (savedSettings.sortBy) setSortBy(savedSettings.sortBy);
      if (savedSettings.sortOrder) setSortOrder(savedSettings.sortOrder);
    }
  }, []);

  // Save filter settings when they change
  useEffect(() => {
    const settings: UserSearchFilterSettings = {
      memberId: memberId || undefined,
      diseaseIds: selectedDiseases.length > 0 ? selectedDiseases : undefined,
      sortBy,
      sortOrder,
    };
    saveUserSearchFilterSettings(settings);
  }, [memberId, selectedDiseases, sortBy, sortOrder]);

  const toggleDisease = (diseaseId: number) => {
    setSelectedDiseases((prev) =>
      prev.includes(diseaseId)
        ? prev.filter((id) => id !== diseaseId)
        : [...prev, diseaseId]
    );
  };

  // Handle search from history
  const handleHistoryClick = (historyItem: SearchHistoryItem) => {
    setSearchQuery(historyItem.query);
    setShowHistory(false);
    // Optionally restore params if stored
    if (historyItem.params) {
      if (historyItem.params.member_id) setMemberId(historyItem.params.member_id);
      if (historyItem.params.disease_ids) {
        setSelectedDiseases(historyItem.params.disease_ids.split(',').map(Number));
      }
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
    clearSearchHistory('user');
    setSearchHistory([]);
  };

  // Remove single history item
  const handleRemoveHistoryItem = (e: React.MouseEvent, query: string) => {
    e.stopPropagation();
    removeFromSearchHistory('user', query);
    setSearchHistory(getSearchHistory('user'));
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          {/* Search History Dropdown */}
          {showHistory && searchHistory.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              <div className="p-2 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {t('searchHistory')}
                </span>
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  {t('clearHistory')}
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {searchHistory.map((item) => (
                  <button
                    key={`${item.query}-${item.timestamp}`}
                    onClick={() => handleHistoryClick(item)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group"
                  >
                    <span className="text-sm text-gray-700 flex-1">{item.query}</span>
                    <button
                      onClick={(e) => handleRemoveHistoryItem(e, item.query)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
                      aria-label="Remove"
                    >
                      <X className="w-3 h-3 text-gray-500" />
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
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
                setMemberId('');
                setSelectedDiseases([]);
                setSortBy('created_at');
                setSortOrder('desc');
                clearUserSearchFilterSettings();
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-white transition-colors"
            >
              {t('clearFilters')}
            </button>
          </div>
          {/* Member ID Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('memberIdLabel')}
            </label>
            <input
              type="text"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder={t('memberIdPlaceholder')}
              maxLength={12}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Disease Filter */}
          {diseases.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('diseaseFilterLabel')}
              </label>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {diseases.map((disease) => (
                  <label
                    key={disease.id}
                    className="flex items-center p-2 border rounded cursor-pointer hover:bg-white transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDiseases.includes(disease.id)}
                      onChange={() => toggleDisease(disease.id)}
                      className="mr-2"
                    />
                    <span className="text-sm">
                      {disease.translations && disease.translations.length > 0
                        ? disease.translations.find((t) => t.language_code === preferredLanguage)
                            ?.translated_name ||
                          disease.translations.find((t) => t.language_code === 'ja')
                            ?.translated_name ||
                          disease.name
                        : disease.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Sort Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('sortByLabel')}
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'created_at' | 'last_login' | 'nickname')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="created_at">{t('sortByDate')}</option>
                <option value="last_login">{t('sortByLogin')}</option>
                <option value="nickname">{t('sortByName')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('sortOrderAsc')} / {t('sortOrderDesc')}
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <div className="space-y-4">
            {results.map((user) => (
              <Link
                key={user.id}
                href={`/profile/${user.id}`}
                className="block p-4 border rounded-lg hover:shadow-md hover:bg-blue-50 transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  {user.avatar_url ? (
                    <Image
                      src={user.avatar_url}
                      alt={user.nickname || 'User'}
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-2xl text-gray-600 font-bold">
                        {user.nickname?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                  )}

                  {/* User Info */}
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900">{user.nickname}</h4>
                    {user.username && (
                      <p className="text-sm text-gray-600">@{user.username}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">{t('memberId')}: {user.member_id}</p>

                    {user.bio && <p className="text-sm text-gray-700 mt-2">{user.bio}</p>}

                    {/* Diseases */}
                    {user.diseases && user.diseases.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {user.diseases.map((disease) => {
                          const diseaseName =
                            disease.translations && disease.translations.length > 0
                              ? disease.translations.find(
                                  (t) => t.language_code === preferredLanguage
                                )?.translated_name ||
                                disease.translations.find((t) => t.language_code === 'ja')
                                  ?.translated_name ||
                                disease.name
                              : disease.name;

                          return (
                            <span
                              key={disease.id}
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {diseaseName}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && results.length === 0 && (searchQuery || memberId || selectedDiseases.length > 0) && (
        <div className="text-center py-8 text-gray-500">{t('noResults')}</div>
      )}
    </div>
  );
}
