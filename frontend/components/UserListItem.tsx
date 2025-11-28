'use client';

import { Link } from '@/i18n/routing';
import Image from 'next/image';

// Common user data interface for list items
export interface UserListItemData {
  id: string;
  member_id?: string;
  nickname: string;
  username?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
}

interface UserListItemProps {
  user: UserListItemData;
  currentUserId?: string;
  showBio?: boolean;
  actionButton?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Common component for displaying a user in a list
 * Used in FollowersList, FollowingList, UserSearch, etc.
 */
export default function UserListItem({
  user,
  currentUserId,
  showBio = true,
  actionButton,
  size = 'md',
  className = '',
}: UserListItemProps) {
  const isCurrentUser = user.id === currentUserId;
  
  // Size configurations
  const sizeConfig = {
    sm: {
      avatar: 32,
      avatarClass: 'w-8 h-8',
      nicknameClass: 'text-sm',
      usernameClass: 'text-xs',
      bioClass: 'text-xs',
    },
    md: {
      avatar: 48,
      avatarClass: 'w-12 h-12',
      nicknameClass: 'text-sm',
      usernameClass: 'text-sm',
      bioClass: 'text-sm',
    },
    lg: {
      avatar: 64,
      avatarClass: 'w-16 h-16',
      nicknameClass: 'text-base',
      usernameClass: 'text-sm',
      bioClass: 'text-sm',
    },
  };

  const config = sizeConfig[size];

  return (
    <div
      className={`flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow ${className}`}
    >
      <Link
        href={isCurrentUser ? '/profile/me' : `/profile/${user.member_id || user.id}`}
        className="flex items-center space-x-4 flex-1 min-w-0"
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.nickname || 'User'}
              width={config.avatar}
              height={config.avatar}
              className={`${config.avatarClass} rounded-full object-cover`}
            />
          ) : (
            <div className={`${config.avatarClass} rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center`}>
              <span className={`text-blue-600 dark:text-blue-300 font-semibold ${size === 'lg' ? 'text-lg' : size === 'md' ? 'text-base' : 'text-sm'}`}>
                {user.nickname?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          )}
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <p className={`${config.nicknameClass} font-medium text-gray-900 dark:text-gray-100 truncate`}>
            {user.nickname || 'Unknown User'}
          </p>
          {user.username && (
            <p className={`${config.usernameClass} text-gray-500 dark:text-gray-400 truncate`}>
              @{user.username}
            </p>
          )}
          {showBio && user.bio && (
            <p className={`${config.bioClass} text-gray-600 dark:text-gray-400 truncate mt-1`}>
              {user.bio}
            </p>
          )}
        </div>
      </Link>

      {/* Action button */}
      {actionButton && (
        <div className="ml-4 flex-shrink-0">
          {actionButton}
        </div>
      )}
    </div>
  );
}

