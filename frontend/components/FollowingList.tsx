'use client';

import { useAuth0 } from '@auth0/auth0-react';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import FollowButton from './FollowButton';
import { getFollowing, type FollowingResponse } from '@/lib/api/follows';

interface FollowingListProps {
  userId: string;
}

export default function FollowingList({ userId }: FollowingListProps) {
  const { user } = useAuth0();
  const t = useTranslations('followingList');
  const [following, setFollowing] = useState<FollowingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = user?.sub;

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
    setFollowing((prev) => prev.filter((f) => f.following?.id !== followingId));
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

  if (following.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{t('noFollowing')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {following.map((follow) => {
        if (!follow.following) return null;

        const isCurrentUser = follow.following.id === currentUserId;

        return (
          <div
            key={follow.id}
            className="flex items-center justify-between p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <Link
              href={`/profile/${follow.following.member_id}`}
              className="flex items-center space-x-4 flex-1 min-w-0"
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                {follow.following.avatar_url ? (
                  <img
                    src={follow.following.avatar_url}
                    alt={follow.following.nickname}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-lg">
                      {follow.following.nickname.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {follow.following.nickname}
                </p>
                {follow.following.username && (
                  <p className="text-sm text-gray-500 truncate">
                    @{follow.following.username}
                  </p>
                )}
                {follow.following.bio && (
                  <p className="text-sm text-gray-600 truncate mt-1">
                    {follow.following.bio}
                  </p>
                )}
              </div>
            </Link>

            {/* Follow button */}
            {!isCurrentUser && (
              <div className="ml-4">
                <FollowButton
                  userId={follow.following.id}
                  initialIsFollowing={true}
                  onFollowChange={(isFollowing) => {
                    if (!isFollowing) {
                      handleUnfollow(follow.following!.id);
                    }
                  }}
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
