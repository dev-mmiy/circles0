'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth0 } from '@auth0/auth0-react';
import PostCard from '@/components/PostCard';
import Header from '@/components/Header';
import { useDataLoader } from '@/lib/hooks/useDataLoader';
import { getSavedPosts, type Post } from '@/lib/api/posts';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { extractErrorInfo } from '@/lib/utils/errorHandler';

export default function SavedPostsPage() {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const t = useTranslations('savedPosts');
  const [sortBy, setSortBy] = useState<'created_at' | 'post_created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const {
    items: posts,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    retry,
    clearError,
  } = useDataLoader<Post>({
    loadFn: useCallback(async (skip, limit) => {
      if (!isAuthenticated) {
        throw new Error('Authentication required');
      }
      const token = await getAccessTokenSilently();
      const fetchedPosts = await getSavedPosts(
        skip,
        limit,
        sortBy,
        sortOrder,
        token
      );
      return {
        items: fetchedPosts,
      };
    }, [isAuthenticated, getAccessTokenSilently, sortBy, sortOrder]),
    pageSize: 20,
    autoLoad: true,
    requireAuth: true,
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000,
      autoRetry: true,
    },
  });

  // Reload when sort changes
  const handleSortChange = (newSortBy: 'created_at' | 'post_created_at', newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  // 認証チェック
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">{t('authenticationRequired')}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t('pleaseLogin')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* ヘッダー */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">{t('pageTitle')}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t('pageSubtitle')}</p>
          </div>

          {/* ソートオプション */}
          <div className="mb-6 flex items-center space-x-4">
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as 'created_at' | 'post_created_at', sortOrder)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="created_at">{t('sortBy.saveDate')}</option>
              <option value="post_created_at">{t('sortBy.postDate')}</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => handleSortChange(sortBy, e.target.value as 'asc' | 'desc')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="desc">{t('sortOrder.newest')}</option>
              <option value="asc">{t('sortOrder.oldest')}</option>
            </select>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="mb-6">
              <ErrorDisplay
                error={extractErrorInfo(error)}
                onRetry={retry}
                onDismiss={clearError}
              />
            </div>
          )}

          {/* 投稿一覧 */}
          {isLoading && (!Array.isArray(posts) || posts.length === 0) ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">{t('loading')}</p>
            </div>
          ) : !Array.isArray(posts) ? (
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400">{t('errors.loadFailed') || 'Failed to load posts'}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
              <h2 className="text-xl font-semibold mb-2">{t('noSavedPosts')}</h2>
              <p className="text-gray-600 dark:text-gray-400">{t('noSavedPostsMessage')}</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onPostDeleted={() => {
                      // 削除された投稿をリストから削除するため、リロード
                      window.location.reload();
                    }}
                  />
                ))}
              </div>

              {/* もっと見るボタン */}
              {hasMore && (
                <div className="mt-6 text-center">
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingMore ? t('loadingMore') : t('loadMore')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

