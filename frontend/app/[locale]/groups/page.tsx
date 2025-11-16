'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Link } from '@/i18n/routing';
import Header from '@/components/Header';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { extractErrorInfo } from '@/lib/utils/errorHandler';
import {
  getGroups,
  deleteGroup,
  Group,
} from '@/lib/api/groups';
import { formatDistanceToNow } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { Trash2, Plus } from 'lucide-react';
import { setAuthToken } from '@/lib/api/client';
import { useUser } from '@/contexts/UserContext';

export default function GroupsPage() {
  const { isAuthenticated, isLoading: authLoading, getAccessTokenSilently } = useAuth0();
  const { user: currentUser } = useUser();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('groups');
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  const GROUPS_PER_PAGE = 20;

  // グループを取得
  const loadGroups = async (reset: boolean = false) => {
    try {
      const currentPage = reset ? 0 : page;
      setIsLoading(reset);
      setIsLoadingMore(!reset);

      // 認証トークンを設定
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          setAuthToken(token);
        } catch (tokenError) {
          console.warn('Failed to get access token:', tokenError);
          setAuthToken(null);
        }
      } else {
        setAuthToken(null);
      }

      const response = await getGroups(
        currentPage * GROUPS_PER_PAGE,
        GROUPS_PER_PAGE
      );

      if (reset) {
        setGroups(response.groups);
        setPage(0);
      } else {
        setGroups([...groups, ...response.groups]);
      }

      setHasMore(response.groups.length === GROUPS_PER_PAGE);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load groups:', err);
      const errorInfo = extractErrorInfo(err);
      setError(errorInfo);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // 認証チェックと初期読み込み
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      // 未認証の場合はホームにリダイレクト
      if (!isRedirecting) {
        setIsRedirecting(true);
        router.push('/');
      }
      return;
    }
    
    loadGroups(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  // さらに読み込む
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setPage(page + 1);
    loadGroups(false);
  };

  // グループを削除
  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm(t('deleteGroupConfirm'))) {
      return;
    }

    try {
      // 認証トークンを設定
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          setAuthToken(token);
        } catch (tokenError) {
          console.warn('Failed to get access token:', tokenError);
          setAuthToken(null);
        }
      }

      setDeletingGroupId(groupId);
      await deleteGroup(groupId);
      // 削除後、リストから除外
      setGroups(groups.filter(g => g.id !== groupId));
    } catch (err: any) {
      console.error('Failed to delete group:', err);
      alert(t('errorLoading'));
    } finally {
      setDeletingGroupId(null);
    }
  };

  // 時間表示のフォーマット
  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const dateLocale = locale === 'ja' ? ja : enUS;
    return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale });
  };

  if (authLoading || isLoading || isRedirecting) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
              <p className="text-gray-600 mt-2">{t('groups')}</p>
            </div>
            <Link
              href="/groups/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t('createGroup')}
            </Link>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6">
              <ErrorDisplay
                error={error}
                onRetry={() => loadGroups(true)}
                showDetails={false}
              />
            </div>
          )}

          {/* Groups list */}
          <div className="bg-white rounded-lg shadow">
            {groups.length === 0 ? (
              <div className="p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
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
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  {t('noGroups')}
                </h3>
                <p className="mt-2 text-gray-500">
                  {t('noGroupsMessage')}
                </p>
                <Link
                  href="/groups/new"
                  className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {t('createGroup')}
                </Link>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-100">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/groups/${group.id}`}
                          className="flex-1 flex items-center gap-4"
                        >
                          {/* Group icon */}
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-bold text-lg">
                                {group.name[0]?.toUpperCase() || 'G'}
                              </span>
                            </div>
                          </div>

                          {/* Group info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-medium text-gray-900 truncate">
                                {group.name}
                              </h3>
                              {group.last_message_at && (
                                <span className="text-sm text-gray-500 ml-2">
                                  {formatTime(group.last_message_at)}
                                </span>
                              )}
                            </div>
                            {group.description && (
                              <p className="text-sm text-gray-600 truncate mt-1">
                                {group.description}
                              </p>
                            )}
                            {group.last_message && (
                              <p className="text-sm text-gray-600 truncate mt-1">
                                {group.last_message.is_deleted
                                  ? `(${t('deletedMessage')})`
                                  : `${group.last_message.sender?.nickname || 'Unknown'}: ${group.last_message.content}`}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-gray-500">
                                {group.member_count} {t('members')}
                              </span>
                              {group.unread_count > 0 && (
                                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium leading-none text-white bg-blue-600 rounded-full">
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
                            className="ml-4 p-2 text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                            title={t('deleteGroup')}
                          >
                            {deletingGroupId === group.id ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
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
                  <div className="flex justify-center p-6 border-t border-gray-200">
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                        isLoadingMore
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      {isLoadingMore ? (
                        <span className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500"
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
                  <div className="text-center py-6 border-t border-gray-200">
                    <p className="text-gray-500">{t('allGroupsShown')}</p>
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

