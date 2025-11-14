'use client';

import { useAuth0 } from '@auth0/auth0-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CommentSection from '@/components/CommentSection';
import PostCard from '@/components/PostCard';
import { getPost, type PostDetail } from '@/lib/api/posts';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getAccessTokenSilently, isAuthenticated, isLoading: authLoading } = useAuth0();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const postId = params.id as string;

  // Load post
  const loadPost = async () => {
    try {
      const accessToken = isAuthenticated
        ? await getAccessTokenSilently()
        : undefined;

      const fetchedPost = await getPost(postId, accessToken);
      setPost(fetchedPost);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load post:', err);
      setError(err.message || '投稿の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadPost();
    }
  }, [postId, authLoading, isAuthenticated]);

  // Refresh post after comment is added
  const handleCommentAdded = () => {
    loadPost();
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center text-gray-600 hover:text-gray-900"
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
            戻る
          </button>

          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-red-400"
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
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              投稿が見つかりません
            </h3>
            <p className="mt-2 text-gray-500">
              {error || '投稿が削除されたか、アクセス権限がありません'}
            </p>
            <div className="mt-6">
              <Link
                href="/feed"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                フィードに戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center text-gray-600 hover:text-gray-900"
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
          戻る
        </button>

        {/* Post */}
        <div className="mb-6">
          <PostCard post={post} showFullContent={true} onLikeToggle={loadPost} />
        </div>

        {/* Comments section */}
        <div className="bg-white rounded-lg shadow p-6">
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
