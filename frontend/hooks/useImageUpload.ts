/**
 * useImageUpload Hook
 * 
 * Common hook for handling image upload in chat forms
 */

import { useState, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { uploadImage, validateImageFile, createImagePreview } from '@/lib/api/images';
import { debugLog } from '@/lib/utils/debug';

interface UseImageUploadOptions {
  onUploadSuccess?: (url: string) => void;
  onUploadError?: (error: Error) => void;
  translationKeys?: {
    invalidImageFile?: string;
    failedToCreatePreview?: string;
    uploadServiceNotConfigured?: string;
    uploadFailed?: string;
  };
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const { getAccessTokenSilently } = useAuth0();
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Step 1: Validate file (type, size limits)
    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error || options.translationKeys?.invalidImageFile || 'Invalid image file');
      return;
    }

    // Step 2: Create preview URL for immediate UI feedback
    try {
      const previewUrl = await createImagePreview(file);
      setImagePreview(previewUrl);
    } catch (err) {
      debugLog.error('Failed to create preview:', err);
      alert(options.translationKeys?.failedToCreatePreview || 'Failed to create preview');
      return;
    }

    // Step 3: Upload image to server (GCS)
    setUploadingImage(true);
    try {
      const accessToken = await getAccessTokenSilently();
      const uploadResponse = await uploadImage(file, accessToken);
      setUploadedImageUrl(uploadResponse.url);
      options.onUploadSuccess?.(uploadResponse.url);
    } catch (err: any) {
      debugLog.error('Failed to upload image:', err);
      setImagePreview(null);
      const errorMessage = err.response?.status === 503
        ? (options.translationKeys?.uploadServiceNotConfigured || 'Upload service not configured')
        : (err.response?.data?.detail || err.message || options.translationKeys?.uploadFailed || 'Upload failed');
      alert(errorMessage);
      options.onUploadError?.(err);
    } finally {
      setUploadingImage(false);
      // Reset file input to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setUploadedImageUrl(null);
    setImagePreview(null);
  };

  const clearImage = () => {
    setUploadedImageUrl(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return {
    uploadedImageUrl,
    imagePreview,
    uploadingImage,
    fileInputRef,
    handleImageSelect,
    handleRemoveImage,
    clearImage,
  };
}






