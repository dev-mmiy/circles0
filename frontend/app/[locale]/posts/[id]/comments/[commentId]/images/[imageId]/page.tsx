'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { getPost, type PostDetail } from '@/lib/api/posts';
import ImageViewer, { type ImageViewerImage } from '@/components/ImageViewer';

export default function CommentImageViewerPage() {
  const params = useParams();
  const router = useRouter();
  const { getAccessTokenSilently, isAuthenticated, isLoading: authLoading } = useAuth0();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const locale = params.locale as string;
  const postId = params.id as string; // Changed from postId to id
  const commentId = params.commentId as string;
  const imageId = params.imageId as string;

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
      setError(err.message || 'Failed to load post');
    } finally {
      setIsLoading(false);
    }
  }, [postId, isAuthenticated, getAccessTokenSilently]);

  useEffect(() => {
    if (!authLoading) {
      loadPost();
    }
  }, [authLoading, loadPost]);

  // Find comment and its images
  const getCommentImages = useCallback((): ImageViewerImage[] => {
    if (!post?.comments) return [];
    const comment = post.comments.find((c) => c.id === commentId);
    if (!comment?.images) return [];
    return comment.images.map((img) => ({
      id: img.id,
      image_url: img.image_url,
      alt: `Comment image ${img.display_order}`,
    }));
  }, [post, commentId]);

  // Find initial image index
  const getInitialIndex = useCallback(() => {
    const images = getCommentImages();
    const index = images.findIndex((img) => img.id === imageId);
    return index >= 0 ? index : 0;
  }, [getCommentImages, imageId]);

  const handleClose = useCallback(() => {
    router.push(`/${locale}/posts/${postId}`);
  }, [router, postId, locale]);

  if (authLoading || isLoading) {
    return (
      <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center max-w-md mx-4">
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
            Post or comment not found
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {error || 'The post, comment, or image you are looking for does not exist.'}
          </p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/feed')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Feed
            </button>
          </div>
        </div>
      </div>
    );
  }

  const images = getCommentImages();
  const initialIndex = getInitialIndex();

  if (images.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center max-w-md mx-4">
          <p className="text-gray-500 dark:text-gray-400">
            This comment has no images.
          </p>
          <div className="mt-6">
            <button
              onClick={handleClose}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Post
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ImageViewer
      images={images}
      initialIndex={initialIndex}
      postId={postId}
      onClose={handleClose}
    />
  );
}

