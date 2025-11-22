'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth0 } from '@auth0/auth0-react';
import Header from '@/components/Header';
import PostCard from '@/components/PostCard';
import { getFeed, type Post } from '@/lib/api/posts';
import { Link as I18nLink } from '@/i18n/routing';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function Home() {
  const t = useTranslations('homePage');
  const { getAccessTokenSilently, isAuthenticated, isLoading: authLoading } = useAuth0();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  // Load recent posts
  useEffect(() => {
    // Prevent multiple calls on re-renders
    if (hasLoadedRef.current || authLoading) return;

    const loadRecentPosts = async () => {
      hasLoadedRef.current = true;
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

        const recentPosts = await getFeed(0, 5, accessToken, 'all');
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

    loadRecentPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-center mb-8">{t('title')}</h1>
          <p className="text-center text-gray-600 mb-8">{t('subtitle')}</p>

          {/* Recent Posts Section */}
          <div className="mt-12 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">{t('recentPosts')}</h2>
              <I18nLink
                href="/feed"
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                {t('viewAllPosts')} →
              </I18nLink>
            </div>

            {isLoadingPosts ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : postsError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-red-800 text-sm">{postsError}</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
                <p className="text-gray-600">{t('noPostsYet')}</p>
                {!isAuthenticated && (
                  <p className="text-sm text-gray-500 mt-2">{t('loginToSeePosts')}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="block cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <PostCard
                      post={post}
                      showFullContent={false}
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
