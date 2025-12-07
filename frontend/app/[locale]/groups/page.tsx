'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useRouter } from '@/i18n/routing';
import { Link } from '@/i18n/routing';
import Header from '@/components/Header';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { extractErrorInfo } from '@/lib/utils/errorHandler';
import {
  getGroups,
  searchGroups,
  deleteGroup,
  Group,
} from '@/lib/api/groups';
import { formatDistanceToNow } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { getUserTimezone } from '@/lib/utils/timezone';
import { Trash2, Plus, Search, Users } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useDataLoader } from '@/lib/hooks/useDataLoader';

export default function GroupsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth0();
  const { user: currentUser } = useUser();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('groups');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Unified data loader for groups
  const {
    items: groups,
    isLoading,
    isLoadingMore,
    isRefreshing,
    error,
    hasMore,
    load,
    loadMore,
    refresh,
    retry,
    clearError,
  } = useDataLoader<Group>({
    loadFn: useCallback(async (skip, limit) => {
      let response;
      if (searchQuery.trim()) {
        response = await searchGroups(searchQuery, skip, limit);
      } else {
        response = await getGroups(skip, limit);
      }
      return {
        items: response.groups,
        total: response.total,
      };
    }, [searchQuery]),
    pageSize: 20,
    autoLoad: true,
    requireAuth: true,
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000,
      autoRetry: true,
    },
    cacheConfig: {
      enabled: true,
      ttl: 5 * 60 * 1000, // 5 minutes
    },
  });

  // Reload when search query changes (with debounce)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search queries
    searchTimeoutRef.current = setTimeout(() => {
      load(true);
    }, 500); // 500ms debounce for search

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, authLoading, isAuthenticated, load]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !isRedirecting) {
      setIsRedirecting(true);
      router.push('/');
    }
  }, [authLoading, isAuthenticated, isRedirecting, router]);

  // 検索ハンドラー（デバウンス処理付き）
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    // useEffectで自動的に再読み込みされる
  };

  // グループを削除
  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm(t('deleteGroupConfirm'))) {
      return;
    }

    setDeletingGroupId(groupId);
    setDeletingGroupId(groupId);
    try {
      await deleteGroup(groupId);
      // Refresh list to remove deleted group
      await refresh();
    } catch (err: any) {
      console.error('Failed to delete group:', err);
      alert(t('errorDeletingGroup') || t('errorLoading'));
    } finally {
      setDeletingGroupId(null);
    }
  };

  // 時間表示のフォーマット（ユーザーのタイムゾーンを使用）
  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const userTimezone = currentUser ? getUserTimezone(currentUser.timezone, currentUser.country) : 'UTC';
    const date = new Date(dateString);
    const dateLocale = locale === 'ja' ? ja : enUS;
    return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale });
  };

  // Full page loading only for initial auth or redirect
  if ((authLoading && !isAuthenticated) || isRedirecting) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">{t('groups')}</p>
            </div>
            <Link
              href="/groups/new"
              className="inline-flex items-center justify-center px-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-0.5" />
              {t('createGroup')}
            </Link>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={t('searchPlaceholder') || 'Search groups...'}
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
          </div>

          {/* Error message - shown even when data exists (optimistic UI) */}
          {error && (
            <div className="mb-6">
              <ErrorDisplay
                error={error}
                onRetry={retry}
                showDetails={false}
              />
            </div>
          )}

          {/* Groups list */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Show refresh indicator if refreshing */}
            {isRefreshing && (
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900">
                <div className="flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <div className="w-4 h-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mr-2" />
                  <span className="text-sm">{t('refreshing') || '更新中...'}</span>
                </div>
              </div>
            )}

            {/* Loading state - only show spinner if no data exists */}
            {isLoading && groups.length === 0 ? (
              <div className="p-12 text-center">
                <div className="flex justify-center items-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="mt-4 text-gray-500 dark:text-gray-400">{t('loading') || '読み込み中...'}</p>
              </div>
            ) : groups.length === 0 ? (
              <div className="p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                  {t('noGroups')}
                </h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  {t('noGroupsMessage')}
                </p>
                <Link
                  href="/groups/new"
                  className="mt-4 inline-flex items-center px-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-0.5" />
                  {t('createGroup')}
                </Link>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/groups/${group.id}`}
                          className="flex-1 flex items-center gap-4"
                        >
                          {/* Group icon */}
                          <div className="flex-shrink-0 relative w-12 h-12">
                            {group.avatar_url ? (
                              <Image
                                src={group.avatar_url}
                                alt={group.name}
                                width={48}
                                height={48}
                                className="rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                              </div>
                            )}
                          </div>

                          {/* Group info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                                {group.name}
                              </h3>
                              {group.last_message_at && (
                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                  {formatTime(group.last_message_at)}
                                </span>
                              )}
                            </div>
                            {group.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                                {group.description}
                              </p>
                            )}
                            {group.last_message && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                                {group.last_message.is_deleted
                                  ? `(${t('deletedMessage')})`
                                  : `${group.last_message.sender?.nickname || 'Unknown'}: ${group.last_message.content}`}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {group.member_count} {t('members')}
                              </span>
                              {group.unread_count > 0 && (
                                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium leading-none text-white bg-blue-600 dark:bg-blue-500 rounded-full">
                                  {group.unread_count}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>

                        {/* Delete button (only for creator or admin) */}
                        {(group.creator_id === currentUser?.id ||
                          group.members.find(m => m.user_id === currentUser?.id && m.is_admin)) && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteGroup(group.id);
                              }}
                              disabled={deletingGroupId === group.id}
                              className="ml-4 p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 transition-colors"
                              title={t('deleteGroup')}
                            >
                              {deletingGroupId === group.id ? (
                                <div className="w-5 h-5 border-4 border-red-600 dark:border-red-400 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Trash2 className="w-5 h-5" />
                              )}
                            </button>
                          )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Load more button */}
                {hasMore && (
                  <div className="flex justify-center p-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      className={`px-6 py-3 rounded-lg font-medium transition-colors ${isLoadingMore
                        ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                        }`}
                    >
                      {isLoadingMore ? (
                        <span className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
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
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          {t('loading')}
                        </span>
                      ) : (
                        t('loadMore')
                      )}
                    </button>
                  </div>
                )}

                {/* End of groups message */}
                {!hasMore && groups.length > 0 && (
                  <div className="text-center py-6 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">{t('allGroupsShown')}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}



