'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useRouter } from '@/i18n/routing';
import { Link } from '@/i18n/routing';
import Header from '@/components/Header';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { extractErrorInfo } from '@/lib/utils/errorHandler';
import {
  getConversations,
  deleteConversation,
  Conversation,
} from '@/lib/api/messages';
import { formatDistanceToNow } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { getUserTimezone } from '@/lib/utils/timezone';
import { Trash2, Plus, X, Search, Users, Settings } from 'lucide-react';
import { useMessageStream, MessageEvent } from '@/lib/hooks/useMessageStream';
import { useUser } from '@/contexts/UserContext';
import { findOrCreateConversation } from '@/lib/api/messages';
import { searchUsers, UserSearchParams } from '@/lib/api/search';
import { UserPublicProfile } from '@/lib/api/users';
import { useDataLoader } from '@/lib/hooks/useDataLoader';
import { searchGroups, Group, getGroups } from '@/lib/api/groups';
import { debugLog } from '@/lib/utils/debug';
import dynamic from 'next/dynamic';

// Dynamically import GroupSettingsModal to reduce initial bundle size
const GroupSettingsModal = dynamic(() => import('@/components/GroupSettingsModal'), {
  loading: () => null,
  ssr: false,
});

export default function MessagesPage() {
  const { isAuthenticated, isLoading: authLoading, getAccessTokenSilently } = useAuth0();
  const { user: currentUser } = useUser();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('messages');
  
  // Unified type for conversations and groups
  type ConversationOrGroup = 
    | (Conversation & { type: 'conversation' })
    | (Group & { type: 'group' });

  // Unified data loader for conversations and groups
  const {
    items: allItems,
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
  } = useDataLoader<ConversationOrGroup>({
    loadFn: async (skip, limit) => {
      // Fetch conversations and groups in parallel
      // For pagination, we fetch half from each
      const conversationsSkip = Math.floor(skip / 2);
      const groupsSkip = Math.floor(skip / 2);
      const conversationsLimit = Math.ceil(limit / 2);
      const groupsLimit = Math.ceil(limit / 2);

      const [conversationsResponse, groupsResponse] = await Promise.all([
        getConversations(conversationsSkip, conversationsLimit),
        getGroups(groupsSkip, groupsLimit),
      ]);

      // Mark items with their type
      const conversations = conversationsResponse.conversations.map(conv => ({ ...conv, type: 'conversation' as const }));
      const groups = groupsResponse.groups.map(group => ({ ...group, type: 'group' as const }));

      // Combine and sort by last_message_at (most recent first)
      const combined = [...conversations, ...groups].sort((a, b) => {
        const aTime = a.type === 'conversation' ? a.last_message_at : a.last_message_at;
        const bTime = b.type === 'conversation' ? b.last_message_at : b.last_message_at;
        if (!aTime && !bTime) return 0;
        if (!aTime) return 1;
        if (!bTime) return -1;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      // Take only the requested number of items
      const paginated = combined.slice(0, limit);

      return {
        items: paginated,
        total: conversationsResponse.total + groupsResponse.total,
      };
    },
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
  
  // Separate conversations and groups for easier access (for filtering)
  const conversations = allItems.filter((item): item is Conversation & { type: 'conversation' } => item.type === 'conversation');
  const groups = allItems.filter((item): item is Group & { type: 'group' } => item.type === 'group');
  
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  
  // New message modal state
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [modalTab, setModalTab] = useState<'user' | 'group'>('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserPublicProfile[]>([]);
  const [modalGroupSearchResults, setModalGroupSearchResults] = useState<Group[]>([]);
  const [userGroupsList, setUserGroupsList] = useState<Group[]>([]);
  const [isLoadingUserGroups, setIsLoadingUserGroups] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  
  // Search for users and groups (extended search)
  const [searchUsersAndGroupsQuery, setSearchUsersAndGroupsQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserPublicProfile[]>([]);
  const [groupSearchResults, setGroupSearchResults] = useState<Group[]>([]);
  const [isSearchingUsersAndGroups, setIsSearchingUsersAndGroups] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const conversationsRef = useRef<ConversationOrGroup[]>([]);
  const currentUserRef = useRef(currentUser);

  // Update refs
  useEffect(() => {
    conversationsRef.current = allItems;
  }, [allItems]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Load user's groups function
  const loadUserGroups = useCallback(async () => {
    setIsLoadingUserGroups(true);
    try {
      const groupsResponse = await getGroups(0, 50);
      setUserGroupsList(groupsResponse.groups || []);
    } catch (err) {
      debugLog.error('Failed to load user groups:', err);
      setUserGroupsList([]);
    } finally {
      setIsLoadingUserGroups(false);
    }
  }, []);

  // Load user's groups when group tab is selected
  useEffect(() => {
    if (showNewMessageModal && modalTab === 'group' && !searchQuery.trim()) {
      loadUserGroups();
    } else if (!showNewMessageModal || modalTab !== 'group') {
      // Clear groups list when modal is closed or tab changes
      setUserGroupsList([]);
    }
  }, [showNewMessageModal, modalTab, searchQuery, loadUserGroups]);

  // リアルタイムメッセージ更新（会話とグループの両方に対応）
  const handleNewMessage = useCallback((messageEvent: MessageEvent) => {
    // 会話リストを更新（該当する会話のlast_messageとunread_countを更新）
    // Note: useDataLoader manages allItems state, so we need to update it directly
    // For now, refresh the list to get the latest data
    const itemIndex = conversationsRef.current.findIndex(item => 
      (item.type === 'conversation' && item.id === messageEvent.conversation_id) ||
      (item.type === 'group' && 'group_id' in messageEvent && item.id === messageEvent.group_id)
    );
    
    // アイテムが存在しない場合（新しい会話/グループ）、リストを再読み込み
    if (itemIndex === -1) {
      // 非同期で再読み込み（無限ループを防ぐ）
      setTimeout(() => {
        refresh();
      }, 100);
      return;
    }

    // Note: For real-time updates, we refresh the list to get the latest data
    // This ensures consistency with the backend state
    refresh();
  }, [refresh]);

  useMessageStream(handleNewMessage, isAuthenticated);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !isRedirecting) {
      setIsRedirecting(true);
      router.push('/');
    }
  }, [authLoading, isAuthenticated, isRedirecting, router]);

  // 会話を削除
  const handleDeleteConversation = async (conversationId: string) => {
    if (!confirm(t('deleteConversationConfirm') || t('confirmDeleteConversation'))) {
      return;
    }

    setDeletingConversationId(conversationId);
    
    try {
      await deleteConversation(conversationId);
      // Refresh list to remove deleted conversation
      await refresh();
    } catch (err: any) {
      debugLog.error('Failed to delete conversation:', err);
      alert(t('errorLoading') || t('errorDeletingConversation'));
    } finally {
      setDeletingConversationId(null);
    }
  };

  // 時間表示のフォーマット（ユーザーのタイムゾーンを使用）
  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const userTimezone = currentUser ? getUserTimezone(currentUser.timezone, currentUser.country) : 'UTC';
    const date = new Date(dateString);
    const dateLocale = locale === 'ja' ? ja : enUS;
    
    // Use Intl.DateTimeFormat to format in user's timezone for relative time calculation
    // formatDistanceToNow already handles relative time, but we need to ensure it's calculated correctly
    return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale });
  };

  // Handle new message modal
  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const token = await getAccessTokenSilently();
      const params: UserSearchParams = {
        q: searchQuery,
        limit: 20,
      };

      const results = await searchUsers(params, token);

      // Exclude current user
      const filteredResults = results.filter(u => u.id !== currentUser?.id);
      setSearchResults(filteredResults);
    } catch (err) {
      debugLog.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchGroups = async () => {
    if (!searchQuery.trim()) {
      setModalGroupSearchResults([]);
      // Reload user's groups when search is cleared
      if (modalTab === 'group') {
        loadUserGroups();
      }
      return;
    }

    setIsSearching(true);
    try {
      const token = await getAccessTokenSilently();
      const results = await searchGroups(searchQuery, 0, 20);
      setModalGroupSearchResults(results.groups || []);
    } catch (err) {
      debugLog.error('Search error:', err);
      setModalGroupSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = async (user: UserPublicProfile) => {
    setIsCreatingConversation(true);
    try {
      const conversationId = await findOrCreateConversation(user.id);
      if (conversationId) {
        router.push(`/messages/${conversationId}`);
      }
    } catch (err) {
      debugLog.error('Failed to create conversation:', err);
      alert(t('errorCreatingConversation'));
    } finally {
      setIsCreatingConversation(false);
      setShowNewMessageModal(false);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  // Search for users and groups
  const handleSearchUsersAndGroups = async (query: string) => {
    if (!query.trim()) {
      setShowSearchResults(false);
      setUserSearchResults([]);
      setGroupSearchResults([]);
      return;
    }

    setIsSearchingUsersAndGroups(true);
    setShowSearchResults(true);
    
    try {
      const token = await getAccessTokenSilently();
      
      // Search users and groups in parallel
      const [users, groups] = await Promise.all([
        searchUsers({ q: query, limit: 5 }, token).catch(() => []),
        searchGroups(query, 0, 5).catch(() => ({ groups: [], total: 0 })),
      ]);

      // Filter out current user from results
      const filteredUsers = Array.isArray(users) 
        ? users.filter((u: UserPublicProfile) => u.id !== currentUser?.id)
        : [];
      
      setUserSearchResults(filteredUsers);
      setGroupSearchResults(Array.isArray(groups) ? groups : groups.groups || []);
    } catch (err) {
      debugLog.error('Search error:', err);
      setUserSearchResults([]);
      setGroupSearchResults([]);
    } finally {
      setIsSearchingUsersAndGroups(false);
    }
  };

  // 認証チェック中またはリダイレクト中のみページ全体をローディング
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
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">{t('conversations')}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/groups/new')}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                {t('createGroup')}
              </button>
              <button
                onClick={() => setShowNewMessageModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                {t('newMessage')}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6">
              <ErrorDisplay
                error={error}
                onRetry={retry}
                showDetails={true}
              />
            </div>
          )}

          {/* Extended search for users and groups */}
          {(!isLoading || allItems.length > 0) && (
            <div className="mb-4 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchUsersAndGroupsQuery}
                  onChange={(e) => {
                    const query = e.target.value;
                    setSearchUsersAndGroupsQuery(query);
                    if (query.trim()) {
                      handleSearchUsersAndGroups(query);
                    } else {
                      setShowSearchResults(false);
                      setUserSearchResults([]);
                      setGroupSearchResults([]);
                    }
                  }}
                  onFocus={() => {
                    if (searchUsersAndGroupsQuery.trim()) {
                      setShowSearchResults(true);
                    }
                  }}
                  placeholder={t('searchUsersAndGroups')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                />
                {searchUsersAndGroupsQuery && (
                  <button
                    onClick={() => {
                      setSearchUsersAndGroupsQuery('');
                      setShowSearchResults(false);
                      setUserSearchResults([]);
                      setGroupSearchResults([]);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              {/* Search results dropdown */}
              {showSearchResults && (userSearchResults.length > 0 || groupSearchResults.length > 0) && (
                <div className="absolute z-10 mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
                  {userSearchResults.length > 0 && (
                    <div className="p-2">
                      <div className="px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                        {t('users')}
                      </div>
                      {userSearchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={async () => {
                            try {
                              const conversationId = await findOrCreateConversation(user.id);
                              if (conversationId) {
                                router.push(`/messages/${conversationId}`);
                                setSearchUsersAndGroupsQuery('');
                                setShowSearchResults(false);
                              }
                            } catch (err) {
                              debugLog.error('Failed to create conversation:', err);
                            }
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          {user.avatar_url ? (
                            <Image
                              src={user.avatar_url}
                              alt={user.nickname}
                              width={32}
                              height={32}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                              <span className="text-gray-600 dark:text-gray-300 text-xs font-medium">
                                {user.nickname?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.nickname}</p>
                            {user.username && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">@{user.username}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {groupSearchResults.length > 0 && (
                    <div className="p-2">
                      <div className="px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                        {t('groups')}
                      </div>
                      {groupSearchResults.map((group) => (
                        <button
                          key={group.id}
                          onClick={() => {
                            router.push(`/groups/${group.id}`);
                            setSearchUsersAndGroupsQuery('');
                            setShowSearchResults(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <span className="text-blue-600 dark:text-blue-300 text-xs font-medium">
                              {group.name[0]?.toUpperCase() || 'G'}
                            </span>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{group.name}</p>
                            {group.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{group.description}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Conversations and Groups list */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* ローディング状態 */}
            {isLoading && allItems.length === 0 ? (
              <div className="p-12 text-center">
                <div className="flex justify-center items-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="mt-4 text-gray-500 dark:text-gray-400">{t('loading') || '読み込み中...'}</p>
              </div>
            ) : allItems.length === 0 ? (
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
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                  {t('noConversations')}
                </h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  {t('noConversationsMessage')}
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {allItems.map((item) => {
                        if (item.type === 'conversation') {
                          return (
                            <div
                              key={item.id}
                              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 flex items-center gap-4">
                                  {/* Avatar - Clickable to profile */}
                                  {item.other_user ? (
                                <Link
                                      href={`/profile/${item.other_user.id}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex-shrink-0 relative w-12 h-12 hover:opacity-80 transition-opacity"
                                >
                                      {item.other_user.avatar_url ? (
                                      <Image
                                        src={item.other_user.avatar_url}
                                        alt={item.other_user.nickname}
                                        width={48}
                                        height={48}
                                          className="rounded-full object-cover cursor-pointer"
                                      />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center cursor-pointer">
                                        <span className="text-gray-600 dark:text-gray-300 font-medium">
                                            {item.other_user.nickname?.[0]?.toUpperCase() || '?'}
                                        </span>
                                      </div>
                                    )}
                                    </Link>
                                  ) : (
                                    <div className="flex-shrink-0 relative w-12 h-12">
                                      <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                        <span className="text-gray-600 dark:text-gray-300 font-medium">?</span>
                                  </div>
                                    </div>
                                  )}

                                  {/* Conversation info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      {/* Nickname - Clickable to profile */}
                                      {item.other_user ? (
                                        <Link
                                          href={`/profile/${item.other_user.id}`}
                                          onClick={(e) => e.stopPropagation()}
                                          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                        >
                                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate cursor-pointer">
                                            {item.other_user.nickname || 'Unknown User'}
                                          </h3>
                                        </Link>
                                      ) : (
                                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                                          Unknown User
                                      </h3>
                                      )}
                                      {item.last_message_at && (
                                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                          {formatTime(item.last_message_at)}
                                        </span>
                                      )}
                                    </div>
                                    {/* Message content - Clickable to conversation */}
                                    <Link
                                      href={`/messages/${item.id}`}
                                      className="block"
                                    >
                                    {item.last_message && (
                                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                                        {item.last_message.is_deleted
                                          ? `(${t('conversation.deletedMessage')})`
                                          : item.last_message.content}
                                      </p>
                                    )}
                                    {item.unread_count > 0 && (
                                      <span className="inline-flex items-center justify-center px-2 py-0.5 mt-1 text-xs font-medium leading-none text-white bg-blue-600 rounded-full">
                                        {item.unread_count}
                                      </span>
                                    )}
                                </Link>
                                  </div>
                                </div>

                                {/* Delete button */}
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleDeleteConversation(item.id);
                                  }}
                                  disabled={deletingConversationId === item.id}
                                  className="ml-4 p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 transition-colors"
                                  title={t('deleteConversation')}
                                >
                                  {deletingConversationId === item.id ? (
                                    <div className="w-5 h-5 border-4 border-red-600 dark:border-red-400 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <Trash2 className="w-5 h-5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        } else {
                          // Group
                          return (
                            <div
                              key={item.id}
                              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <Link
                                  href={`/groups/${item.id}`}
                                  className="flex-1 flex items-center gap-4"
                                >
                                  {/* Group icon */}
                                  <div className="flex-shrink-0 relative w-12 h-12">
                                    {item.avatar_url ? (
                                      <Image
                                        src={item.avatar_url}
                                        alt={item.name}
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
                                        {item.name}
                                      </h3>
                                      {item.last_message_at && (
                                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                          {formatTime(item.last_message_at)}
                                        </span>
                                      )}
                                    </div>
                                    {item.last_message && (
                                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                                        {item.last_message.is_deleted
                                          ? `(${t('conversation.deletedMessage')})`
                                          : item.last_message.content}
                                      </p>
                                    )}
                                    {item.unread_count > 0 && (
                                      <span className="inline-flex items-center justify-center px-2 py-0.5 mt-1 text-xs font-medium leading-none text-white bg-blue-600 rounded-full">
                                        {item.unread_count}
                                      </span>
                                    )}
                                  </div>
                                </Link>

                                {/* Edit group button */}
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditingGroup(item);
                                    setEditingGroupId(item.id);
                                  }}
                                  className="ml-4 p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                  title={t('editGroup') || 'Edit Group'}
                                >
                                  <Settings className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          );
                        }
                      })}
                </div>

                {/* Load more button */}
                {hasMore && (
                  <div className="flex justify-center p-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                        isLoadingMore
                          ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
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

                {/* End of conversations and groups message */}
                {!hasMore && allItems.length > 0 && (
                  <div className="text-center py-6 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">{t('allConversationsShown')}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* New Message Modal */}
      {showNewMessageModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 transition-opacity"
              onClick={() => {
                setShowNewMessageModal(false);
                setSearchQuery('');
                setSearchResults([]);
                setModalGroupSearchResults([]);
                setUserGroupsList([]);
              }}
            />

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{t('selectUserOrGroup')}</h3>
                  <button
                    onClick={() => {
                      setShowNewMessageModal(false);
                      setSearchQuery('');
                      setSearchResults([]);
                      setModalGroupSearchResults([]);
                      setUserGroupsList([]);
                      setModalTab('user');
                    }}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Tab selection */}
                <div className="mb-4 flex border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setModalTab('user');
                      setSearchQuery('');
                      setSearchResults([]);
                      setUserGroupsList([]);
                    }}
                    className={`flex-1 px-4 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
                      modalTab === 'user'
                        ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {t('tabUser')}
                  </button>
                  <button
                    onClick={() => {
                      setModalTab('group');
                      setSearchQuery('');
                      setModalGroupSearchResults([]);
                      // Load user's groups when switching to group tab
                      if (!searchQuery.trim()) {
                        loadUserGroups();
                      }
                    }}
                    className={`flex-1 px-4 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
                      modalTab === 'group'
                        ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {t('tabGroup')}
                  </button>
                </div>

                {/* Search input */}
                <div className="mb-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        const query = e.target.value;
                        setSearchQuery(query);
                        // Clear user groups list when starting to search
                        if (modalTab === 'group' && query.trim()) {
                          setUserGroupsList([]);
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (modalTab === 'user') {
                            handleSearchUsers();
                          } else {
                            handleSearchGroups();
                          }
                        }
                      }}
                      placeholder={modalTab === 'user' ? t('selectUserPlaceholder') : t('selectGroupPlaceholder')}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (modalTab === 'user') {
                        handleSearchUsers();
                      } else {
                        handleSearchGroups();
                      }
                    }}
                    disabled={isSearching || !searchQuery.trim()}
                    className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSearching ? (
                      <div className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4"
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
                      </div>
                    ) : (
                      modalTab === 'user' ? t('selectUser') : t('selectGroup')
                    )}
                  </button>
                  
                  {/* Create group button (only in group tab) */}
                  {modalTab === 'group' && (
                    <button
                      onClick={() => {
                        setShowNewMessageModal(false);
                        router.push('/groups/new');
                      }}
                      className="mt-2 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {t('createGroup')}
                    </button>
                  )}
                </div>

                {/* Search results */}
                {modalTab === 'user' && searchResults.length > 0 && (
                  <div className="max-h-96 overflow-y-auto border-t border-gray-200 dark:border-gray-700">
                    <div className="py-2">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleSelectUser(user)}
                          disabled={isCreatingConversation}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {user.avatar_url ? (
                            <Image
                              src={user.avatar_url}
                              alt={user.nickname}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                              <span className="text-gray-600 dark:text-gray-300 font-medium">
                                {user.nickname?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.nickname}</p>
                            {user.username && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">@{user.username}</p>
                            )}
                          </div>
                          {isCreatingConversation && (
                            <svg
                              className="animate-spin h-5 w-5 text-blue-600"
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
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* User's groups list (shown when group tab is selected and not searching) */}
                {modalTab === 'group' && !searchQuery.trim() && (
                  <div className="max-h-96 overflow-y-auto border-t border-gray-200 dark:border-gray-700">
                    {isLoadingUserGroups ? (
                      <div className="py-8 text-center">
                        <div className="flex justify-center items-center">
                          <svg
                            className="animate-spin h-6 w-6 text-blue-600"
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
                        </div>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('loading')}</p>
                      </div>
                    ) : userGroupsList.length > 0 ? (
                      <div className="py-2">
                        <div className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                          {t('groups')}
                        </div>
                        {userGroupsList.map((group) => (
                          <button
                            key={group.id}
                            onClick={() => {
                              router.push(`/groups/${group.id}`);
                              setShowNewMessageModal(false);
                              setSearchQuery('');
                              setModalGroupSearchResults([]);
                              setUserGroupsList([]);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            {group.avatar_url ? (
                              <Image
                                src={group.avatar_url}
                                alt={group.name}
                                width={40}
                                height={40}
                                className="rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                <span className="text-blue-600 dark:text-blue-300 font-medium">
                                  {group.name[0]?.toUpperCase() || 'G'}
                                </span>
                              </div>
                            )}
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{group.name}</p>
                              {group.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{group.description}</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                        <p className="text-sm">{t('noGroupsFound')}</p>
                        <p className="text-xs mt-1">{t('createGroup')}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Group search results */}
                {modalTab === 'group' && searchQuery.trim() && modalGroupSearchResults.length > 0 && (
                  <div className="max-h-96 overflow-y-auto border-t border-gray-200 dark:border-gray-700">
                    <div className="py-2">
                      <div className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                        {t('searchResults')}
                      </div>
                      {modalGroupSearchResults.map((group) => (
                        <button
                          key={group.id}
                          onClick={() => {
                            router.push(`/groups/${group.id}`);
                            setShowNewMessageModal(false);
                            setSearchQuery('');
                            setModalGroupSearchResults([]);
                            setUserGroupsList([]);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          {group.avatar_url ? (
                            <Image
                              src={group.avatar_url}
                              alt={group.name}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                              <span className="text-blue-600 dark:text-blue-300 font-medium">
                                {group.name[0]?.toUpperCase() || 'G'}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{group.name}</p>
                            {group.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{group.description}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {searchQuery && modalTab === 'user' && searchResults.length === 0 && !isSearching && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>{t('noUsersFound')}</p>
                  </div>
                )}

                {searchQuery && modalTab === 'group' && modalGroupSearchResults.length === 0 && !isSearching && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm">{t('noGroupsFound')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Settings Modal */}
      {editingGroup && (
        <GroupSettingsModal
          group={editingGroup}
          isOpen={!!editingGroupId}
          onClose={() => {
            setEditingGroupId(null);
            setEditingGroup(null);
          }}
          onUpdate={async () => {
            // Refresh the groups list
            await refresh();
            setEditingGroupId(null);
            setEditingGroup(null);
          }}
        />
      )}
    </>
  );
}

