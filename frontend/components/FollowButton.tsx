'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { followUser, unfollowUser } from '@/lib/api/follows';
import { UserPlus, UserCheck } from 'lucide-react';

interface FollowButtonProps {
  userId: string;
  initialIsFollowing: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  className?: string;
}

export default function FollowButton({
  userId,
  initialIsFollowing,
  onFollowChange,
  className = '',
}: FollowButtonProps) {
  const { getAccessTokenSilently, isAuthenticated, loginWithRedirect } = useAuth0();
  const t = useTranslations('followButton');
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);

  // Update isFollowing when initialIsFollowing changes
  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      loginWithRedirect();
      return;
    }

    setIsLoading(true);

    try {
      const accessToken = await getAccessTokenSilently();

      if (isFollowing) {
        await unfollowUser(userId, accessToken);
        setIsFollowing(false);
        onFollowChange?.(false);
      } else {
        await followUser(userId, accessToken);
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (error: any) {
      console.error('Failed to toggle follow:', error);
      // Show error to user
      alert(error.message || t('errors.updateFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleFollowToggle}
      disabled={isLoading}
      className={`flex flex-col md:flex-row items-center justify-center px-3 py-2 md:px-4 md:py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        isFollowing
          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
      } ${className}`}
      title={isFollowing ? t('following') : t('follow')}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin h-5 w-5 md:h-4 md:w-4 mb-1 md:mb-0 md:mr-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="hidden md:inline text-xs md:text-sm">{t('processing')}</span>
        </>
      ) : (
        <>
          {isFollowing ? (
            <UserCheck className="h-5 w-5 md:h-4 md:w-4 mb-1 md:mb-0 md:mr-2" />
          ) : (
            <UserPlus className="h-5 w-5 md:h-4 md:w-4 mb-1 md:mb-0 md:mr-2" />
          )}
          <span className="hidden md:inline text-xs md:text-sm">
            {isFollowing ? t('following') : t('follow')}
          </span>
        </>
      )}
    </button>
  );
}
