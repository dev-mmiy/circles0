'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { likePost, unlikePost, type Post } from '@/lib/api/posts';

interface PostCardProps {
  post: Post;
  onLikeToggle?: () => void;
  showFullContent?: boolean;
}

export default function PostCard({
  post,
  onLikeToggle,
  showFullContent = false,
}: PostCardProps) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const t = useTranslations('post');
  const [isLiked, setIsLiked] = useState(post.is_liked_by_current_user);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [isLiking, setIsLiking] = useState(false);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60)
      );
      return diffInMinutes < 1 ? t('time.justNow') : t('time.minutesAgo', { minutes: diffInMinutes });
    } else if (diffInHours < 24) {
      return t('time.hoursAgo', { hours: diffInHours });
    } else if (diffInHours < 168) {
      // 7 days
      const diffInDays = Math.floor(diffInHours / 24);
      return t('time.daysAgo', { days: diffInDays });
    } else {
      return date.toLocaleDateString(t('time.locale'), {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // Visibility badge
  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            {t('visibility.public')}
          </span>
        );
      case 'followers_only':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            {t('visibility.followersOnly')}
          </span>
        );
      case 'private':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
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

  // Truncate content if needed
  const displayContent = showFullContent
    ? post.content
    : post.content.length > 300
    ? post.content.slice(0, 300) + '...'
    : post.content;

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
      {/* Header: Author info and timestamp */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <Link href={`/profile/${post.user_id}`}>
            {post.author?.avatar_url ? (
              <img
                src={post.author.avatar_url}
                alt={post.author.nickname}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600 font-semibold text-sm">
                  {post.author?.nickname?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
          </Link>

          {/* Author name and timestamp */}
          <div>
            <Link
              href={`/profile/${post.user_id}`}
              className="font-semibold text-gray-900 hover:underline"
            >
              {post.author?.nickname || t('unknownUser')}
            </Link>
            {post.author?.username && (
              <span className="text-gray-500 text-sm ml-1">
                @{post.author.username}
              </span>
            )}
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{formatDate(post.created_at)}</span>
              {getVisibilityBadge(post.visibility)}
            </div>
          </div>
        </div>
      </div>

      {/* Post content */}
      <div className="mb-4">
        <p className="text-gray-800 whitespace-pre-wrap break-words">
          {displayContent}
        </p>
        {!showFullContent && post.content.length > 300 && (
          <Link
            href={`/posts/${post.id}`}
            className="text-blue-600 hover:underline text-sm mt-2 inline-block"
          >
            {t('readMore')}
          </Link>
        )}
      </div>

      {/* Actions: Like and Comment */}
      <div className="flex items-center space-x-6 pt-3 border-t border-gray-200">
        {/* Like button */}
        <button
          onClick={handleLikeToggle}
          disabled={isLiking}
          className={`flex items-center space-x-2 transition-colors ${
            isLiked
              ? 'text-red-600 hover:text-red-700'
              : 'text-gray-500 hover:text-red-600'
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
          className="flex items-center space-x-2 text-gray-500 hover:text-blue-600 transition-colors"
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
      </div>
    </div>
  );
}
