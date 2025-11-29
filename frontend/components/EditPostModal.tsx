'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { updatePost, type Post, type UpdatePostData } from '@/lib/api/posts';
import { extractHashtags } from '@/lib/utils/hashtag';
import { extractMentions } from '@/lib/utils/mention';
import { uploadImage, uploadMultipleImages, validateImageFile, createImagePreview, type UploadImageResponse } from '@/lib/api/images';

interface EditPostModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onPostUpdated?: () => void;
}

export default function EditPostModal({
  post,
  isOpen,
  onClose,
  onPostUpdated,
}: EditPostModalProps) {
  const { getAccessTokenSilently } = useAuth0();
  const t = useTranslations('postForm');
  const [content, setContent] = useState(post.content);
  const [visibility, setVisibility] = useState<'public' | 'followers_only' | 'private'>(
    post.visibility as 'public' | 'followers_only' | 'private'
  );
  const [imageUrls, setImageUrls] = useState<string[]>(
    post.images?.map(img => img.image_url) || []
  );
  const [imagePreviews, setImagePreviews] = useState<{ url: string; file?: File }[]>(
    post.images?.map(img => ({ url: img.image_url })) || []
  );
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when post changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setContent(post.content);
      setVisibility(post.visibility as 'public' | 'followers_only' | 'private');
      setImageUrls(post.images?.map(img => img.image_url) || []);
      setImagePreviews(post.images?.map(img => ({ url: img.image_url })) || []);
      setError(null);
    }
  }, [isOpen, post]);

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
    } catch (err: any) {
      console.error('Failed to upload images:', err);
      
      // Handle 503 error (GCS not configured)
      if (err.response?.status === 503) {
        setError(t('errors.uploadServiceNotConfigured'));
      } else {
        setError(err.response?.data?.detail || err.message || t('errors.uploadFailed'));
      }
      
      // Remove failed previews
      setImagePreviews(imagePreviews);
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle image removal
  const handleRemoveImage = (index: number) => {
    const newImageUrls = imageUrls.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImageUrls(newImageUrls);
    setImagePreviews(newPreviews);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!content.trim()) {
      setError(t('errors.contentRequired'));
      return;
    }

    if (content.length > 5000) {
      setError(t('errors.contentTooLong'));
      return;
    }

    setIsSubmitting(true);

    try {
      const accessToken = await getAccessTokenSilently();
      const updateData: UpdatePostData = {
        content: content.trim(),
        visibility,
        image_urls: imageUrls, // Always send image_urls array (empty array to delete all images)
      };

      await updatePost(post.id, updateData, accessToken);

      // Notify parent
      if (onPostUpdated) {
        onPostUpdated();
      }

      // Close modal
      onClose();
    } catch (err: any) {
      console.error('Failed to update post:', err);
      setError(err.message || t('errors.updateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('editTitle')}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6">
            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* Content textarea */}
            <div className="mb-4">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('contentLabel')}
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder={t('contentPlaceholder')}
                disabled={isSubmitting}
              />
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {content.length}/5000 {t('characters')}
              </div>
            </div>

            {/* Detected hashtags */}
            {detectedHashtags.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('detectedHashtags')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {detectedHashtags.map((hashtag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium"
                    >
                      #{hashtag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Detected mentions */}
            {detectedMentions.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('detectedMentions')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {detectedMentions.map((mention, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium"
                    >
                      @{mention}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Images */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                        className="w-20 h-20 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                      />
                      {uploadingImages && preview.file && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                          <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
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
                    className="hidden"
                    disabled={isSubmitting || uploadingImages || imageUrls.length >= 5}
                    id="image-upload-edit"
                  />
                  <label
                    htmlFor="image-upload-edit"
                    className={`inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                      isSubmitting || uploadingImages || imageUrls.length >= 5
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    {uploadingImages ? (
                      <>
                        <div className="w-4 h-4 border-4 border-gray-600 dark:border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
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

            {/* Visibility */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('visibilityLabel')}
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'public' | 'followers_only' | 'private')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 [&>option]:bg-white [&>option]:dark:bg-gray-700 [&>option]:text-gray-900 [&>option]:dark:text-gray-100"
                disabled={isSubmitting}
              >
                <option value="public">{t('visibility.public')}</option>
                <option value="followers_only">{t('visibility.followersOnly')}</option>
                <option value="private">{t('visibility.private')}</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || uploadingImages}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t('updating') : t('update')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

