'use client';

import { useAuth0 } from '@auth0/auth0-react';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import FollowButton from './FollowButton';
import {
  getFollowers,
  getFollowStats,
  type FollowerResponse,
} from '@/lib/api/follows';

interface FollowersListProps {
  userId: string;
}

export default function FollowersList({ userId }: FollowersListProps) {
  const { getAccessTokenSilently, isAuthenticated, user } = useAuth0();
  const t = useTranslations('followersList');
  const [followers, setFollowers] = useState<FollowerResponse[]>([]);
  const [followStats, setFollowStats] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = user?.sub;

  const loadFollowers = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getFollowers(userId, 0, 100);
      setFollowers(data);

      // Load follow stats for each follower
      if (isAuthenticated) {
        const accessToken = await getAccessTokenSilently();
        const statsPromises = data.map(async (follower) => {
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
        statsResults.forEach((stat) => {
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
    setFollowStats((prev) => ({
      ...prev,
      [followerId]: isFollowing,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (followers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{t('noFollowers')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {followers.map((follower) => {
        if (!follower.follower) return null;

        const isCurrentUser = follower.follower.id === currentUserId;

        return (
          <div
            key={follower.id}
            className="flex items-center justify-between p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <Link
              href={`/profile/${follower.follower.member_id}`}
              className="flex items-center space-x-4 flex-1 min-w-0"
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                {follower.follower.avatar_url ? (
                  <Image
                    src={follower.follower.avatar_url}
                    alt={follower.follower.nickname}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-lg">
                      {follower.follower.nickname.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {follower.follower.nickname}
                </p>
                {follower.follower.username && (
                  <p className="text-sm text-gray-500 truncate">
                    @{follower.follower.username}
                  </p>
                )}
                {follower.follower.bio && (
                  <p className="text-sm text-gray-600 truncate mt-1">
                    {follower.follower.bio}
                  </p>
                )}
              </div>
            </Link>

            {/* Follow button */}
            {!isCurrentUser && (
              <div className="ml-4">
                <FollowButton
                  userId={follower.follower.id}
                  initialIsFollowing={followStats[follower.follower.id] || false}
                  onFollowChange={(isFollowing) =>
                    handleFollowChange(follower.follower!.id, isFollowing)
                  }
                  className="text-sm px-3 py-1.5"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
