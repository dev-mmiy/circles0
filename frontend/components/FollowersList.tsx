'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import FollowButton from './FollowButton';
import UserListItem from './UserListItem';
import { getFollowers, getFollowStats, type FollowerResponse } from '@/lib/api/follows';
import { useUser } from '@/contexts/UserContext';

interface FollowersListProps {
  userId: string;
}

export default function FollowersList({ userId }: FollowersListProps) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const { user: currentUser } = useUser();
  const t = useTranslations('followersList');
  const [followers, setFollowers] = useState<FollowerResponse[]>([]);
  const [followStats, setFollowStats] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = currentUser?.id;

  const loadFollowers = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getFollowers(userId, 0, 100);
      setFollowers(data);

      // Load follow stats for each follower
      if (isAuthenticated) {
        const accessToken = await getAccessTokenSilently();
        const statsPromises = data.map(async follower => {
          if (!follower.follower) return null;
          try {
            const stats = await getFollowStats(follower.follower.id, accessToken);
            return { userId: follower.follower.id, isFollowing: stats.is_following };
          } catch {
            return null;
          }
        });

        const statsResults = await Promise.all(statsPromises);
        const statsMap: Record<string, boolean> = {};
        statsResults.forEach(stat => {
          if (stat) {
            statsMap[stat.userId] = stat.isFollowing;
          }
        });
        setFollowStats(statsMap);
      }

      setError(null);
    } catch (err: any) {
      console.error('Failed to load followers:', err);
      setError(err.message || t('errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [userId, isAuthenticated, getAccessTokenSilently, t]);

  useEffect(() => {
    loadFollowers();
  }, [loadFollowers]);

  const handleFollowChange = (followerId: string, isFollowing: boolean) => {
    setFollowStats(prev => ({
      ...prev,
      [followerId]: isFollowing,
    }));
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

  if (followers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">{t('noFollowers')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {followers.map(follower => {
        if (!follower.follower) return null;

        const isCurrentUser = follower.follower.id === currentUserId;

        return (
          <UserListItem
            key={follower.id}
            user={follower.follower}
            currentUserId={currentUserId}
            showBio={true}
            actionButton={
              !isCurrentUser ? (
                <FollowButton
                  userId={follower.follower.id}
                  initialIsFollowing={followStats[follower.follower.id] || false}
                  onFollowChange={isFollowing =>
                    handleFollowChange(follower.follower!.id, isFollowing)
                  }
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
