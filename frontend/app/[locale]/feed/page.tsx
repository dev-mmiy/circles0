'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import PostCard from '@/components/PostCard';
import PostForm from '@/components/PostForm';
import Header from '@/components/Header';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { extractErrorInfo } from '@/lib/utils/errorHandler';
import { getFeed, type Post } from '@/lib/api/posts';

export default function FeedPage() {
  const { getAccessTokenSilently, isAuthenticated, isLoading: authLoading } = useAuth0();
  const t = useTranslations('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const POSTS_PER_PAGE = 20;

  // Load initial posts
  const loadPosts = async (reset: boolean = false) => {
    try {
      const currentPage = reset ? 0 : page;
      const accessToken = isAuthenticated
        ? await getAccessTokenSilently()
        : undefined;

      const fetchedPosts = await getFeed(
        currentPage * POSTS_PER_PAGE,
        POSTS_PER_PAGE,
        accessToken
      );

      if (reset) {
        setPosts(fetchedPosts);
        setPage(0);
      } else {
        setPosts([...posts, ...fetchedPosts]);
      }

      setHasMore(fetchedPosts.length === POSTS_PER_PAGE);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load posts:', err);
      const errorInfo = extractErrorInfo(err);
      setError(errorInfo);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (!authLoading) {
      loadPosts(true);
    }
  }, [authLoading, isAuthenticated]);

  // Load more posts
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setPage(page + 1);
    loadPosts(false);
  };

  // Refresh feed after creating a post
  const handlePostCreated = () => {
    loadPosts(true);
  };

  // Refresh feed after liking a post
  const handleLikeToggle = () => {
    // Optionally refresh or update state
    // For now, the PostCard handles like state internally
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
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

        {/* Login prompt for unauthenticated users */}
        {!isAuthenticated && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              {t('loginPrompt')}
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6">
            <ErrorDisplay
              error={error}
              onRetry={() => loadPosts(true)}
              showDetails={false}
            />
          </div>
        )}

        {/* Posts list */}
        <div className="space-y-6">
          {posts.length === 0 ? (
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
                {t('noPosts')}
              </h3>
              <p className="mt-2 text-gray-500">
                {t('noPostsMessage')}
              </p>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLikeToggle={handleLikeToggle}
                />
              ))}

              {/* Load more button */}
              {hasMore && (
                <div className="flex justify-center pt-6">
                  <button
                    onClick={handleLoadMore}
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
