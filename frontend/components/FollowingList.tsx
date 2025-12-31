'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import FollowButton from './FollowButton';
import UserListItem from './UserListItem';
import { getFollowing, type FollowingResponse } from '@/lib/api/follows';
import { useUser } from '@/contexts/UserContext';

interface FollowingListProps {
  userId: string;
}

export default function FollowingList({ userId }: FollowingListProps) {
  const { user: currentUser } = useUser();
  const t = useTranslations('followingList');
  const [following, setFollowing] = useState<FollowingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = currentUser?.id;

  const loadFollowing = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getFollowing(userId, 0, 100);
      setFollowing(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load following:', err);
      setError(err.message || t('errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [userId, t]);

  useEffect(() => {
    loadFollowing();
  }, [loadFollowing]);

  const handleUnfollow = (followingId: string) => {
    // Remove from list optimistically
    setFollowing(prev => prev.filter(f => f.following?.id !== followingId));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="w-8 h-8 border-4 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (following.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">{t('noFollowing')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {following.map(follow => {
        if (!follow.following) return null;

        const isCurrentUser = follow.following.id === currentUserId;

        return (
          <UserListItem
            key={follow.id}
            user={follow.following}
            currentUserId={currentUserId}
            showBio={true}
            actionButton={
              !isCurrentUser ? (
                <FollowButton
                  userId={follow.following.id}
                  initialIsFollowing={true}
                  onFollowChange={isFollowing => {
                    if (!isFollowing) {
                      handleUnfollow(follow.following!.id);
                    }
                  }}
                  className="text-sm px-3 py-1.5"
                />
              ) : undefined
            }
          />
        );
      })}
    </div>
  );
}
