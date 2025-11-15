'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createPost, type CreatePostData } from '@/lib/api/posts';
import { extractHashtags } from '@/lib/utils/hashtag';
import { extractMentions } from '@/lib/utils/mention';

interface PostFormProps {
  onPostCreated?: () => void;
  placeholder?: string;
}

export default function PostForm({
  onPostCreated,
  placeholder,
}: PostFormProps) {
  const { getAccessTokenSilently } = useAuth0();
  const t = useTranslations('postForm');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers_only' | 'private'>(
    'public'
  );
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract hashtags from content
  const detectedHashtags = useMemo(() => {
    return extractHashtags(content);
  }, [content]);

  // Extract mentions from content
  const detectedMentions = useMemo(() => {
    return extractMentions(content);
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError(t('errors.contentRequired'));
      return;
    }

    if (content.length > 5000) {
      setError(t('errors.contentTooLong'));
      return;
    }

    if (imageUrls.length > 5) {
      setError(t('errors.tooManyImages'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const accessToken = await getAccessTokenSilently();

      const postData: CreatePostData = {
        content: content.trim(),
        visibility,
        image_urls: imageUrls.length > 0 ? imageUrls : undefined,
      };

      await createPost(postData, accessToken);

      // Reset form
      setContent('');
      setVisibility('public');
      setImageUrls([]);
      setNewImageUrl('');

      // Notify parent component
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (err: any) {
      console.error('Failed to create post:', err);
      setError(err.message || t('errors.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <form onSubmit={handleSubmit}>
        {/* Textarea for post content */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder || t('placeholder')}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={4}
          maxLength={5000}
          disabled={isSubmitting}
        />

        {/* Detected hashtags */}
        {detectedHashtags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-sm text-gray-600 font-medium">
              {t('detectedHashtags')}:
            </span>
            {detectedHashtags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-sm font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Detected mentions */}
        {detectedMentions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-sm text-gray-600 font-medium">
              {t('detectedMentions')}:
            </span>
            {detectedMentions.map((mention, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-sm font-medium"
              >
                @{mention}
              </span>
            ))}
          </div>
        )}

        {/* Image URLs */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('imagesLabel')} ({imageUrls.length}/5)
          </label>
          {imageUrls.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {imageUrls.map((url, index) => (
                <div
                  key={index}
                  className="relative inline-block group"
                >
                  <img
                    src={url}
                    alt={`Image ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12"%3EInvalid%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrls(imageUrls.filter((_, i) => i !== index));
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    disabled={isSubmitting}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {imageUrls.length < 5 && (
            <div className="flex gap-2">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder={t('imageUrlPlaceholder')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newImageUrl.trim()) {
                    e.preventDefault();
                    if (imageUrls.length < 5) {
                      setImageUrls([...imageUrls, newImageUrl.trim()]);
                      setNewImageUrl('');
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (newImageUrl.trim() && imageUrls.length < 5) {
                    setImageUrls([...imageUrls, newImageUrl.trim()]);
                    setNewImageUrl('');
                  }
                }}
                disabled={isSubmitting || !newImageUrl.trim() || imageUrls.length >= 5}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('addImage')}
              </button>
            </div>
          )}
        </div>

        {/* Character count */}
        <div className="flex justify-end mt-1">
          <span
            className={`text-sm ${
              content.length > 4500 ? 'text-red-500' : 'text-gray-500'
            }`}
          >
            {content.length} / 5000
          </span>
        </div>

        {/* Visibility selector and submit button */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="visibility" className="text-sm font-medium text-gray-700">
              {t('visibilityLabel')}
            </label>
            <select
              id="visibility"
              value={visibility}
              onChange={(e) =>
                setVisibility(
                  e.target.value as 'public' | 'followers_only' | 'private'
                )
              }
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            >
              <option value="public">{t('visibility.public')}</option>
              <option value="followers_only">{t('visibility.followersOnly')}</option>
              <option value="private">{t('visibility.private')}</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isSubmitting || !content.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? t('submitting') : t('submit')}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </form>
    </div>
  );
}
