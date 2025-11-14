'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createPost, type CreatePostData } from '@/lib/api/posts';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    setIsSubmitting(true);
    setError(null);

    try {
      const accessToken = await getAccessTokenSilently();

      const postData: CreatePostData = {
        content: content.trim(),
        visibility,
      };

      await createPost(postData, accessToken);

      // Reset form
      setContent('');
      setVisibility('public');

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
