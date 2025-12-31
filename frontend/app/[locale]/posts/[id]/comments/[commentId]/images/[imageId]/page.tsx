'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { getPost, type PostDetail } from '@/lib/api/posts';
import ImageViewer from '@/components/ImageViewer';
import ImageViewerPageWrapper from '@/components/ImageViewerPageWrapper';
import { convertPostImagesToViewerImages, findImageIndexById } from '@/lib/utils/imageViewerUtils';

export default function CommentImageViewerPage() {
  const params = useParams();
  const router = useRouter();
  const { getAccessTokenSilently, isAuthenticated, isLoading: authLoading } = useAuth0();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const locale = params.locale as string;
  const postId = params.id as string;
  const commentId = params.commentId as string;
  const imageId = params.imageId as string;

  // Load post
  const loadPost = useCallback(async () => {
    try {
      const accessToken = isAuthenticated ? await getAccessTokenSilently() : undefined;

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

  const handleClose = useCallback(() => {
    router.push(`/${locale}/posts/${postId}`);
  }, [router, postId, locale]);

  // Find comment and its images
  const comment = post?.comments?.find(c => c.id === commentId);
  const images = comment?.images ? convertPostImagesToViewerImages(comment.images) : [];
  const initialIndex = images.length > 0 ? findImageIndexById(images, imageId) : 0;

  return (
    <ImageViewerPageWrapper
      isLoading={authLoading || isLoading}
      error={error || (!post ? 'Post not found' : !comment ? 'Comment not found' : null)}
      hasImages={!!comment?.images && comment.images.length > 0}
      imagesCount={images.length}
      onClose={handleClose}
      errorTitle="Post or comment not found"
      errorMessage={error || 'The post, comment, or image you are looking for does not exist.'}
      emptyMessage="This comment has no images."
      backButtonText="Back to Post"
      backButtonAction={handleClose}
    >
      <ImageViewer
        images={images}
        initialIndex={initialIndex}
        postId={postId}
        onClose={handleClose}
      />
    </ImageViewerPageWrapper>
  );
}
