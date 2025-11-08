/**
 * User Search Component
 * Search for users by various criteria
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { UserSearchParams } from '@/lib/api/search';
import { UserPublicProfile, getLocalizedDiseaseName } from '@/lib/api/users';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [memberId, setMemberId] = useState('');
  const [selectedDiseases, setSelectedDiseases] = useState<number[]>([]);
  const [results, setResults] = useState<UserPublicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: UserSearchParams = {
        limit: 20,
      };

      if (searchQuery) params.q = searchQuery;
      if (memberId) params.member_id = memberId;
      if (selectedDiseases.length > 0) {
        params.disease_ids = selectedDiseases.join(',');
      }

      const searchResults = await onSearch(params);
      setResults(searchResults);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleDisease = (diseaseId: number) => {
    setSelectedDiseases((prev) =>
      prev.includes(diseaseId)
        ? prev.filter((id) => id !== diseaseId)
        : [...prev, diseaseId]
    );
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
          placeholder="ニックネーム、ユーザー名で検索..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '検索中...' : '検索'}
        </button>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {showAdvanced ? '詳細を隠す' : '詳細検索'}
        </button>
      </div>

      {/* Advanced Search Options */}
      {showAdvanced && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          {/* Member ID Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              会員ID（完全一致）
            </label>
            <input
              type="text"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder="12桁の会員ID"
              maxLength={12}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Disease Filter */}
          {diseases.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                疾患で絞り込み
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
            検索結果 ({results.length}件)
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
                    <img
                      src={user.avatar_url}
                      alt={user.nickname || 'User'}
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
                    <p className="text-xs text-gray-500 mt-1">会員ID: {user.member_id}</p>

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
        <div className="text-center py-8 text-gray-500">検索結果がありません</div>
      )}
    </div>
  );
}
