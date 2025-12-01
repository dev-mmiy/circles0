'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { likePost, unlikePost, deletePost, type Post } from '@/lib/api/posts';
import { useUser } from '@/contexts/UserContext';
import { formatDateInTimezone, formatRelativeTime, getUserTimezone } from '@/lib/utils/timezone';
import toast from 'react-hot-toast';
import { debugLog } from '@/lib/utils/debug';
import ShareButton from './ShareButton';

// Dynamically import EditPostModal to reduce initial bundle size
const EditPostModal = dynamic(() => import('./EditPostModal'), {
  loading: () => null,
  ssr: false,
});

interface PostCardProps {
  post: Post;
  onLikeToggle?: () => void;
  onPostUpdated?: () => void;
  onPostDeleted?: () => void;
  showFullContent?: boolean;
}

export default function PostCard({
  post,
  onLikeToggle,
  onPostUpdated,
  onPostDeleted,
  showFullContent = false,
}: PostCardProps) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const { user } = useUser();
  const locale = useLocale();
  const t = useTranslations('post');
  const [isLiked, setIsLiked] = useState(post.is_liked_by_current_user);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [isLiking, setIsLiking] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if current user is the author
  const isAuthor = user && user.id === post.user_id;

  // Format date using user's timezone
  const formatDate = (dateString: string) => {
    // Use user's timezone if available, otherwise use browser's local timezone
    const userTimezone = user ? getUserTimezone(user.timezone, user.country) : undefined;
    const relative = formatRelativeTime(dateString, locale, user?.timezone, user?.country);

    if (relative.minutes < 1) {
      return t('time.justNow');
    } else if (relative.minutes < 60) {
      return t('time.minutesAgo', { minutes: relative.minutes });
    } else if (relative.hours < 24) {
      return t('time.hoursAgo', { hours: relative.hours });
    } else if (relative.days < 7) {
      return t('time.daysAgo', { days: relative.days });
    } else {
      // Format date in user's timezone (or browser's local timezone if user not logged in)
      return formatDateInTimezone(
        dateString,
        locale,
        user?.timezone,
        user?.country,
        {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }
      );
    }
  };

  // Visibility badge
  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            {t('visibility.public')}
          </span>
        );
      case 'followers_only':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            {t('visibility.followersOnly')}
          </span>
        );
      case 'private':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
            {t('visibility.private')}
          </span>
        );
      default:
        return null;
    }
  };

  // Handle like toggle
  const handleLikeToggle = async () => {
    if (!isAuthenticated) {
      alert(t('errors.loginRequired'));
      return;
    }

    setIsLiking(true);

    try {
      const accessToken = await getAccessTokenSilently();

      if (isLiked) {
        await unlikePost(post.id, accessToken);
        setIsLiked(false);
        setLikeCount((prev) => prev - 1);
      } else {
        await likePost(post.id, { reaction_type: 'like' }, accessToken);
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
      }

      // Notify parent component
      if (onLikeToggle) {
        onLikeToggle();
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      alert(t('errors.likeFailed'));
    } finally {
      setIsLiking(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!isAuthenticated || !isAuthor) return;

    setIsDeleting(true);
    try {
      const accessToken = await getAccessTokenSilently();
      await deletePost(post.id, accessToken);
      
      // Show success toast
      toast.success(t('deleteSuccess'));
      
      // Close modal first
      setIsDeleteConfirmOpen(false);
      
      // Wait a bit for modal to close, then refresh feed
      setTimeout(() => {
        // Notify parent to refresh feed
        if (onPostDeleted) {
          onPostDeleted();
        }
      }, 300); // Small delay to allow modal close animation
    } catch (error: any) {
      debugLog.error('Failed to delete post:', error);
      toast.error(error?.message || t('errors.deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle edit modal close
  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
  };

  // Handle post updated
  const handlePostUpdated = () => {
    if (onPostUpdated) {
      onPostUpdated();
    }
    setIsEditModalOpen(false);
  };

  // Truncate content if needed
  const displayContent = showFullContent
    ? post.content
    : post.content.length > 300
    ? post.content.slice(0, 300) + '...'
    : post.content;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow">
      {/* Header: Author info and timestamp */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <Link href={`/profile/${post.user_id}`}>
            {post.author?.avatar_url ? (
              <Image
                key={post.author.avatar_url}
                src={post.author.avatar_url}
                alt={post.author.nickname}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                <span className="text-gray-600 dark:text-gray-300 font-semibold text-sm">
                  {post.author?.nickname?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
          </Link>

          {/* Author name and timestamp */}
          <div>
            <Link
              href={`/profile/${post.user_id}`}
              className="font-semibold text-gray-900 dark:text-gray-100 hover:underline"
            >
              {post.author?.nickname || t('unknownUser')}
            </Link>
            {post.author?.username && (
              <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">
                @{post.author.username}
              </span>
            )}
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{formatDate(post.created_at)}</span>
              {getVisibilityBadge(post.visibility)}
            </div>
          </div>
        </div>

        {/* Edit/Delete buttons (only for author, and only if post is active) */}
        {isAuthor && isAuthenticated && post.is_active && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              title={t('edit')}
              aria-label={t('edit')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title={t('delete')}
              aria-label={t('delete')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Post content or deleted message */}
      {!post.is_active ? (
        <div className="mb-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 text-center border border-gray-200 dark:border-gray-600">
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {t('deleted')}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {t('deletedByAuthor')}
          </p>
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
            {displayContent}
          </p>
          {!showFullContent && post.content.length > 300 && (
            <Link
              href={`/posts/${post.id}`}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm mt-2 inline-block"
            >
              {t('readMore')}
            </Link>
          )}
        </div>
      )}

      {/* Hashtags (only show if post is active) */}
      {post.is_active && post.hashtags && post.hashtags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {post.hashtags.map((hashtag) => (
            <Link
              key={hashtag.id}
              href={`/search?q=${encodeURIComponent(hashtag.name)}&type=hashtags`}
              className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              #{hashtag.name}
            </Link>
          ))}
        </div>
      )}

      {/* Mentions (only show if post is active) */}
      {post.is_active && post.mentions && post.mentions.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium mr-1">
            {t('mentions')}:
          </span>
          {post.mentions.map((mention) => (
            <Link
              key={mention.id}
              href={`/profile/${mention.id}`}
              className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
            >
              @{mention.nickname}
            </Link>
          ))}
        </div>
      )}

      {/* Images (only show if post is active) */}
      {post.is_active && post.images && post.images.length > 0 && (
        <div className="mb-4">
          <div className={`grid gap-2 ${
            post.images.length === 1
              ? 'grid-cols-1'
              : post.images.length === 2
              ? 'grid-cols-2'
              : 'grid-cols-2'
          }`}>
            {post.images.map((image, index) => (
              <div
                key={image.id}
                className={`relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 ${
                  post.images!.length === 1
                    ? 'w-full aspect-video'
                    : 'aspect-square'
                }`}
              >
                {post.images!.length === 1 ? (
                  <Image
                    src={image.image_url}
                    alt={`Post image ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                    className="object-contain cursor-pointer hover:opacity-90 transition-opacity"
                    loading="lazy"
                    onClick={() => {
                      window.open(image.image_url, '_blank');
                    }}
                    onError={(e: any) => {
                      console.error('Failed to load image:', image.image_url);
                      // Show fallback
                      const target = e.target as HTMLImageElement;
                      if (target) {
                        target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E画像を読み込めませんでした%3C/text%3E%3C/svg%3E';
                      }
                    }}
                  />
                ) : (
                  <Image
                    src={image.image_url}
                    alt={`Post image ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 40vw, 600px"
                    className="object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    loading="lazy"
                    onClick={() => {
                      window.open(image.image_url, '_blank');
                    }}
                    onError={(e: any) => {
                      console.error('Failed to load image:', image.image_url);
                      // Show fallback
                      const target = e.target as HTMLImageElement;
                      if (target) {
                        target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E画像を読み込めませんでした%3C/text%3E%3C/svg%3E';
                      }
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions: Like and Comment (only show if post is active) */}
      {post.is_active && (
        <div className="flex items-center space-x-6 pt-3 border-t border-gray-200 dark:border-gray-700">
        {/* Like button */}
        <button
          onClick={handleLikeToggle}
          disabled={isLiking}
          className={`flex items-center space-x-2 transition-colors ${
            isLiked
              ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300'
              : 'text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
          } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <svg
            className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`}
            fill={isLiked ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span className="font-medium">{likeCount}</span>
        </button>

        {/* Comment button/link */}
        <Link
          href={`/posts/${post.id}`}
          className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
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
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="font-medium">{post.comment_count}</span>
        </Link>

        {/* Share button */}
        <ShareButton
          postId={post.id}
          postContent={post.content}
          authorName={post.author?.nickname}
        />
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <EditPostModal
          post={post}
          isOpen={isEditModalOpen}
          onClose={handleEditModalClose}
          onPostUpdated={handlePostUpdated}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => !isDeleting && setIsDeleteConfirmOpen(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                {/* Warning Icon and Title */}
                <div className="flex items-start mb-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-red-600 dark:text-red-400"
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
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {t('deleteConfirm')}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('deleteConfirmMessage')}
                    </p>
                  </div>
                </div>

                {/* Post Preview */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-600">
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 break-words">
                    {post.content.length > 150
                      ? post.content.slice(0, 150) + '...'
                      : post.content}
                  </p>
                </div>

                {/* Impact Message */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  {t('deleteImpact')}
                </p>

                {/* Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    disabled={isDeleting}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isDeleting && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {isDeleting ? t('deleting') : t('delete')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
