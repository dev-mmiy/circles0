/**
 * Avatar Upload Modal Component
 * Modal for uploading and setting user avatar image with crop functionality
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth0 } from '@auth0/auth0-react';
import Image from 'next/image';
import { uploadImage, validateImageFile, createImagePreview } from '@/lib/api/images';
import { debugLog } from '@/lib/utils/debug';

interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (avatarUrl: string | null) => void;
  currentAvatarUrl?: string;
}

interface CropState {
  x: number;
  y: number;
  scale: number;
}

export function AvatarUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
  currentAvatarUrl,
}: AvatarUploadModalProps) {
  const t = useTranslations('avatarUpload');
  const { getAccessTokenSilently } = useAuth0();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropState, setCropState] = useState<CropState>({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [baseScale, setBaseScale] = useState(1); // Initial scale to cover container
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset crop when preview changes
  useEffect(() => {
    if (previewUrl) {
      setCropState({ x: 0, y: 0, scale: 1 });
      setBaseScale(1);
    }
  }, [previewUrl]);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || t('invalidImageFile'));
      return;
    }

    // Create preview
    try {
      const preview = await createImagePreview(file);
      setPreviewUrl(preview);
      setOriginalFile(file);
      setCropState({ x: 0, y: 0, scale: 1 });
      setError(null);
    } catch (err) {
      debugLog.error('Failed to create preview:', err);
      setError(t('failedToCreatePreview'));
    }
  };

  // Handle mouse drag for image positioning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!previewUrl || !containerRef.current) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    setDragStart({ 
      x: e.clientX - cropState.x - centerX, 
      y: e.clientY - cropState.y - centerY 
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !previewUrl || !containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    setCropState(prev => ({
      ...prev,
      x: e.clientX - centerX - dragStart.x,
      y: e.clientY - centerY - dragStart.y,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle zoom with wheel
  const handleWheel = (e: React.WheelEvent) => {
    if (!previewUrl) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05; // 5% increments
    setCropState(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(3, prev.scale + delta)),
    }));
  };

  // Crop image to circular avatar
  /**
   * Crop and resize image to avatar format (circular, 400x400px).
   * 
   * This function performs complex coordinate transformations to accurately crop
   * the image based on the user's zoom and position adjustments in the UI.
   * 
   * Coordinate System Overview:
   * 1. Natural Image Coordinates: The original image dimensions (img.naturalWidth x img.naturalHeight)
   * 2. Displayed Image Coordinates: The image as shown in the UI (scaled by actualScale)
   * 3. Container Coordinates: The crop area (300x300px circle)
   * 4. Canvas Coordinates: The final output (400x400px square)
   * 
   * Transformation Flow:
   * - User adjusts image position (cropState.x, cropState.y) and zoom (cropState.scale)
   * - These adjustments are in displayed image coordinates
   * - We need to convert back to natural image coordinates to crop the correct region
   * - The cropped region is then drawn to a 400x400px canvas with a circular mask
   * 
   * Key Calculations:
   * - actualScale = baseScale * cropState.scale (combined scale factor)
   * - displayedSize = naturalSize * actualScale (how big the image appears)
   * - containerCenterInDisplayed = displayedSize/2 - cropState.offset (where container center is in displayed coords)
   * - naturalCenter = containerCenterInDisplayed * (naturalSize / displayedSize) (convert to natural coords)
   * - sourceSize = containerSize / actualScale (crop size in natural coordinates)
   * 
   * @returns Promise that resolves to a Blob containing the cropped image
   */
  const cropImageToAvatar = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!imageRef.current || !originalFile) {
        reject(new Error('No image to crop'));
        return;
      }

      const img = imageRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Avatar output size (square, 400x400px)
      // This is the final size of the avatar image
      const avatarSize = 400;
      canvas.width = avatarSize;
      canvas.height = avatarSize;

      // Container size (crop area visible to user, 300x300px circle)
      // This is the size of the circular crop area shown in the UI
      const containerSize = 300;
      
      // Calculate the actual displayed scale
      // baseScale: Initial scale to cover the container (calculated when image loads)
      // cropState.scale: User's zoom adjustment (1.0 = no zoom, >1.0 = zoom in, <1.0 = zoom out)
      // actualScale: Combined scale factor for the displayed image
      const actualScale = baseScale * cropState.scale;
      
      // Calculate displayed dimensions
      const displayedWidth = img.naturalWidth * actualScale;
      const displayedHeight = img.naturalHeight * actualScale;
      
      // Calculate the ratio between displayed size and natural size
      const widthRatio = img.naturalWidth / displayedWidth;
      const heightRatio = img.naturalHeight / displayedHeight;
      
      // The container shows a circular area of radius 150px (diameter 300px)
      // The image is positioned with cropState.x, y relative to container center
      // 
      // In the display:
      // - Image is positioned at left: 50%, top: 50% (container center)
      // - Then translated by translate(calc(-50% + cropState.x), calc(-50% + cropState.y))
      // - This means the image center is at: containerCenter + (cropState.x, cropState.y)
      //
      // The container center (150, 150) in container coordinates
      // In the displayed image coordinate system:
      // - Image center is at (displayedWidth/2, displayedHeight/2)
      // - Container center is at image center - (cropState.x, cropState.y)
      //   because the image is moved by (cropState.x, cropState.y) from container center
      // So the point at container center in displayed image coordinates is:
      const containerCenterInDisplayedX = displayedWidth / 2 - cropState.x;
      const containerCenterInDisplayedY = displayedHeight / 2 - cropState.y;
      
      // Convert to natural image coordinates
      const naturalCenterX = containerCenterInDisplayedX * widthRatio;
      const naturalCenterY = containerCenterInDisplayedY * heightRatio;
      
      // Calculate source rectangle (square crop from center)
      // We want to crop a square that fits in the circular container
      // The container is 300px, so we need to calculate what size in natural coordinates
      // corresponds to 300px in displayed coordinates
      // The container radius is 150px, so the square should be 300px in displayed coordinates
      // In natural coordinates: containerSize / actualScale
      const containerSizeInNatural = containerSize / actualScale;
      const sourceSize = Math.min(containerSizeInNatural, img.naturalWidth, img.naturalHeight);
      
      // Calculate the center point for cropping
      // Ensure the crop area stays within image bounds
      let sourceX = naturalCenterX - sourceSize / 2;
      let sourceY = naturalCenterY - sourceSize / 2;
      
      // Clamp to image bounds
      sourceX = Math.max(0, Math.min(sourceX, img.naturalWidth - sourceSize));
      sourceY = Math.max(0, Math.min(sourceY, img.naturalHeight - sourceSize));
      
      // Log crop calculation details
      debugLog.log('[AvatarUpload] Crop calculation:', {
        baseScale,
        cropStateScale: cropState.scale,
        actualScale,
        displayedWidth,
        displayedHeight,
        cropStateX: cropState.x,
        cropStateY: cropState.y,
        containerCenterInDisplayedX,
        containerCenterInDisplayedY,
        naturalCenterX,
        naturalCenterY,
        containerSizeInNatural,
        sourceX,
        sourceY,
        sourceSize,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        widthRatio,
        heightRatio,
      });

      // Draw circular mask
      ctx.beginPath();
      ctx.arc(avatarSize / 2, avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();

      // Draw and scale image
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        avatarSize,
        avatarSize
      );

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, originalFile.type, 0.95);
    });
  };

  const handleUpload = async () => {
    if (!previewUrl || !originalFile) {
      setError(t('noFileSelected'));
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Crop image to circular avatar
      debugLog.log('[AvatarUpload] Starting image crop and upload...');
      const croppedBlob = await cropImageToAvatar();
      debugLog.log('[AvatarUpload] Image cropped, blob size:', croppedBlob.size);
      const croppedFile = new File([croppedBlob], originalFile.name, { type: originalFile.type });

      // Upload cropped image
      const accessToken = await getAccessTokenSilently();
      debugLog.log('[AvatarUpload] Uploading cropped image...');
      const uploadResponse = await uploadImage(croppedFile, accessToken);
      debugLog.log('[AvatarUpload] Image uploaded successfully, URL:', uploadResponse.url);
      onUploadComplete(uploadResponse.url);
      onClose();
      // Reset state
      setPreviewUrl(null);
      setOriginalFile(null);
      setCropState({ x: 0, y: 0, scale: 1 });
      setBaseScale(1);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      debugLog.error('Failed to upload avatar:', err);
      if (err.response?.status === 503) {
        setError(t('uploadServiceNotConfigured'));
      } else {
        setError(err.response?.data?.detail || err.message || t('uploadFailed'));
      }
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setPreviewUrl(null);
    setOriginalFile(null);
    setCropState({ x: 0, y: 0, scale: 1 });
    setBaseScale(1);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const handleRemove = async () => {
    setUploading(true);
    setError(null);

    try {
      onUploadComplete(null);
      onClose();
      // Reset state
      setPreviewUrl(null);
      setOriginalFile(null);
      setCropState({ x: 0, y: 0, scale: 1 });
      setBaseScale(1);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      debugLog.error('Failed to remove avatar:', err);
      setError(err.response?.data?.detail || err.message || t('removeFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('title')}</h2>

        {/* Crop Area */}
        {previewUrl ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('adjustImage')}
            </label>
            <div className="relative w-full flex justify-center">
              {/* Crop container with circular mask */}
              <div
                ref={containerRef}
                className="relative w-[300px] h-[300px] rounded-full overflow-hidden border-4 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 cursor-move"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imageRef}
                  src={previewUrl}
                  alt={t('preview')}
                  className="absolute select-none pointer-events-none"
                  style={{
                    width: imageSize.width > 0 ? `${imageSize.width * baseScale * cropState.scale}px` : 'auto',
                    height: imageSize.height > 0 ? `${imageSize.height * baseScale * cropState.scale}px` : 'auto',
                    objectFit: 'cover',
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${cropState.x}px), calc(-50% + ${cropState.y}px))`,
                    transformOrigin: 'center center',
                  }}
                  draggable={false}
                  onLoad={() => {
                    // Reset position when image loads
                    if (imageRef.current) {
                      const img = imageRef.current;
                      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
                      // Calculate initial scale to cover the container
                      const containerSize = 300;
                      const scaleX = containerSize / img.naturalWidth;
                      const scaleY = containerSize / img.naturalHeight;
                      const initialScale = Math.max(scaleX, scaleY);
                      setBaseScale(initialScale);
                      setCropState({ x: 0, y: 0, scale: 1 }); // Start with scale 1, baseScale handles initial sizing
                      debugLog.log('[AvatarUpload] Image loaded:', {
                        naturalWidth: img.naturalWidth,
                        naturalHeight: img.naturalHeight,
                        initialScale,
                      });
                    }
                  }}
                />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center mb-4">
              <p>{t('dragToMove')}</p>
              <p>{t('scrollToZoom')}</p>
            </div>
            
            {/* Zoom controls - placed directly below the image */}
            <div className="flex justify-center items-center space-x-4">
              <button
                type="button"
                onClick={() => setCropState(prev => ({ ...prev, scale: Math.max(0.5, prev.scale - 0.05) }))}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                disabled={cropState.scale <= 0.5}
              >
                {t('zoomOut')}
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">{Math.round(cropState.scale * 100)}%</span>
              <button
                type="button"
                onClick={() => setCropState(prev => ({ ...prev, scale: Math.min(3, prev.scale + 0.05) }))}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                disabled={cropState.scale >= 3}
              >
                {t('zoomIn')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCropState({ x: 0, y: 0, scale: 1 });
                  // Reset baseScale if image is loaded
                  if (imageRef.current && imageSize.width > 0) {
                    const containerSize = 300;
                    const scaleX = containerSize / imageSize.width;
                    const scaleY = containerSize / imageSize.height;
                    const initialScale = Math.max(scaleX, scaleY);
                    setBaseScale(initialScale);
                  }
                }}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {t('reset')}
              </button>
            </div>
          </div>
        ) : (
          /* Preview when no image selected */
          <div className="mb-4 flex justify-center">
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 dark:border-gray-600">
              {currentAvatarUrl ? (
                <Image
                  src={currentAvatarUrl}
                  alt={t('currentAvatar')}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-400 dark:text-gray-500 text-2xl">?</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* File input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('selectImage')}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('fileRequirements')}</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center">
          {/* Remove button (only show if current avatar exists and no new image selected) */}
          {currentAvatarUrl && !previewUrl && (
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
            >
              {uploading ? t('removing') : t('remove')}
            </button>
          )}
          {!currentAvatarUrl && !previewUrl && <div />}
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              disabled={uploading}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || !previewUrl}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? t('uploading') : t('upload')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

