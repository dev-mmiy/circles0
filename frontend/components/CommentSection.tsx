'use client';

import { useAuth0 } from '@auth0/auth0-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link as I18nLink } from '@/i18n/routing';
import { useUser } from '@/contexts/UserContext';
import { formatDateInTimezone, formatRelativeTime, getUserTimezone } from '@/lib/utils/timezone';
import {
  createComment,
  getCommentReplies,
  type Comment,
  type CreateCommentData,
} from '@/lib/api/posts';

interface CommentSectionProps {
  postId: string;
  initialComments: Comment[];
  onCommentAdded?: () => void;
}

export default function CommentSection({
  postId,
  initialComments,
  onCommentAdded,
}: CommentSectionProps) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const t = useTranslations('commentSection');
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      alert(t('errors.loginRequired'));
      return;
    }

    if (!newCommentContent.trim()) {
      setError(t('errors.contentRequired'));
      return;
    }

    if (newCommentContent.length > 2000) {
      setError(t('errors.contentTooLong'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const accessToken = await getAccessTokenSilently();

      const commentData: CreateCommentData = {
        content: newCommentContent.trim(),
      };

      const newComment = await createComment(postId, commentData, accessToken);

      // Add new comment to the list
      setComments([newComment, ...comments]);
      setNewCommentContent('');

      // Notify parent
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (err: any) {
      console.error('Failed to create comment:', err);
      setError(err.message || t('errors.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">
        {t('title', { count: comments.length })}
      </h3>

      {/* Comment form */}
      <form onSubmit={handleSubmitComment} className="mb-6">
        <textarea
          value={newCommentContent}
          onChange={(e) => setNewCommentContent(e.target.value)}
          placeholder={t('placeholder')}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
          maxLength={2000}
          disabled={isSubmitting || !isAuthenticated}
        />

        <div className="flex items-center justify-between mt-2">
          <span
            className={`text-sm ${
              newCommentContent.length > 1800 ? 'text-red-500' : 'text-gray-500'
            }`}
          >
            {newCommentContent.length} / 2000
          </span>

          <button
            type="submit"
            disabled={isSubmitting || !newCommentContent.trim() || !isAuthenticated}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isSubmitting || !newCommentContent.trim() || !isAuthenticated
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? t('submitting') : t('submit')}
          </button>
        </div>

        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!isAuthenticated && (
          <p className="mt-2 text-sm text-gray-500">
            {t.rich('loginPrompt', {
              login: (chunks) => (
                <I18nLink href="/login" className="text-blue-600 hover:underline">
                  {chunks}
                </I18nLink>
              ),
            })}
          </p>
        )}
      </form>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {t('noComments')}
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              onReplyAdded={() => {
                if (onCommentAdded) {
                  onCommentAdded();
                }
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Individual comment item component
interface CommentItemProps {
  comment: Comment;
  postId: string;
  onReplyAdded?: () => void;
  isReply?: boolean;
}

function CommentItem({
  comment,
  postId,
  onReplyAdded,
  isReply = false,
}: CommentItemProps) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const { user } = useUser();
  const locale = useLocale();
  const t = useTranslations('commentSection');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  // Format date using user's timezone
  const formatDate = (dateString: string) => {
    const userTimezone = user ? getUserTimezone(user.timezone, user.country) : 'UTC';
    const relative = formatRelativeTime(dateString, locale, user?.timezone, user?.country);

    if (relative.minutes < 1) {
      return t('time.justNow');
    } else if (relative.minutes < 60) {
      return t('time.minutesAgo', { minutes: relative.minutes });
    } else if (relative.hours < 24) {
      return t('time.hoursAgo', { hours: relative.hours });
    } else {
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

  // Load replies
  const handleLoadReplies = async () => {
    if (showReplies) {
      setShowReplies(false);
      return;
    }

    setLoadingReplies(true);
    try {
      const fetchedReplies = await getCommentReplies(comment.id);
      setReplies(fetchedReplies);
      setShowReplies(true);
    } catch (error) {
      console.error('Failed to load replies:', error);
      alert(t('errors.loadRepliesFailed'));
    } finally {
      setLoadingReplies(false);
    }
  };

  // Submit reply
  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      alert(t('errors.replyLoginRequired'));
      return;
    }

    if (!replyContent.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const accessToken = await getAccessTokenSilently();

      const replyData: CreateCommentData = {
        content: replyContent.trim(),
        parent_comment_id: comment.id,
      };

      const newReply = await createComment(postId, replyData, accessToken);

      // Add reply to the list
      setReplies([...replies, newReply]);
      setReplyContent('');
      setShowReplyForm(false);
      setShowReplies(true);

      // Notify parent
      if (onReplyAdded) {
        onReplyAdded();
      }
    } catch (error) {
      console.error('Failed to create reply:', error);
      alert(t('errors.replyFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${isReply ? 'ml-8' : ''}`}>
      <div className="flex space-x-3">
        {/* Avatar */}
        <Link href={`/profile/${comment.user_id}`}>
          {comment.author?.avatar_url ? (
            <Image
              src={comment.author.avatar_url}
              alt={comment.author.nickname}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
              <span className="text-gray-600 font-semibold text-xs">
                {comment.author?.nickname?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          )}
        </Link>

        {/* Comment content */}
        <div className="flex-1">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Link
                href={`/profile/${comment.user_id}`}
                className="font-semibold text-sm text-gray-900 hover:underline"
              >
                {comment.author?.nickname || t('unknownUser')}
              </Link>
              <span className="text-xs text-gray-500">
                {formatDate(comment.created_at)}
              </span>
            </div>
            <p className="text-gray-800 text-sm whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4 mt-1 ml-2">
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-sm text-gray-500 hover:text-blue-600"
              disabled={!isAuthenticated}
            >
              {t('reply')}
            </button>

            {comment.reply_count > 0 && !isReply && (
              <button
                onClick={handleLoadReplies}
                className="text-sm text-blue-600 hover:underline"
                disabled={loadingReplies}
              >
                {loadingReplies
                  ? t('loadingReplies')
                  : showReplies
                  ? t('hideReplies')
                  : t('showReplies', { count: comment.reply_count })}
              </button>
            )}
          </div>

          {/* Reply form */}
          {showReplyForm && (
            <form onSubmit={handleSubmitReply} className="mt-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={t('replyPlaceholder')}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                rows={2}
                maxLength={2000}
                disabled={isSubmitting}
              />
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyContent('');
                  }}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  disabled={isSubmitting}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !replyContent.trim()}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    isSubmitting || !replyContent.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isSubmitting ? t('replySubmitting') : t('replySubmit')}
                </button>
              </div>
            </form>
          )}

          {/* Replies */}
          {showReplies && replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  onReplyAdded={onReplyAdded}
                  isReply={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
