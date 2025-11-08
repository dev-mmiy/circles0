/**
 * Search Page
 * Unified search interface for diseases and users
 */

'use client';

import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Link from 'next/link';
import { DiseaseSearch } from '@/components/DiseaseSearch';
import { UserSearch } from '@/components/UserSearch';
import { searchDiseases, searchUsers } from '@/lib/api/search';
import { useDisease } from '@/contexts/DiseaseContext';
import { useUser } from '@/contexts/UserContext';

type SearchTab = 'diseases' | 'users';

export default function SearchPage() {
  const { getAccessTokenSilently } = useAuth0();
  const { user } = useUser();
  const { categories, diseases: allDiseases } = useDisease();
  const [activeTab, setActiveTab] = useState<SearchTab>('diseases');

  const handleDiseaseSearch = async (params: any) => {
    try {
      const accessToken = await getAccessTokenSilently();
      return await searchDiseases(params, accessToken);
    } catch (error) {
      console.error('Disease search error:', error);
      // Try without token if auth fails
      return await searchDiseases(params);
    }
  };

  const handleUserSearch = async (params: any) => {
    try {
      const accessToken = await getAccessTokenSilently();
      return await searchUsers(params, accessToken);
    } catch (error) {
      console.error('User search error:', error);
      // Try without token if auth fails
      return await searchUsers(params);
    }
  };

  // Format categories for search component
  const formattedCategories = categories.map((cat) => {
    const translation = cat.translations?.find(
      (t) => t.language_code === user?.preferred_language || 'ja'
    );
    return {
      id: cat.id,
      name: translation?.translated_name || cat.category_code || `Category ${cat.id}`,
    };
  });

  // Format diseases for user search component
  const formattedDiseases = allDiseases.map((disease) => ({
    id: disease.id,
    name: disease.name,
    translations: disease.translations,
  }));

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">検索</h1>
          <p className="text-gray-600">疾患やユーザーを検索できます</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('diseases')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'diseases'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                疾患を検索
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'users'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ユーザーを検索
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'diseases' ? (
              <DiseaseSearch
                onSearch={handleDiseaseSearch}
                categories={formattedCategories}
                preferredLanguage={user?.preferred_language || 'ja'}
              />
            ) : (
              <UserSearch
                onSearch={handleUserSearch}
                diseases={formattedDiseases}
                preferredLanguage={user?.preferred_language || 'ja'}
              />
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">検索のヒント</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            {activeTab === 'diseases' ? (
              <>
                <li>• 疾患名の一部を入力して検索できます（例: 「糖尿」）</li>
                <li>• ICD-10コードで検索できます（例: 「E11」）</li>
                <li>• カテゴリーを選択して絞り込みができます</li>
                <li>• 日本語・英語の両方で検索可能です</li>
              </>
            ) : (
              <>
                <li>• ニックネームやユーザー名で検索できます</li>
                <li>• 会員IDで正確に検索できます</li>
                <li>• 疾患を選択して、同じ疾患を持つユーザーを探せます</li>
                <li>• 公開プロフィールのみ表示されます</li>
              </>
            )}
          </ul>
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-blue-600 hover:text-blue-700 hover:underline">
            ← ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
