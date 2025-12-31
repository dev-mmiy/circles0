'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import Header from '@/components/Header';
import { getBlockedUsers, unblockUser, BlockedUserSummary } from '@/lib/api/users';

export default function BlocksPage() {
  const { getAccessTokenSilently, isAuthenticated, loginWithRedirect } = useAuth0();
  const t = useTranslations('blocksPage');
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unblockingIds, setUnblockingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      loginWithRedirect();
      return;
    }

    const fetchBlockedUsers = async () => {
      try {
        setLoading(true);
        const accessToken = await getAccessTokenSilently();
        const users = await getBlockedUsers(accessToken);
        setBlockedUsers(users);
      } catch (err: any) {
        console.error('Failed to fetch blocked users:', err);
        setError(err.message || t('errors.loadFailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchBlockedUsers();
  }, [isAuthenticated, getAccessTokenSilently, loginWithRedirect, t]);

  const handleUnblock = async (userId: string) => {
    try {
      setUnblockingIds(prev => new Set(prev).add(userId));
      const accessToken = await getAccessTokenSilently();
      await unblockUser(accessToken, userId);

      // Remove from list
      setBlockedUsers(prev => prev.filter(user => user.id !== userId));
    } catch (err: any) {
      console.error('Failed to unblock user:', err);
      alert(err.message || t('errors.unblockFailed'));
    } finally {
      setUnblockingIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{t('subtitle')}</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">{t('loading')}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
            >
              {t('retry')}
            </button>
          </div>
        )}

        {/* Blocked Users List */}
        {!loading && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            {blockedUsers.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">{t('noBlockedUsers')}</p>
                <Link
                  href="/search"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                >
                  {t('searchUsers')}
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {blockedUsers.map(user => (
                  <li
                    key={user.id}
                    className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Avatar */}
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt={user.nickname}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold">
                            {user.nickname.charAt(0).toUpperCase()}
                          </div>
                        )}

                        {/* User Info */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {user.nickname}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('memberId')}: {user.member_id}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {t('blockedAt')}: {new Date(user.blocked_at).toLocaleString('ja-JP')}
                          </p>
                        </div>
                      </div>

                      {/* Unblock Button */}
                      <button
                        onClick={() => handleUnblock(user.id)}
                        disabled={unblockingIds.has(user.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {unblockingIds.has(user.id) ? (
                          <span className="flex items-center">
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4"
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
                            {t('unblocking')}
                          </span>
                        ) : (
                          t('unblock')
                        )}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            href="/profile/me"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
          >
            {t('backToProfile')}
          </Link>
        </div>
      </div>
    </div>
  );
}
