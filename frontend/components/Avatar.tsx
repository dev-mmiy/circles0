/**
 * Avatar Component
 *
 * Displays user avatar image with fallback to initials
 */

import Image from 'next/image';

interface AvatarProps {
  avatarUrl: string | null | undefined;
  nickname: string | null | undefined;
  size?: number;
  className?: string;
  alt?: string;
}

export default function Avatar({
  avatarUrl,
  nickname,
  size = 32,
  className = 'rounded-full object-cover',
  alt,
}: AvatarProps) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={alt || nickname || 'Avatar'}
        width={size}
        height={size}
        className={className}
        style={{ width: 'auto', height: 'auto' }}
      />
    );
  }

  return (
    <div
      className={`${className} bg-gray-300 flex items-center justify-center`}
      style={{ width: size, height: size }}
    >
      <span className="text-gray-600 text-xs font-medium">
        {nickname?.[0]?.toUpperCase() || '?'}
      </span>
    </div>
  );
}
