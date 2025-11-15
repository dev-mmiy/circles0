/**
 * Image upload API client
 */

import axios from 'axios';
import { getApiBaseUrl } from '../config';

const API_BASE_URL = getApiBaseUrl();

export interface UploadImageResponse {
  url: string;
  message: string;
}

export interface UploadMultipleImagesResponse {
  urls: string[];
  errors?: string[] | null;
  message: string;
}

/**
 * Upload a single image file
 */
export async function uploadImage(
  file: File,
  authToken: string
): Promise<UploadImageResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post<UploadImageResponse>(
    `${API_BASE_URL}/api/v1/images/upload`,
    formData,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
}

/**
 * Upload multiple image files (max 5)
 */
export async function uploadMultipleImages(
  files: File[],
  authToken: string
): Promise<UploadMultipleImagesResponse> {
  if (files.length > 5) {
    throw new Error('Maximum 5 images allowed per request');
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await axios.post<UploadMultipleImagesResponse>(
    `${API_BASE_URL}/api/v1/images/upload-multiple`,
    formData,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
}

/**
 * Delete an image from storage
 */
export async function deleteImage(
  imageUrl: string,
  authToken: string
): Promise<void> {
  await axios.delete(`${API_BASE_URL}/api/v1/images/delete`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    params: {
      image_url: imageUrl,
    },
  });
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Allowed types: JPEG, PNG, GIF, WebP',
    };
  }

  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds maximum allowed size of 10MB',
    };
  }

  return { valid: true };
}

/**
 * Create a preview URL for an image file
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to create preview'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

