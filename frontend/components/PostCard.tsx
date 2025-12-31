'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  likePost,
  unlikePost,
  deletePost,
  savePost,
  unsavePost,
  type Post,
  type PostLike,
  type ReactionType,
} from '@/lib/api/posts';
import { useUser } from '@/contexts/UserContext';
import { formatDateInTimezone, formatRelativeTime, getUserTimezone } from '@/lib/utils/timezone';
import toast from 'react-hot-toast';
import { debugLog } from '@/lib/utils/debug';
import ShareButton from './ShareButton';
import MessageReactions, { type ReactionType as MessageReactionType } from './MessageReactions';
import { POST_CONFIG } from '@/lib/config';

// Dynamically import EditPostModal to reduce initial bundle size
const EditPostModal = dynamic(() => import('./EditPostModal'), {
  loading: () => null,
  ssr: false,
});

// Dynamically import PostFormModal for vital record editing
const PostFormModal = dynamic(() => import('./PostFormModal'), {
  loading: () => null,
  ssr: false,
});

interface PostCardProps {
  post: Post;
  onLikeToggle?: () => void;
  onPostUpdated?: () => void;
  onPostDeleted?: () => void;
  showFullContent?: boolean;
  priority?: boolean;
}

export default function PostCard({
  post,
  onLikeToggle,
  onPostUpdated,
  onPostDeleted,
  showFullContent = false,
  priority = false,
}: PostCardProps) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const { user } = useUser();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('post');
  const tSaved = useTranslations('savedPosts');
  const tHealthRecord = useTranslations('postForm.healthRecord');
  const [reactions, setReactions] = useState<PostLike[]>(post.likes || []);

  // Update reactions when post.likes changes (e.g., when post is refreshed)
  useEffect(() => {
    if (post.likes) {
      setReactions(post.likes);
    }
  }, [post.likes]);
  const [isLiking, setIsLiking] = useState(false);
  const [isSaved, setIsSaved] = useState(post.is_saved_by_current_user ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVitalEditModalOpen, setIsVitalEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Initialize expanded state based on showFullContent prop
  const [isExpanded, setIsExpanded] = useState(showFullContent);
  const [shouldShowExpandButton, setShouldShowExpandButton] = useState(false);
  const contentRef = useRef<HTMLParagraphElement>(null);

  // Check if current user is the author
  const isAuthor = user && user.id === post.user_id;

  // Handle image click - navigate to image viewer
  // Note: next-intl's useRouter automatically adds locale prefix
  const handleImageClick = (imageId: string) => {
    router.push(`/posts/${post.id}/images/${imageId}`);
  };

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
      return formatDateInTimezone(dateString, locale, user?.timezone, user?.country, {
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

  // Handle reaction click
  const handleReactionClick = async (reactionType: MessageReactionType) => {
    if (!isAuthenticated) {
      alert(t('errors.loginRequired'));
      return;
    }

    setIsLiking(true);

    try {
      const accessToken = await getAccessTokenSilently();
      const currentUserReaction = reactions.find(r => r.user_id === user?.id);
      const isSameReactionType = currentUserReaction?.reaction_type === reactionType;

      const updatedReaction = await likePost(
        post.id,
        { reaction_type: reactionType as ReactionType },
        accessToken
      );

      // Update reactions state
      if (updatedReaction === null) {
        // Reaction was toggled off (same reaction type sent)
        setReactions(prev => prev.filter(r => r.user_id !== user?.id));
      } else {
        // Add or update reaction
        const existingIndex = reactions.findIndex(r => r.user_id === user?.id);
        if (existingIndex >= 0) {
          // Update existing reaction
          setReactions(prev => {
            const updated = [...prev];
            updated[existingIndex] = updatedReaction;
            return updated;
          });
        } else {
          // Add new reaction
          setReactions(prev => [...prev, updatedReaction]);
        }
      }

      // Notify parent component
      if (onLikeToggle) {
        onLikeToggle();
      }
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
      alert(t('errors.likeFailed'));
    } finally {
      setIsLiking(false);
    }
  };

  // Handle save toggle
  const handleSaveToggle = async () => {
    if (!isAuthenticated || !user) {
      toast.error(tSaved('authenticationRequired'));
      return;
    }

    setIsSaving(true);
    try {
      const token = await getAccessTokenSilently();

      if (isSaved) {
        await unsavePost(post.id, token);
        setIsSaved(false);
        toast.success(tSaved('unsaved'));
      } else {
        await savePost(post.id, token);
        setIsSaved(true);
        toast.success(tSaved('saved'));
      }
    } catch (error: any) {
      // Extract error message from response
      let errorMessage = tSaved('saveFailed');
      if (error?.response?.data?.detail) {
        // Use backend error message if available
        errorMessage = error.response.data.detail;
      } else if (error?.message) {
        // Fallback to error message
        errorMessage = error.message;
      }

      // Log error (503 Service Unavailable is expected when feature is not available)
      const isServiceUnavailable = error?.response?.status === 503;
      const isFeatureNotAvailable =
        isServiceUnavailable &&
        (errorMessage?.includes('not available') || errorMessage?.includes('migrations'));

      if (isFeatureNotAvailable) {
        // Log as warning for expected service unavailable errors
        debugLog.warn('Save feature not available:', errorMessage);
      } else {
        // Log other errors normally
        debugLog.error('Failed to toggle save:', error);
      }

      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
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

  // Handle vital edit modal close
  const handleVitalEditModalClose = () => {
    setIsVitalEditModalOpen(false);
  };

  // Handle post updated
  const handlePostUpdated = () => {
    if (onPostUpdated) {
      onPostUpdated();
    }
    setIsEditModalOpen(false);
    setIsVitalEditModalOpen(false);
  };

  // Handle edit button click - use vital form for vital records
  const handleEditClick = () => {
    if (post.post_type === 'health_record' && post.health_record_type === 'vital') {
      setIsVitalEditModalOpen(true);
    } else {
      setIsEditModalOpen(true);
    }
  };

  // Check if content exceeds configured max lines
  // Skip this check if showFullContent is true (always show full content)
  useEffect(() => {
    // If showFullContent is true, don't show expand button
    if (showFullContent) {
      setShouldShowExpandButton(false);
      setIsExpanded(true);
      return;
    }

    if (contentRef.current && post.is_active) {
      // Create a temporary element to measure content height without affecting layout
      const tempElement = document.createElement('div');
      tempElement.style.position = 'absolute';
      tempElement.style.visibility = 'hidden';
      tempElement.style.width = contentRef.current.offsetWidth + 'px';
      tempElement.style.fontSize = getComputedStyle(contentRef.current).fontSize;
      tempElement.style.fontFamily = getComputedStyle(contentRef.current).fontFamily;
      tempElement.style.lineHeight = getComputedStyle(contentRef.current).lineHeight;
      tempElement.style.whiteSpace = 'pre-wrap';
      tempElement.style.wordBreak = 'break-word';
      tempElement.style.padding = getComputedStyle(contentRef.current).padding;
      tempElement.textContent = post.content;
      document.body.appendChild(tempElement);

      const lineHeight = parseFloat(getComputedStyle(tempElement).lineHeight) || 24;
      const maxHeight = lineHeight * POST_CONFIG.MAX_LINES_TO_SHOW;
      const actualHeight = tempElement.scrollHeight;

      setShouldShowExpandButton(actualHeight > maxHeight);

      document.body.removeChild(tempElement);
    } else {
      setShouldShowExpandButton(false);
    }
  }, [post.content, post.is_active, showFullContent]);

  // Get localized disease name
  const getDiseaseName = (): string | null => {
    if (!post.user_disease) return null;
    if (
      post.user_disease.disease_translations &&
      post.user_disease.disease_translations.length > 0
    ) {
      const translation = post.user_disease.disease_translations.find(
        t => t.language_code === locale
      );
      if (translation) {
        return translation.translated_name;
      }
      const jaTranslation = post.user_disease.disease_translations.find(
        t => t.language_code === 'ja'
      );
      if (jaTranslation) {
        return jaTranslation.translated_name;
      }
    }
    return post.user_disease.disease_name;
  };

  const diseaseName = getDiseaseName();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow">
      {/* Header: Author info and timestamp */}
      <div className="flex items-start justify-between mb-2">
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
                style={{ width: 'auto', height: 'auto' }}
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
              {post.post_type === 'health_record' && post.health_record_type && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {t(`healthRecord.${post.health_record_type}`)}
                </span>
              )}
              {post.visibility === 'private' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium">
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  {t('visibility.private')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Edit/Delete buttons (only for author, and only if post is active) */}
        {isAuthor && isAuthenticated && post.is_active && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleEditClick}
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
        <div className="mb-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-600">
          <p className="text-gray-500 dark:text-gray-400 font-medium">{t('deleted')}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('deletedByAuthor')}</p>
        </div>
      ) : (
        <div className="mb-2">
          {/* Health record data display */}
          {post.post_type === 'health_record' && post.health_record_data && (
            <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              {post.health_record_type === 'diary' && (
                <div className="space-y-2">
                  {post.health_record_data.mood && (
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300 mr-2">
                        {tHealthRecord('diaryForm.mood')}:
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {post.health_record_data.mood === 'good' && '😊'}
                        {post.health_record_data.mood === 'neutral' && '😐'}
                        {post.health_record_data.mood === 'bad' && '😢'}
                        {tHealthRecord(
                          `diaryForm.mood${
                            post.health_record_data.mood.charAt(0).toUpperCase() +
                            post.health_record_data.mood.slice(1)
                          }`
                        )}
                      </span>
                    </div>
                  )}
                  {post.health_record_data.tags &&
                    Array.isArray(post.health_record_data.tags) &&
                    post.health_record_data.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {post.health_record_data.tags.map((tag: string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                </div>
              )}
              {post.health_record_type === 'symptom' && (
                <div className="space-y-2">
                  {post.health_record_data.symptomName && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {tHealthRecord('symptomForm.symptomName')}:
                      </span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {post.health_record_data.symptomName}
                      </span>
                    </div>
                  )}
                  {post.health_record_data.severity && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {tHealthRecord('symptomForm.severity')}:
                      </span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {tHealthRecord('symptomForm.severityLabel', {
                          value: post.health_record_data.severity,
                        })}
                      </span>
                    </div>
                  )}
                  {post.health_record_data.duration && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {tHealthRecord('symptomForm.duration')}:
                      </span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {post.health_record_data.duration}
                      </span>
                    </div>
                  )}
                  {post.health_record_data.location && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {tHealthRecord('symptomForm.location')}:
                      </span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {post.health_record_data.location}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {post.health_record_type === 'vital' && (
                <div className="space-y-2">
                  {post.health_record_data.recorded_at && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {tHealthRecord('vitalForm.recordedAt')}:
                      </span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {new Date(post.health_record_data.recorded_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {post.health_record_data.measurements?.blood_pressure && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {tHealthRecord('vitalForm.bloodPressure')}:
                      </span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {post.health_record_data.measurements.blood_pressure.systolic} /{' '}
                        {post.health_record_data.measurements.blood_pressure.diastolic}{' '}
                        {post.health_record_data.measurements.blood_pressure.unit || 'mmHg'}
                      </span>
                    </div>
                  )}
                  {post.health_record_data.measurements?.temperature && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {tHealthRecord('vitalForm.temperature')}:
                      </span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {post.health_record_data.measurements.temperature.value}{' '}
                        {post.health_record_data.measurements.temperature.unit === 'celsius'
                          ? '°C'
                          : '°F'}
                      </span>
                    </div>
                  )}
                  {post.health_record_data.measurements?.weight && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {tHealthRecord('vitalForm.weight')}:
                      </span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {post.health_record_data.measurements.weight.value}{' '}
                        {post.health_record_data.measurements.weight.unit || 'kg'}
                      </span>
                    </div>
                  )}
                  {post.health_record_data.measurements?.heart_rate && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {tHealthRecord('vitalForm.heartRate')}:
                      </span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {post.health_record_data.measurements.heart_rate.value}{' '}
                        {post.health_record_data.measurements.heart_rate.unit || 'bpm'}
                      </span>
                    </div>
                  )}
                  {post.health_record_data.measurements?.body_fat_percentage && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {tHealthRecord('vitalForm.bodyFatPercentage')}:
                      </span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {post.health_record_data.measurements.body_fat_percentage.value}{' '}
                        {post.health_record_data.measurements.body_fat_percentage.unit === 'percent'
                          ? '%'
                          : post.health_record_data.measurements.body_fat_percentage.unit || '%'}
                      </span>
                    </div>
                  )}
                  {post.health_record_data.measurements?.blood_glucose && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {tHealthRecord('vitalForm.bloodGlucose')}
                        {post.health_record_data.measurements.blood_glucose.timing && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                            (
                            {post.health_record_data.measurements.blood_glucose.timing === 'fasting'
                              ? tHealthRecord('vitalForm.bloodGlucoseFasting')
                              : tHealthRecord('vitalForm.bloodGlucosePostprandial')}
                            )
                          </span>
                        )}
                        :
                      </span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {post.health_record_data.measurements.blood_glucose.value}{' '}
                        {post.health_record_data.measurements.blood_glucose.unit || 'mg/dL'}
                      </span>
                    </div>
                  )}
                  {post.health_record_data.measurements?.spo2 && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {tHealthRecord('vitalForm.spo2')}:
                      </span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {post.health_record_data.measurements.spo2.value}{' '}
                        {post.health_record_data.measurements.spo2.unit === 'percent'
                          ? '%'
                          : post.health_record_data.measurements.spo2.unit || '%'}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {post.health_record_type === 'meal' && (
                <div className="space-y-2">
                  {post.health_record_data.meal_type && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {tHealthRecord('mealForm.mealType')}:
                      </span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {tHealthRecord(`mealForm.${post.health_record_data.meal_type}`)}
                      </span>
                    </div>
                  )}
                  {post.health_record_data.recorded_at && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {tHealthRecord('mealForm.recordedAt')}:
                      </span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {new Date(post.health_record_data.recorded_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {post.health_record_data.foods &&
                    Array.isArray(post.health_record_data.foods) &&
                    post.health_record_data.foods.length > 0 && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {tHealthRecord('mealForm.foods')}:
                        </span>
                        <div className="mt-1 space-y-1">
                          {post.health_record_data.foods.map((food: any, index: number) => (
                            <div key={index} className="text-gray-600 dark:text-gray-400">
                              • {food.name} {food.amount && `(${food.amount}${food.unit || 'g'})`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  {post.health_record_data.nutrition && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {tHealthRecord('mealForm.nutrition')}:
                      </span>
                      <div className="mt-1 grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400">
                        {post.health_record_data.nutrition.calories && (
                          <div>
                            {tHealthRecord('mealForm.calories')}:{' '}
                            {post.health_record_data.nutrition.calories} kcal
                          </div>
                        )}
                        {post.health_record_data.nutrition.protein && (
                          <div>
                            {tHealthRecord('mealForm.protein')}:{' '}
                            {post.health_record_data.nutrition.protein} g
                          </div>
                        )}
                        {post.health_record_data.nutrition.carbs && (
                          <div>
                            {tHealthRecord('mealForm.carbs')}:{' '}
                            {post.health_record_data.nutrition.carbs} g
                          </div>
                        )}
                        {post.health_record_data.nutrition.fat && (
                          <div>
                            {tHealthRecord('mealForm.fat')}: {post.health_record_data.nutrition.fat}{' '}
                            g
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <p
            ref={contentRef}
            className={`text-gray-800 dark:text-gray-200 break-words ${
              !isExpanded && shouldShowExpandButton ? '' : 'whitespace-pre-wrap'
            }`}
            style={
              !isExpanded && shouldShowExpandButton
                ? {
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: POST_CONFIG.MAX_LINES_TO_SHOW,
                    overflow: 'hidden',
                    whiteSpace: 'pre-line',
                  }
                : undefined
            }
          >
            {post.content}
          </p>
          {shouldShowExpandButton && (
            <div className="mt-1.5">
              {!isExpanded ? (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                >
                  {t('readMore')}
                </button>
              ) : (
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                >
                  {t('showLess')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hashtags (only show if post is active) */}
      {post.is_active && post.hashtags && post.hashtags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {post.hashtags.map(hashtag => (
            <Link
              key={hashtag.id}
              href={`/search?q=${encodeURIComponent(hashtag.name)}&type=hashtags`}
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              #{hashtag.name}
            </Link>
          ))}
        </div>
      )}

      {/* Mentions (only show if post is active) */}
      {post.is_active && post.mentions && post.mentions.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium mr-1">
            {t('mentions')}:
          </span>
          {post.mentions.map(mention => (
            <Link
              key={mention.id}
              href={`/profile/${mention.id}`}
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
            >
              @{mention.nickname}
            </Link>
          ))}
        </div>
      )}

      {/* Images (only show if post is active) */}
      {post.is_active && post.images && post.images.length > 0 && (
        <div className="mb-2">
          <div
            className={`grid gap-2 ${
              post.images.length === 1
                ? 'grid-cols-1'
                : post.images.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-2'
            }`}
          >
            {post.images.map((image, index) => (
              <div
                key={image.id}
                className={`relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 ${
                  post.images!.length === 1 ? 'w-full aspect-video' : 'aspect-square'
                }`}
              >
                {post.images!.length === 1 ? (
                  <Image
                    src={image.image_url}
                    alt={`Post image ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                    className="object-contain cursor-pointer hover:opacity-90 transition-opacity"
                    priority={priority && index === 0}
                    loading={priority && index === 0 ? undefined : 'lazy'}
                    onClick={() => handleImageClick(image.id)}
                    onError={(e: any) => {
                      console.error('Failed to load image:', image.image_url);
                      // Show fallback
                      const target = e.target as HTMLImageElement;
                      if (target) {
                        target.src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E画像を読み込めませんでした%3C/text%3E%3C/svg%3E';
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
                    priority={priority && index === 0}
                    loading={priority && index === 0 ? undefined : 'lazy'}
                    onClick={() => handleImageClick(image.id)}
                    onError={(e: any) => {
                      console.error('Failed to load image:', image.image_url);
                      // Show fallback
                      const target = e.target as HTMLImageElement;
                      if (target) {
                        target.src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E画像を読み込めませんでした%3C/text%3E%3C/svg%3E';
                      }
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disease information - shown after images */}
      {post.is_active && diseaseName && (
        <div className="mb-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {diseaseName}
          </span>
        </div>
      )}

      {/* Actions: Reaction, Comment, Save, Share (only show if post is active) */}
      {post.is_active && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-6">
            {/* Reaction button */}
            <div className="relative">
              <MessageReactions
                reactions={reactions.map(r => ({
                  id: r.id.toString(),
                  message_id: r.post_id,
                  user_id: r.user_id,
                  reaction_type: r.reaction_type as MessageReactionType,
                  created_at: r.created_at,
                  user: r.user
                    ? {
                        id: r.user.id,
                        nickname: r.user.nickname,
                        username: r.user.username || null,
                        avatar_url: r.user.avatar_url || null,
                      }
                    : null,
                }))}
                currentUserId={user?.id}
                onReactionClick={handleReactionClick}
                messagePosition="left"
                showAddButton={true}
              />
            </div>

            {/* Comment button/link */}
            <Link
              href={`/posts/${post.id}`}
              className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span className="font-medium">{post.comment_count}</span>
            </Link>

            {/* Save button (between comment and share) */}
            {isAuthenticated && (
              <button
                onClick={handleSaveToggle}
                disabled={isSaving}
                className={`transition-colors ${
                  isSaved
                    ? 'text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300'
                    : 'text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400'
                } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isSaved ? tSaved('unsave') : tSaved('save')}
                aria-label={isSaved ? tSaved('unsave') : tSaved('save')}
              >
                <svg
                  className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`}
                  fill={isSaved ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </button>
            )}

            {/* Share button */}
            <ShareButton
              postId={post.id}
              postContent={post.content}
              authorName={post.author?.nickname}
            />
          </div>
        </div>
      )}

      {/* Edit Modal - Regular posts */}
      {isEditModalOpen && (
        <EditPostModal
          post={post}
          isOpen={isEditModalOpen}
          onClose={handleEditModalClose}
          onPostUpdated={handlePostUpdated}
        />
      )}

      {/* Vital Edit Modal - For vital records */}
      {isVitalEditModalOpen &&
        post.post_type === 'health_record' &&
        post.health_record_type === 'vital' && (
          <PostFormModal
            isOpen={isVitalEditModalOpen}
            onClose={handleVitalEditModalClose}
            onPostCreated={handlePostUpdated}
            initialPostType="health_record"
            initialHealthRecordType="vital"
            editingPost={post}
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
                    {post.content.length > 150 ? post.content.slice(0, 150) + '...' : post.content}
                  </p>
                </div>

                {/* Impact Message */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{t('deleteImpact')}</p>

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
                    className="px-2 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-0.5"
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
