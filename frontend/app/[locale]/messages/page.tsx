'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
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
import { Trash2, Plus, X, Search } from 'lucide-react';
import { setAuthToken } from '@/lib/api/client';
import { useMessageStream, MessageEvent } from '@/lib/hooks/useMessageStream';
import { useUser } from '@/contexts/UserContext';
import { findOrCreateConversation } from '@/lib/api/messages';
import { searchUsers, UserSearchParams } from '@/lib/api/search';
import { UserPublicProfile } from '@/lib/api/users';

export default function MessagesPage() {
  const { isAuthenticated, isLoading: authLoading, getAccessTokenSilently } = useAuth0();
  const { user: currentUser } = useUser();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('messages');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  
  // New message modal state
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserPublicProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  const CONVERSATIONS_PER_PAGE = 20;
  const conversationsRef = useRef<Conversation[]>([]);
  const currentUserRef = useRef(currentUser);
  const pageRef = useRef(page);
  const loadConversationsRef = useRef<((reset: boolean) => Promise<void>) | null>(null);

  // currentUserとpageの参照を更新
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  // 会話を取得
  const loadConversations = useCallback(async (reset: boolean = false) => {
    try {
      const currentPage = reset ? 0 : pageRef.current;
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

      const response = await getConversations(
        currentPage * CONVERSATIONS_PER_PAGE,
        CONVERSATIONS_PER_PAGE
      );

      if (reset) {
        setConversations(response.conversations);
        conversationsRef.current = response.conversations;
        setPage(0);
        pageRef.current = 0;
      } else {
        const newConversations = [...conversationsRef.current, ...response.conversations];
        setConversations(newConversations);
        conversationsRef.current = newConversations;
      }

      setHasMore(response.conversations.length === CONVERSATIONS_PER_PAGE);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load conversations:', err);
      const errorInfo = extractErrorInfo(err);
      setError(errorInfo);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  // loadConversationsの参照を更新
  useEffect(() => {
    loadConversationsRef.current = loadConversations;
  }, [loadConversations]);

  // リアルタイムメッセージ更新
  const handleNewMessage = useCallback((messageEvent: MessageEvent) => {
    // 会話リストを更新（該当する会話のlast_messageとunread_countを更新）
    setConversations(prev => {
      const conversationIndex = prev.findIndex(conv => conv.id === messageEvent.conversation_id);
      
      // 会話が存在しない場合（新しい会話）、リストを再読み込み
      if (conversationIndex === -1) {
        // 非同期で再読み込み（無限ループを防ぐ）
        setTimeout(() => {
          if (loadConversationsRef.current) {
            loadConversationsRef.current(true);
          }
        }, 100);
        return prev;
      }

      const updated = prev.map(conv => {
        if (conv.id === messageEvent.conversation_id) {
          // 自分のメッセージでない場合は未読数を増やす
          const isOwnMessage = messageEvent.sender_id === currentUserRef.current?.id;
          const newUnreadCount = isOwnMessage 
            ? conv.unread_count 
            : conv.unread_count + 1;

          // 会話情報を更新
          return {
            ...conv,
            last_message_at: messageEvent.created_at,
            last_message: {
              id: messageEvent.id,
              conversation_id: messageEvent.conversation_id,
              sender_id: messageEvent.sender_id,
              content: messageEvent.content,
              image_url: messageEvent.image_url,
              is_deleted: messageEvent.is_deleted,
              created_at: messageEvent.created_at,
              updated_at: messageEvent.updated_at,
              sender: messageEvent.sender,
              is_read: false,
              read_at: null,
            },
            unread_count: newUnreadCount,
          };
        }
        return conv;
      });

      // メッセージが来た会話を先頭に移動
      const messageConversation = updated.find(c => c.id === messageEvent.conversation_id);
      if (messageConversation) {
        const filtered = updated.filter(c => c.id !== messageEvent.conversation_id);
        const result = [messageConversation, ...filtered];
        conversationsRef.current = result;
        return result;
      }

      conversationsRef.current = updated;
      return updated;
    });
  }, []);

  const { isConnected: isMessageStreamConnected } = useMessageStream(handleNewMessage);

  // conversationsの参照を更新
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

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
    
    loadConversations(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  // さらに読み込む
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setPage(page + 1);
    loadConversations(false);
  };

  // 会話を削除
  const handleDeleteConversation = async (conversationId: string) => {
    if (!confirm(t('deleteConversationConfirm'))) {
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

      setDeletingConversationId(conversationId);
      await deleteConversation(conversationId);
      // 削除後、リストから除外
      setConversations(conversations.filter(c => c.id !== conversationId));
    } catch (err: any) {
      console.error('Failed to delete conversation:', err);
      alert(t('errorLoading'));
    } finally {
      setDeletingConversationId(null);
    }
  };

  // 時間表示のフォーマット
  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const dateLocale = locale === 'ja' ? ja : enUS;
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
      setAuthToken(token);

      const params: UserSearchParams = {
        q: searchQuery,
        limit: 20,
      };

      const results = await searchUsers(params, token);
      // Exclude current user
      const filteredResults = results.filter(u => u.id !== currentUser?.id);
      setSearchResults(filteredResults);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = async (user: UserPublicProfile) => {
    setIsCreatingConversation(true);
    try {
      const token = await getAccessTokenSilently();
      setAuthToken(token);

      const conversationId = await findOrCreateConversation(user.id);
      router.push(`/messages/${conversationId}`);
    } catch (err) {
      console.error('Failed to create conversation:', err);
      alert(t('errorCreatingConversation'));
    } finally {
      setIsCreatingConversation(false);
      setShowNewMessageModal(false);
      setSearchQuery('');
      setSearchResults([]);
    }
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
              <p className="text-gray-600 mt-2">{t('conversations')}</p>
            </div>
            <button
              onClick={() => setShowNewMessageModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t('newMessage')}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6">
              <ErrorDisplay
                error={error}
                onRetry={() => loadConversations(true)}
                showDetails={false}
              />
            </div>
          )}

          {/* Conversations list */}
          <div className="bg-white rounded-lg shadow">
            {conversations.length === 0 ? (
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
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  {t('noConversations')}
                </h3>
                <p className="mt-2 text-gray-500">
                  {t('noConversationsMessage')}
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-100">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/messages/${conversation.id}`}
                          className="flex-1 flex items-center gap-4"
                        >
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            {conversation.other_user?.avatar_url ? (
                              <img
                                src={conversation.other_user.avatar_url}
                                alt={conversation.other_user.nickname}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-gray-600 font-medium">
                                  {conversation.other_user?.nickname?.[0]?.toUpperCase() || '?'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Conversation info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-medium text-gray-900 truncate">
                                {conversation.other_user?.nickname || 'Unknown User'}
                              </h3>
                              {conversation.last_message_at && (
                                <span className="text-sm text-gray-500 ml-2">
                                  {formatTime(conversation.last_message_at)}
                                </span>
                              )}
                            </div>
                            {conversation.last_message && (
                              <p className="text-sm text-gray-600 truncate mt-1">
                                {conversation.last_message.is_deleted
                                  ? `(${t('conversation.deletedMessage')})`
                                  : conversation.last_message.content}
                              </p>
                            )}
                            {conversation.unread_count > 0 && (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 mt-1 text-xs font-medium leading-none text-white bg-blue-600 rounded-full">
                                {conversation.unread_count}
                              </span>
                            )}
                          </div>
                        </Link>

                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleDeleteConversation(conversation.id);
                          }}
                          disabled={deletingConversationId === conversation.id}
                          className="ml-4 p-2 text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                          title={t('deleteConversation')}
                        >
                          {deletingConversationId === conversation.id ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="w-5 h-5" />
                          )}
                        </button>
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

                {/* End of conversations message */}
                {!hasMore && conversations.length > 0 && (
                  <div className="text-center py-6 border-t border-gray-200">
                    <p className="text-gray-500">{t('allConversationsShown')}</p>
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
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => {
                setShowNewMessageModal(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
            />

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">{t('newMessage')}</h3>
                  <button
                    onClick={() => {
                      setShowNewMessageModal(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Search input */}
                <div className="mb-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchUsers();
                        }
                      }}
                      placeholder={t('selectUserPlaceholder')}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <button
                    onClick={handleSearchUsers}
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
                      t('selectUser')
                    )}
                  </button>
                </div>

                {/* Search results */}
                {searchResults.length > 0 && (
                  <div className="max-h-96 overflow-y-auto border-t border-gray-200">
                    <div className="py-2">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleSelectUser(user)}
                          disabled={isCreatingConversation}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.nickname}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-gray-600 font-medium">
                                {user.nickname?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-gray-900">{user.nickname}</p>
                            {user.username && (
                              <p className="text-xs text-gray-500">@{user.username}</p>
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

                {searchQuery && searchResults.length === 0 && !isSearching && (
                  <div className="text-center py-8 text-gray-500">
                    <p>{t('noUserSelected')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

