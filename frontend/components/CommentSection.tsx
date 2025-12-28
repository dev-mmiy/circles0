'use client';

import { useAuth0 } from '@auth0/auth0-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link as I18nLink, useRouter } from '@/i18n/routing';
import { useUser } from '@/contexts/UserContext';
import { formatDateInTimezone, formatRelativeTime, getUserTimezone } from '@/lib/utils/timezone';
import {
  createComment,
  getCommentReplies,
  type Comment,
  type CreateCommentData,
} from '@/lib/api/posts';
import { uploadMultipleImages, validateImageFile, createImagePreview } from '@/lib/api/images';

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
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('commentSection');
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<{ url: string; file?: File }[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle comment image click - navigate to image viewer
  // Note: next-intl's useRouter automatically adds locale prefix
  const handleCommentImageClick = (commentId: string, imageId: string) => {
    router.push(`/posts/${postId}/comments/${commentId}/images/${imageId}`);
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files).slice(0, 5 - imageUrls.length);
    const validFiles: File[] = [];
    const previews: { url: string; file: File }[] = [];

    // Validate and create previews
    for (const file of newFiles) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        continue;
      }

      try {
        const previewUrl = await createImagePreview(file);
        validFiles.push(file);
        previews.push({ url: previewUrl, file });
      } catch (err) {
        console.error('Failed to create preview:', err);
        setError('Failed to create preview for one or more images');
      }
    }

    if (validFiles.length === 0) return;

    // Update previews
    setImagePreviews([...imagePreviews, ...previews]);

    // Upload images
    setUploadingImages(true);
    setError(null);

    try {
      const accessToken = await getAccessTokenSilently();
      const uploadResponse = await uploadMultipleImages(validFiles, accessToken);

      if (uploadResponse.urls && uploadResponse.urls.length > 0) {
        setImageUrls([...imageUrls, ...uploadResponse.urls]);
      }

      if (uploadResponse.errors && uploadResponse.errors.length > 0) {
        setError(uploadResponse.errors.join(', '));
      }
    } catch (err: any) {
      console.error('Failed to upload images:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to upload images');
      // Remove failed previews
      setImagePreviews(imagePreviews.slice(0, imagePreviews.length - validFiles.length));
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove image
  const handleRemoveImage = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      alert(t('errors.loginRequired'));
      return;
    }

    if (!newCommentContent.trim() && imageUrls.length === 0) {
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
        image_urls: imageUrls.length > 0 ? imageUrls : undefined,
      };

      const newComment = await createComment(postId, commentData, accessToken);

      // Add new comment to the list
      setComments([newComment, ...comments]);
      setNewCommentContent('');
      setImageUrls([]);
      setImagePreviews([]);

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
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
        {t('title', { count: comments.length })}
      </h3>

      {/* Comment form */}
      <form onSubmit={handleSubmitComment} className="mb-6">
        <textarea
          value={newCommentContent}
          onChange={(e) => setNewCommentContent(e.target.value)}
          placeholder={t('placeholder')}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          rows={3}
          maxLength={2000}
          disabled={isSubmitting || uploadingImages || !isAuthenticated}
        />

        {/* Image previews */}
        {imagePreviews.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative">
                <Image
                  src={preview.url}
                  alt={`Preview ${index + 1}`}
                  width={100}
                  height={100}
                  className="w-24 h-24 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                  disabled={isSubmitting || uploadingImages}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Image upload button */}
        <div className="mt-2 flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isSubmitting || uploadingImages || !isAuthenticated || imageUrls.length >= 5}
            multiple
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting || uploadingImages || !isAuthenticated || imageUrls.length >= 5}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadingImages ? t('uploadingImages') || 'アップロード中...' : t('addImage') || '画像を追加'}
          </button>
          {imageUrls.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({imageUrls.length}/5)
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <span
            className={`text-sm ${
              newCommentContent.length > 1800 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {newCommentContent.length} / 2000
          </span>

          <button
            type="submit"
            disabled={isSubmitting || uploadingImages || (!newCommentContent.trim() && imageUrls.length === 0) || !isAuthenticated}
            className={`px-2 py-2 rounded-lg font-medium transition-colors ${
              isSubmitting || uploadingImages || (!newCommentContent.trim() && imageUrls.length === 0) || !isAuthenticated
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? t('submitting') : t('submit')}
          </button>
        </div>

        {error && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {!isAuthenticated && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t.rich('loginPrompt', {
              login: (chunks) => (
                <I18nLink href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
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
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
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
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('commentSection');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  // Handle comment image click - navigate to image viewer
  // Note: next-intl's useRouter automatically adds locale prefix
  const handleCommentImageClick = (commentId: string, imageId: string) => {
    router.push(`/posts/${postId}/comments/${commentId}/images/${imageId}`);
  };

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
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
              <span className="text-gray-600 dark:text-gray-300 font-semibold text-xs">
                {comment.author?.nickname?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          )}
        </Link>

        {/* Comment content */}
        <div className="flex-1">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Link
                href={`/profile/${comment.user_id}`}
                className="font-semibold text-sm text-gray-900 dark:text-gray-100 hover:underline"
              >
                {comment.author?.nickname || t('unknownUser')}
              </Link>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(comment.created_at)}
              </span>
            </div>
            <p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap break-words">
              {comment.content}
            </p>
            
            {/* Comment images */}
            {comment.images && comment.images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {comment.images.map((img, index) => (
                  <div key={img.id} className="relative">
                    <Image
                      src={img.image_url}
                      alt={`Comment image ${index + 1}`}
                      width={200}
                      height={200}
                      className="max-w-xs max-h-48 object-contain rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:opacity-90"
                      onClick={() => handleCommentImageClick(comment.id, img.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4 mt-1 ml-2">
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              disabled={!isAuthenticated}
            >
              {t('reply')}
            </button>

            {comment.reply_count > 0 && !isReply && (
              <button
                onClick={handleLoadReplies}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
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
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
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
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  disabled={isSubmitting}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !replyContent.trim()}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    isSubmitting || !replyContent.trim()
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
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
