'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import PostCard from '@/components/PostCard';
import Header from '@/components/Header';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { extractErrorInfo } from '@/lib/utils/errorHandler';
import { getFeed, type Post } from '@/lib/api/posts';
import { useDisease } from '@/contexts/DiseaseContext';
import { useLocale } from 'next-intl';
import { useDataLoader } from '@/lib/hooks/useDataLoader';
import { useAuth0 } from '@auth0/auth0-react';

// Dynamically import PostForm to reduce initial bundle size
const PostForm = dynamic(() => import('@/components/PostForm'), {
  loading: () => (
    <div className="mb-6 bg-white rounded-lg shadow p-4">
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-20 bg-gray-200 rounded mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-24"></div>
      </div>
    </div>
  ),
  ssr: false,
});

export default function FeedPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth0();
  const t = useTranslations('feed');
  const locale = useLocale();
  const { userDiseases } = useDisease();
  const [filterType, setFilterType] = useState<'all' | 'following' | 'disease' | 'my_posts'>('all');
  const [selectedDiseaseId, setSelectedDiseaseId] = useState<number | null>(null);

  // Unified data loader for posts
  const {
    items: posts,
    isLoading,
    isLoadingMore,
    isRefreshing,
    error,
    hasMore,
    load,
    loadMore,
    refresh,
    retry,
    clearError,
  } = useDataLoader<Post>({
    loadFn: useCallback(async (skip, limit) => {
      const fetchedPosts = await getFeed(
        skip,
        limit,
        undefined, // Token is handled by useDataLoader
        filterType,
        filterType === 'disease' ? (selectedDiseaseId ?? undefined) : undefined
      );
      return {
        items: fetchedPosts,
      };
    }, [filterType, selectedDiseaseId]),
    pageSize: 20,
    autoLoad: true,
    requireAuth: false,
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000,
      autoRetry: true,
    },
    cacheConfig: {
      enabled: true,
      ttl: 5 * 60 * 1000, // 5 minutes
    },
  });

  // Reload when filter changes (with debounce)
  const filterChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (authLoading) return;
    
    // Clear previous timeout
    if (filterChangeTimeoutRef.current) {
      clearTimeout(filterChangeTimeoutRef.current);
    }
    
    // Debounce filter changes
    filterChangeTimeoutRef.current = setTimeout(() => {
      load(true);
    }, 300); // 300ms debounce

    return () => {
      if (filterChangeTimeoutRef.current) {
        clearTimeout(filterChangeTimeoutRef.current);
      }
    };
  }, [filterType, selectedDiseaseId, authLoading, load]);

  // Refresh feed after creating a post
  const handlePostCreated = async () => {
    await refresh();
  };

  // Handle filter type change
  const handleFilterChange = (newFilterType: 'all' | 'following' | 'disease' | 'my_posts') => {
    setFilterType(newFilterType);
    if (newFilterType !== 'disease') {
      setSelectedDiseaseId(null);
    } else if (userDiseases.length > 0 && !selectedDiseaseId) {
      // Auto-select first disease if none selected
      const firstDisease = userDiseases.find(ud => ud.disease);
      if (firstDisease?.disease) {
        setSelectedDiseaseId(firstDisease.disease.id);
      }
    }
  };

  // Get disease name for display
  const getDiseaseName = (diseaseId: number): string => {
    const userDisease = userDiseases.find(ud => ud.disease?.id === diseaseId);
    if (!userDisease?.disease) return '';
    
    const translation = userDisease.disease.translations?.find(
      t => t.language_code === locale
    );
    return translation?.translated_name || userDisease.disease.name;
  };

  // Full page loading only for initial auth or redirect
  if (authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-2">
            {t('subtitle')}
          </p>
        </div>

        {/* Post creation form - only shown when authenticated */}
        {isAuthenticated && (
          <div className="mb-6">
            <PostForm onPostCreated={handlePostCreated} />
          </div>
        )}

        {/* Filter Tabs */}
        {isAuthenticated && (
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8" aria-label="Feed filter">
                <button
                  onClick={() => handleFilterChange('all')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    filterType === 'all'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t('filterAll')}
                </button>
                <button
                  onClick={() => handleFilterChange('my_posts')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    filterType === 'my_posts'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t('filterMyPosts')}
                </button>
                <button
                  onClick={() => handleFilterChange('following')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    filterType === 'following'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t('filterFollowing')}
                </button>
                {userDiseases.length > 0 && (
                  <button
                    onClick={() => handleFilterChange('disease')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      filterType === 'disease'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {t('filterDisease')}
                  </button>
                )}
              </nav>
            </div>
            
            {/* Disease selector for disease filter */}
            {filterType === 'disease' && userDiseases.length > 0 && (
              <div className="mt-4">
                <label htmlFor="disease-select" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('selectDisease')}
                </label>
                <select
                  id="disease-select"
                  value={selectedDiseaseId || ''}
                  onChange={(e) => {
                    const diseaseId = parseInt(e.target.value);
                    setSelectedDiseaseId(diseaseId);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full max-w-md"
                >
                  <option value="">{t('selectDiseasePlaceholder')}</option>
                  {userDiseases
                    .filter(userDisease => userDisease.disease)
                    .map((userDisease) => {
                      const disease = userDisease.disease!;
                      const translation = disease.translations?.find(
                        t => t.language_code === locale
                      );
                      const diseaseName = translation?.translated_name || disease.name;
                      return (
                        <option key={disease.id} value={disease.id}>
                          {diseaseName}
                        </option>
                      );
                    })}
                </select>
              </div>
            )}
            
            {/* Message when disease filter is selected but no disease chosen */}
            {filterType === 'disease' && !selectedDiseaseId && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">{t('selectDiseasePrompt')}</p>
              </div>
            )}
          </div>
        )}

        {/* Login prompt for unauthenticated users */}
        {!isAuthenticated && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              {t('loginPrompt')}
            </p>
          </div>
        )}

        {/* Error message - shown even when data exists (optimistic UI) */}
        {error && (
          <div className="mb-6">
            <ErrorDisplay
              error={error}
              onRetry={retry}
              showDetails={false}
            />
          </div>
        )}

        {/* Posts list */}
        <div className="space-y-6">
          {/* Show refresh indicator if refreshing */}
          {isRefreshing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-center text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                <span className="text-sm">{t('refreshing') || '更新中...'}</span>
              </div>
            </div>
          )}

          {/* Partial loading for posts list */}
          {isLoading && posts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="flex justify-center items-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="mt-4 text-gray-500">{t('loading') || '読み込み中...'}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {filterType === 'following' 
                  ? t('noFollowingPosts') 
                  : filterType === 'disease'
                  ? t('noDiseasePosts')
                  : filterType === 'my_posts'
                  ? t('noMyPosts')
                  : t('noPosts')}
              </h3>
              <p className="mt-2 text-gray-500">
                {filterType === 'following' 
                  ? t('noFollowingPostsMessage') 
                  : filterType === 'disease'
                  ? t('noDiseasePostsMessage', { diseaseName: selectedDiseaseId ? getDiseaseName(selectedDiseaseId) : '' })
                  : filterType === 'my_posts'
                  ? t('noMyPostsMessage')
                  : t('noPostsMessage')}
              </p>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLikeToggle={() => {
                    // PostCard handles like state internally, optionally refresh
                  }}
                  onPostUpdated={handlePostCreated}
                  onPostDeleted={handlePostCreated}
                />
              ))}

              {/* Load more button */}
              {hasMore && (
                <div className="flex justify-center pt-6">
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      isLoadingMore
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    {isLoadingMore ? (
                      <span className="flex items-center">
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        {t('loading')}
                      </span>
                    ) : (
                      t('loadMore')
                    )}
                  </button>
                </div>
              )}

              {/* End of feed message */}
              {!hasMore && posts.length > 0 && (
                <div className="text-center py-6">
                  <p className="text-gray-500">{t('allPostsShown')}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
