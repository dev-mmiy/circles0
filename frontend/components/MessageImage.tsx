/**
 * MessageImage Component
 * 
 * Displays an image attached to a message (for both direct messages and group messages)
 */

import Image from 'next/image';
import { debugLog } from '@/lib/utils/debug';

interface MessageImageProps {
  imageUrl: string;
  messageId?: string;
  alt?: string;
  className?: string;
  priority?: boolean;
}

export default function MessageImage({
  imageUrl,
  messageId,
  alt = 'Message attachment',
  className = 'max-w-full rounded-lg object-contain',
  priority = false,
}: MessageImageProps) {
  return (
    <div className="mt-2 relative w-full">
      <Image
        src={imageUrl}
        alt={alt}
        width={400}
        height={400}
        sizes="(max-width: 768px) 100vw, 400px"
        className={className}
        style={{ width: 'auto', height: 'auto' }}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        onError={(e) => {
          debugLog.error('[MessageImage] Image load error:', {
            messageId,
            image_url: imageUrl,
            error: e,
          });
          (e.target as HTMLImageElement).style.display = 'none';
        }}
        onLoad={() => {
          debugLog.log('[MessageImage] Image loaded successfully:', {
            messageId,
            image_url: imageUrl,
          });
        }}
      />
    </div>
  );
}

