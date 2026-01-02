'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth0 } from '@auth0/auth0-react';
import Header from '@/components/Header';
import PostCard from '@/components/PostCard';
import { getFeed, type Post } from '@/lib/api/posts';
import { Link as I18nLink } from '@/i18n/routing';
import { setPageTitle } from '@/lib/utils/pageTitle';

export default function Home() {
  const t = useTranslations('homePage');
  
  // Set page title
  useEffect(() => {
    setPageTitle(t('pageTitle') || 'Home');
  }, [t]);
  const { getAccessTokenSilently, isAuthenticated, isLoading: authLoading } = useAuth0();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  // Load recent posts function
  const loadRecentPosts = async () => {
    setIsLoadingPosts(true);
    setPostsError(null);

    try {
      let accessToken: string | undefined = undefined;
      if (isAuthenticated) {
        try {
          // Add timeout for token retrieval (5 seconds)
          const tokenPromise = getAccessTokenSilently();
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Token retrieval timeout')), 5000)
          );
          accessToken = await Promise.race([tokenPromise, timeoutPromise]);
        } catch (tokenError) {
          console.warn('Failed to get access token:', tokenError);
          // Continue without token - API will return public posts
        }
      }

      // Use 'following_and_my_posts' filter for authenticated users (same as Feed page default)
      // For unauthenticated users, use 'all' filter
      const filterType = isAuthenticated ? 'following_and_my_posts' : 'all';
      const recentPosts = await getFeed(0, 5, accessToken, filterType);
      setPosts(recentPosts);
    } catch (err) {
      console.error('Failed to load recent posts:', err);
      setPostsError(err instanceof Error ? err.message : 'Failed to load posts');
      // Reset hasLoadedRef on error so user can retry
      hasLoadedRef.current = false;
    } finally {
      setIsLoadingPosts(false);
    }
  };

  // Load recent posts on mount
  useEffect(() => {
    // Prevent multiple calls on re-renders
    if (hasLoadedRef.current || authLoading) return;

    hasLoadedRef.current = true;
    loadRecentPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  // Handle post deletion - refresh feed
  const handlePostDeleted = async () => {
    // Reset hasLoadedRef to allow reload
    hasLoadedRef.current = false;
    await loadRecentPosts();
  };

  // Handle post update - refresh feed
  const handlePostUpdated = async () => {
    await loadRecentPosts();
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Recent Posts Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{t('recentPosts')}</h2>
              <I18nLink
                href="/feed"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
              >
                {t('viewAllPosts')} →
              </I18nLink>
            </div>

            {isLoadingPosts ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : postsError ? (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
                <p className="text-red-800 dark:text-red-200 text-sm">{postsError}</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
                <p className="text-gray-600 dark:text-gray-400">{t('noPostsYet')}</p>
                {!isAuthenticated && (
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">{t('loginToSeePosts')}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post, index) => (
                  <div
                    key={post.id}
                    className="block cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <PostCard
                      post={post}
                      showFullContent={false}
                      onPostDeleted={handlePostDeleted}
                      onPostUpdated={handlePostUpdated}
                      priority={index === 0}
                    />
                  </div>
                ))}
                <div className="text-center pt-4">
                  <I18nLink
                    href="/feed"
                    className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    {t('viewAllPosts')}
                  </I18nLink>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
