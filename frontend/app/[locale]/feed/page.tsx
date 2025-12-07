'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import PostCard from '@/components/PostCard';
import Header from '@/components/Header';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { getFeed, getSavedPosts, type Post } from '@/lib/api/posts';
import { useDisease } from '@/contexts/DiseaseContext';
import { useLocale } from 'next-intl';
import { useDataLoader } from '@/lib/hooks/useDataLoader';
import { useAuth0 } from '@auth0/auth0-react';
import PostFormModal from '@/components/PostFormModal';

export default function FeedPage() {
  const { isAuthenticated, isLoading: authLoading, getAccessTokenSilently } = useAuth0();
  const t = useTranslations('feed');
  const locale = useLocale();
  const { userDiseases } = useDisease();
  const [activeTab, setActiveTab] = useState<'default' | 'saved' | 'detailed'>('default');
  const [filterType, setFilterType] = useState<'following_and_my_posts' | 'all' | 'following' | 'disease' | 'my_posts' | 'not_following'>('following_and_my_posts');
  const [selectedDiseaseId, setSelectedDiseaseId] = useState<number | null>(null);
  const [isPostFormModalOpen, setIsPostFormModalOpen] = useState(false);
  
  // Saved posts sort options
  const [savedSortBy, setSavedSortBy] = useState<'created_at' | 'post_created_at'>('created_at');
  const [savedSortOrder, setSavedSortOrder] = useState<'asc' | 'desc'>('desc');

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
      // If saved tab is active, load saved posts
      if (activeTab === 'saved') {
        if (!isAuthenticated) {
          throw new Error('Authentication required');
        }
        const token = await getAccessTokenSilently();
        const fetchedPosts = await getSavedPosts(
          skip,
          limit,
          savedSortBy,
          savedSortOrder,
          token
        );
        return {
          items: fetchedPosts,
        };
      }
      
      // Otherwise, load feed posts
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
    }, [activeTab, filterType, selectedDiseaseId, savedSortBy, savedSortOrder, isAuthenticated, getAccessTokenSilently]),
    pageSize: 20,
    autoLoad: true,
    requireAuth: activeTab === 'saved',
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000,
      autoRetry: true,
    },
    cacheConfig: {
      enabled: activeTab !== 'saved', // Don't cache saved posts
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
  }, [filterType, selectedDiseaseId, activeTab, savedSortBy, savedSortOrder, authLoading, load]);

  // Refresh feed after creating a post
  const handlePostCreated = async () => {
    await refresh();
  };

  // Handle tab change
  const handleTabChange = (tab: 'default' | 'saved' | 'detailed') => {
    setActiveTab(tab);
    if (tab === 'default') {
      setFilterType('following_and_my_posts');
      setSelectedDiseaseId(null);
    }
  };

  // Handle filter type change
  const handleFilterChange = (newFilterType: 'all' | 'following' | 'disease' | 'my_posts' | 'not_following') => {
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

  // Full page loading only for initial auth check (wait for Auth0 to restore session from localStorage)
  // Don't show loading if we're already authenticated or if auth check is complete
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>
            {isAuthenticated && (
              <button
                onClick={() => setIsPostFormModalOpen(true)}
                className="flex items-center space-x-0.5 px-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                aria-label="Create Post"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>{t('createPost') || '投稿'}</span>
              </button>
            )}
          </div>

        {/* Filter Tabs */}
        {isAuthenticated && (
          <div className="mb-6">
            {/* Main Tabs: Default, Saved, and Detailed */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8" aria-label="Feed tabs">
                <button
                  onClick={() => handleTabChange('default')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'default'
                      ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {t('tabDefault') || 'フィード'}
                </button>
                <button
                  onClick={() => handleTabChange('saved')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'saved'
                      ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {t('tabSaved') || '保存済み'}
                </button>
                <button
                  onClick={() => handleTabChange('detailed')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'detailed'
                      ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {t('tabDetailed') || '詳細'}
                </button>
              </nav>
            </div>

            {/* Saved Posts Sort Options */}
            {activeTab === 'saved' && (
              <div className="mt-4">
                <div className="flex items-center space-x-4">
                  <select
                    value={savedSortBy}
                    onChange={(e) => {
                      setSavedSortBy(e.target.value as 'created_at' | 'post_created_at');
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="created_at">{t('savedSortBy.saveDate') || '保存日'}</option>
                    <option value="post_created_at">{t('savedSortBy.postDate') || '投稿日'}</option>
                  </select>
                  <select
                    value={savedSortOrder}
                    onChange={(e) => {
                      setSavedSortOrder(e.target.value as 'asc' | 'desc');
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="desc">{t('savedSortOrder.newest') || '新しい順'}</option>
                    <option value="asc">{t('savedSortOrder.oldest') || '古い順'}</option>
                  </select>
                </div>
              </div>
            )}

            {/* Detailed Filter Options */}
            {activeTab === 'detailed' && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => handleFilterChange('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filterType === 'all'
                        ? 'bg-blue-600 text-white dark:bg-blue-500'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t('filterAll')}
                </button>
                <button
                  onClick={() => handleFilterChange('following')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'following'
                        ? 'bg-blue-600 text-white dark:bg-blue-500'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('filterFollowing')}
                </button>
                  <button
                    onClick={() => handleFilterChange('my_posts')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filterType === 'my_posts'
                        ? 'bg-blue-600 text-white dark:bg-blue-500'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t('filterMyPosts')}
                  </button>
                  {userDiseases.length > 0 && (
                    <button
                      onClick={() => handleFilterChange('disease')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filterType === 'disease'
                          ? 'bg-blue-600 text-white dark:bg-blue-500'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t('filterDisease')}
                  </button>
                )}
            </div>
            
            {/* Disease selector for disease filter */}
            {filterType === 'disease' && userDiseases.length > 0 && (
              <div className="mt-4">
                <label htmlFor="disease-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('selectDisease')}
                </label>
                <select
                  id="disease-select"
                  value={selectedDiseaseId || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setSelectedDiseaseId(null);
                    } else {
                      const diseaseId = parseInt(value, 10);
                      if (!isNaN(diseaseId)) {
                        setSelectedDiseaseId(diseaseId);
                      }
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full max-w-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
              <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">{t('selectDiseasePrompt')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Login prompt for unauthenticated users */}
        {!isAuthenticated && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-blue-800 dark:text-blue-200">
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
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-center text-blue-600 dark:text-blue-400">
                <div className="w-4 h-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mr-2" />
                <span className="text-sm">{t('refreshing') || '更新中...'}</span>
              </div>
            </div>
          )}

          {/* Partial loading for posts list */}
          {isLoading && posts.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <div className="flex justify-center items-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">{t('loading') || '読み込み中...'}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
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
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                {activeTab === 'saved'
                  ? t('noSavedPosts') || '保存した投稿がありません'
                  : filterType === 'following' 
                  ? t('noFollowingPosts') 
                  : filterType === 'following_and_my_posts'
                  ? t('noFollowingAndMyPosts') || '投稿がありません'
                  : filterType === 'disease'
                  ? t('noDiseasePosts')
                  : filterType === 'my_posts'
                  ? t('noMyPosts')
                  : t('noPosts')}
              </h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                {activeTab === 'saved'
                  ? t('noSavedPostsMessage') || 'まだ保存した投稿がありません'
                  : filterType === 'following' 
                  ? t('noFollowingPostsMessage') 
                  : filterType === 'following_and_my_posts'
                  ? t('noFollowingAndMyPostsMessage') || 'フォローしているユーザーや自分の投稿がまだありません'
                  : filterType === 'disease'
                  ? t('noDiseasePostsMessage', { diseaseName: selectedDiseaseId ? getDiseaseName(selectedDiseaseId) : '' })
                  : filterType === 'my_posts'
                  ? t('noMyPostsMessage')
                  : t('noPostsMessage')}
              </p>
            </div>
          ) : (
            <>
              {Array.isArray(posts) && posts.map((post) => (
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
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {isLoadingMore ? (
                      <span className="flex items-center">
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
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
                  <p className="text-gray-500 dark:text-gray-400">{t('allPostsShown')}</p>
                </div>
              )}
            </>
          )}
        </div>
        </div>
      </div>

      {/* Post Form Modal */}
      {isAuthenticated && (
        <PostFormModal
          isOpen={isPostFormModalOpen}
          onClose={() => setIsPostFormModalOpen(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </>
  );
}
