/**
 * Search Page
 * Unified search interface for diseases and users
 */

'use client';

import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { DiseaseSearch } from '@/components/DiseaseSearch';
import { UserSearch } from '@/components/UserSearch';
import { HashtagSearch } from '@/components/HashtagSearch';
import { searchDiseases, searchUsers } from '@/lib/api/search';
import { useDisease } from '@/contexts/DiseaseContext';
import { useUser } from '@/contexts/UserContext';
import { DiseaseCategory } from '@/lib/api/diseases';
import { setPageTitle } from '@/lib/utils/pageTitle';

type SearchTab = 'diseases' | 'users' | 'hashtags';

export default function SearchPage() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const t = useTranslations('searchPage');
  
  // Set page title
  useEffect(() => {
    setPageTitle(t('pageTitle') || 'Search');
  }, [t]);
  const locale = useLocale();
  const { user } = useUser();
  const { categories, diseases: allDiseases } = useDisease();
  const searchParams = useSearchParams();

  // Get initial tab and query from URL params
  const urlTab = searchParams ? (searchParams.get('type') as SearchTab | null) : null;
  const urlQuery = searchParams ? (searchParams.get('q') || '') : '';

  const [activeTab, setActiveTab] = useState<SearchTab>(
    urlTab && ['diseases', 'users', 'hashtags'].includes(urlTab) ? urlTab : 'diseases'
  );
  const [selectedDiseaseId, setSelectedDiseaseId] = useState<number | undefined>(undefined);

  const handleDiseaseSearch = async (params: any) => {
    try {
      let accessToken: string | undefined = undefined;
      if (isAuthenticated) {
        try {
          accessToken = await getAccessTokenSilently();
        } catch (tokenError) {
          console.warn('Failed to get access token for disease search:', tokenError);
        }
      }
      return await searchDiseases(params, accessToken);
    } catch (error) {
      console.error('Disease search error:', error);
      // Try without token if auth fails
      return await searchDiseases(params);
    }
  };

  const handleUserSearch = async (params: any) => {
    try {
      // Only try to get token if authenticated
      let accessToken: string | undefined = undefined;
      if (isAuthenticated) {
        try {
          accessToken = await getAccessTokenSilently();
        } catch (tokenError) {
          // If token retrieval fails, proceed without token
          console.warn(
            'Failed to get access token for user search, proceeding without authentication:',
            tokenError
          );
        }
      }
      return await searchUsers(params, accessToken);
    } catch (error) {
      console.error('User search error:', error);
      // Try without token if auth fails
      return await searchUsers(params);
    }
  };

  // Get category name with translation (matching CategorySelector logic)
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

  // Format categories for search component
  const formattedCategories = categories.map(cat => {
    return {
      id: cat.id,
      name: getCategoryName(cat),
    };
  });

  // Format diseases for user search component
  const formattedDiseases = allDiseases.map(disease => ({
    id: disease.id,
    name: disease.name,
    translations: disease.translations,
  }));

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {t('title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('diseases')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'diseases'
                      ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {t('tabDiseases')}
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'users'
                      ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {t('tabUsers')}
                </button>
                <button
                  onClick={() => setActiveTab('hashtags')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'hashtags'
                      ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {t('tabHashtags')}
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'diseases' ? (
                <DiseaseSearch
                  onSearch={handleDiseaseSearch}
                  onSelect={disease => {
                    // Switch to users tab and search for users with this disease
                    setActiveTab('users');
                    setSelectedDiseaseId(disease.id);
                  }}
                  categories={formattedCategories}
                  preferredLanguage={user?.preferred_language || 'ja'}
                />
              ) : activeTab === 'users' ? (
                <UserSearch
                  onSearch={handleUserSearch}
                  diseases={formattedDiseases}
                  preferredLanguage={user?.preferred_language || 'ja'}
                  initialDiseaseId={selectedDiseaseId}
                  initialSortBy="post_count"
                />
              ) : (
                <HashtagSearch
                  initialHashtag={
                    activeTab === 'hashtags' && urlQuery ? urlQuery.replace(/^#/, '') : undefined
                  }
                />
              )}
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
              {t('hintsTitle')}
            </h3>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              {activeTab === 'diseases' ? (
                <>
                  <li>• {t('hintsDiseases.hint1')}</li>
                  <li>• {t('hintsDiseases.hint2')}</li>
                  <li>• {t('hintsDiseases.hint3')}</li>
                  <li>• {t('hintsDiseases.hint4')}</li>
                </>
              ) : activeTab === 'users' ? (
                <>
                  <li>• {t('hintsUsers.hint1')}</li>
                  <li>• {t('hintsUsers.hint2')}</li>
                  <li>• {t('hintsUsers.hint3')}</li>
                  <li>• {t('hintsUsers.hint4')}</li>
                </>
              ) : (
                <>
                  <li>• {t('hintsHashtags.hint1')}</li>
                  <li>• {t('hintsHashtags.hint2')}</li>
                  <li>• {t('hintsHashtags.hint3')}</li>
                  <li>• {t('hintsHashtags.hint4')}</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
