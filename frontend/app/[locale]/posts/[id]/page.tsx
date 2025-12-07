'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useRouter } from '@/i18n/routing';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import PostCard from '@/components/PostCard';
import { getPost, type PostDetail } from '@/lib/api/posts';

// Dynamically import CommentSection to reduce initial bundle size
const CommentSection = dynamic(() => import('@/components/CommentSection'), {
  loading: () => (
    <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    </div>
  ),
  ssr: false,
});

export default function PostDetailPage() {
  const t = useTranslations('postDetailPage');
  const params = useParams();
  const router = useRouter();
  const { getAccessTokenSilently, isAuthenticated, isLoading: authLoading } = useAuth0();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const postId = params.id as string;

  // Load post
  const loadPost = useCallback(async () => {
    try {
      const accessToken = isAuthenticated
        ? await getAccessTokenSilently()
        : undefined;

      const fetchedPost = await getPost(postId, accessToken);
      setPost(fetchedPost);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load post:', err);
      setError(err.message || t('loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [postId, isAuthenticated, getAccessTokenSilently, t]);

  useEffect(() => {
    if (!authLoading) {
      loadPost();
    }
  }, [authLoading, loadPost]);

  // Refresh post after comment is added
  const handleCommentAdded = () => {
    loadPost();
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-12">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {t('back')}
          </button>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-red-400 dark:text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
              {t('postNotFound')}
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              {error || t('postNotFoundMessage')}
            </p>
            <div className="mt-6">
              <Link
                href="/feed"
                className="inline-flex items-center px-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('backToFeed')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {t('back')}
        </button>

        {/* Post */}
        <div className="mb-6">
          <PostCard post={post} showFullContent={true} onLikeToggle={loadPost} />
        </div>

        {/* Comments section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <CommentSection
            postId={post.id}
            initialComments={post.comments || []}
            onCommentAdded={handleCommentAdded}
          />
        </div>
      </div>
    </div>
  );
}
