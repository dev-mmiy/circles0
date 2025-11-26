'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useMemo, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { createPost, type CreatePostData } from '@/lib/api/posts';
import { extractHashtags } from '@/lib/utils/hashtag';
import { extractMentions } from '@/lib/utils/mention';
import { uploadImage, uploadMultipleImages, validateImageFile, createImagePreview, type UploadImageResponse } from '@/lib/api/images';
import { debugLog } from '@/lib/utils/debug';

interface PostFormProps {
  onPostCreated?: () => void | Promise<void>;
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
  const [imagePreviews, setImagePreviews] = useState<{ url: string; file?: File }[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract hashtags from content
  const detectedHashtags = useMemo(() => {
    return extractHashtags(content);
  }, [content]);

  // Extract mentions from content
  const detectedMentions = useMemo(() => {
    return extractMentions(content);
  }, [content]);

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
        debugLog.error('Failed to create preview:', err);
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
        // Update image URLs
        const newImageUrls = [...imageUrls, ...uploadResponse.urls];
        setImageUrls(newImageUrls);
        
        // Update previews with uploaded URLs
        const newPreviews = [...imagePreviews];
        uploadResponse.urls.forEach((url, index) => {
          const previewIndex = imagePreviews.length + index;
          if (newPreviews[previewIndex]) {
            newPreviews[previewIndex] = { url, file: validFiles[index] };
          } else {
            newPreviews.push({ url, file: validFiles[index] });
          }
        });
        setImagePreviews(newPreviews);
      }

      if (uploadResponse.errors && uploadResponse.errors.length > 0) {
        setError(uploadResponse.errors.join(', '));
      }
    } catch (err: any) {
      debugLog.error('Failed to upload images:', err);
      
      // Handle 503 error (GCS not configured)
      if (err.response?.status === 503) {
        setError(t('errors.uploadServiceNotConfigured'));
      } else {
        setError(err.response?.data?.detail || err.message || t('errors.uploadFailed'));
      }
      
      // Remove failed previews
      setImagePreviews(imagePreviews.slice(0, imagePreviews.length - validFiles.length));
    } finally {
      setUploadingImages(false);
      // Reset file input
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
      setImagePreviews([]);

      // Notify parent component (await if it's async)
      if (onPostCreated) {
        const result = onPostCreated();
        // Check if result is a Promise-like object
        if (result && typeof result === 'object' && 'then' in result && typeof (result as any).then === 'function') {
          await result;
        }
      }
    } catch (err: any) {
      debugLog.error('Failed to create post:', err);
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

        {/* Images */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('imagesLabel')} ({imageUrls.length}/5)
          </label>
          
          {/* Image previews */}
          {imagePreviews.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {imagePreviews.map((preview, index) => (
                <div
                  key={index}
                  className="relative inline-block group w-20 h-20"
                >
                  <Image
                    src={preview.url}
                    alt={`Image ${index + 1}`}
                    width={80}
                    height={80}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                  />
                  {uploadingImages && preview.file && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-600"
                    disabled={isSubmitting || uploadingImages}
                    title={t('removeImage')}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload options */}
          {imageUrls.length < 5 && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                multiple
                onChange={handleFileSelect}
                disabled={isSubmitting || uploadingImages || imageUrls.length >= 5}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  isSubmitting || uploadingImages || imageUrls.length >= 5
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {uploadingImages ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    {t('uploading')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {t('uploadImage')}
                  </>
                )}
              </label>
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
