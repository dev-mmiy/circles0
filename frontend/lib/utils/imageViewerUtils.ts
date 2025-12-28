/**
 * Image Viewer Utilities
 * 
 * Common utilities for image viewer functionality
 */

import { ImageViewerImage } from '@/components/ImageViewer';

/**
 * Find the index of an image in an array by its ID
 */
export function findImageIndexById(images: ImageViewerImage[], imageId: string): number {
  const index = images.findIndex((img) => img.id === imageId);
  return index >= 0 ? index : 0;
}

/**
 * Find the index of an image in an array by its URL
 */
export function findImageIndexByUrl(images: ImageViewerImage[], imageUrl: string): number {
  const index = images.findIndex((img) => img.image_url === imageUrl);
  return index >= 0 ? index : 0;
}

/**
 * Convert post images to ImageViewerImage format
 */
export function convertPostImagesToViewerImages(
  images: Array<{ id: string; image_url: string; display_order?: number }>
): ImageViewerImage[] {
  if (!images) return [];
  return images.map((img) => ({
    id: img.id,
    image_url: img.image_url,
    alt: `Image ${img.display_order ?? 0}`,
  }));
}

/**
 * Convert message images to ImageViewerImage format
 */
export function convertMessageImagesToViewerImages(
  messages: Array<{ id: string; image_url: string | null }>
): ImageViewerImage[] {
  return messages
    .filter((msg) => msg.image_url)
    .map((msg, idx) => ({
      id: msg.id,
      image_url: msg.image_url!,
      alt: `Message image ${idx + 1}`,
    }));
}






