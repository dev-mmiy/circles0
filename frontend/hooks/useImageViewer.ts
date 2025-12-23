/**
 * useImageViewer Hook
 * 
 * Custom hook for managing image viewer state
 */

import { useState, useCallback } from 'react';
import { ImageViewerImage } from '@/components/ImageViewer';
import { findImageIndexByUrl, findImageIndexById } from '@/lib/utils/imageViewerUtils';

interface UseImageViewerReturn {
  images: ImageViewerImage[];
  currentIndex: number;
  isOpen: boolean;
  openViewer: (images: ImageViewerImage[], initialImageUrlOrId: string) => void;
  openViewerByIndex: (images: ImageViewerImage[], initialIndex: number) => void;
  closeViewer: () => void;
}

export function useImageViewer(): UseImageViewerReturn {
  const [images, setImages] = useState<ImageViewerImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const openViewer = useCallback((newImages: ImageViewerImage[], initialImageUrlOrId: string) => {
    if (newImages.length === 0) return;
    
    // Try to find by URL first, then by ID
    let index = findImageIndexByUrl(newImages, initialImageUrlOrId);
    if (index === 0 && newImages[0]?.image_url !== initialImageUrlOrId) {
      index = findImageIndexById(newImages, initialImageUrlOrId);
    }
    
    setImages(newImages);
    setCurrentIndex(index);
    setIsOpen(true);
  }, []);

  const openViewerByIndex = useCallback((newImages: ImageViewerImage[], initialIndex: number) => {
    if (newImages.length === 0) return;
    
    const index = Math.max(0, Math.min(initialIndex, newImages.length - 1));
    setImages(newImages);
    setCurrentIndex(index);
    setIsOpen(true);
  }, []);

  const closeViewer = useCallback(() => {
    setIsOpen(false);
    setImages([]);
    setCurrentIndex(0);
  }, []);

  return {
    images,
    currentIndex,
    isOpen,
    openViewer,
    openViewerByIndex,
    closeViewer,
  };
}




