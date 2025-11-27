/**
 * ImageUploadPreview Component
 * 
 * Displays image preview and upload status for chat message forms
 */

import Image from 'next/image';
import { Trash2 } from 'lucide-react';

interface ImageUploadPreviewProps {
  previewUrl: string;
  onRemove: () => void;
  isUploading?: boolean;
  className?: string;
}

export default function ImageUploadPreview({
  previewUrl,
  onRemove,
  isUploading = false,
  className = 'max-w-xs max-h-32 rounded-lg object-contain',
}: ImageUploadPreviewProps) {
  return (
    <div className="mt-2 relative inline-block">
      <Image
        src={previewUrl}
        alt="Preview"
        width={256}
        height={128}
        className={className}
        style={{ width: 'auto', height: 'auto' }}
        loading="lazy"
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={isUploading}
        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}


