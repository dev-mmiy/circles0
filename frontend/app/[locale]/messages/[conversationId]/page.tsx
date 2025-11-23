'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useParams as useNextParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { Link } from '@/i18n/routing';
import Header from '@/components/Header';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { extractErrorInfo } from '@/lib/utils/errorHandler';
import { useUser } from '@/contexts/UserContext';
import {
  getConversation,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  deleteMessage,
  Message,
  Conversation,
  CreateMessageData,
} from '@/lib/api/messages';
import { formatDistanceToNow } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { formatDateInTimezone, formatRelativeTime, getUserTimezone } from '@/lib/utils/timezone';
import { ArrowLeft, Trash2, Send, Search, X } from 'lucide-react';
import { useMessageStream, MessageEvent } from '@/lib/hooks/useMessageStream';
import { useAuthWithLoader } from '@/lib/hooks/useAuthWithLoader';

export default function ConversationPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth0();
  const { user: currentUser } = useUser();
  const router = useRouter();
  const params = useNextParams();
  const locale = useLocale();
  const conversationId = params.conversationId as string;
  const t = useTranslations('messages');
  const tConv = useTranslations('messages.conversation');
  
  // 認証とローディング管理の共通フック
  const {
    isLoading,
    isLoadingMore,
    error,
    setError,
    isMountedRef,
    executeWithLoading,
    clearError,
  } = useAuthWithLoader({
    requireAuth: true,
    authTimeout: 5000,
  });
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  // 初期ローディング状態を管理（認証が完了するまでtrue）
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Message form state
  const [messageContent, setMessageContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  
  // Message search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const MESSAGES_PER_PAGE = 50;

  // スクロールを最下部に移動
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 会話を取得
  const loadConversation = async () => {
    debugLog.log('[ConversationPage] loadConversation called', { conversationId });
    
    if (!isMountedRef.current) {
      debugLog.log('[ConversationPage] Not mounted, returning');
      return null;
    }

    try {
      const conv = await executeWithLoading(
        () => getConversation(conversationId),
        { reset: false, skipLoadingState: true }
      );
      
      debugLog.log('[ConversationPage] loadConversation response', { conversation: !!conv, isMounted: isMountedRef.current });
      
      if (conv && isMountedRef.current) {
        setConversation(conv);
        clearError();
      }
      return conv;
    } catch (err) {
      debugLog.error('[ConversationPage] loadConversation error:', err);
      return null;
    }
  };

  const loadMessages = async (reset: boolean = false, skipLoadingState: boolean = false) => {
    debugLog.log('[ConversationPage] loadMessages called', { reset, skipLoadingState, conversationId });
    
    if (!isMountedRef.current) {
      debugLog.log('[ConversationPage] Not mounted, returning');
      return;
    }

    const currentPage = reset ? 0 : page;
    
    try {
      const response = await executeWithLoading(
        () => getMessages(
          conversationId,
          currentPage * MESSAGES_PER_PAGE,
          MESSAGES_PER_PAGE,
          searchQuery || undefined
        ),
        { reset, skipLoadingState }
      );

      debugLog.log('[ConversationPage] loadMessages response', { 
        response: !!response, 
        messagesCount: response?.messages?.length, 
        isMounted: isMountedRef.current,
        responseType: typeof response,
        responseKeys: response ? Object.keys(response) : null,
      });

      if (!response) {
        debugLog.warn('[ConversationPage] No response received from executeWithLoading');
        // エラーが発生した場合でもinitialLoadingを解除する
        if (reset) {
          setInitialLoading(false);
        }
        return;
      }

      if (!isMountedRef.current) {
        debugLog.log('[ConversationPage] Not mounted, returning');
        return;
      }

      if (reset) {
        setMessages(response.messages);
        setPage(0);
        debugLog.log('[ConversationPage] Messages reset, count:', response.messages.length);
        // メッセージ読み込み後、既読にする
        setTimeout(async () => {
          if (!isMountedRef.current) return;
          try {
            await executeWithLoading(
              () => markMessagesAsRead(conversationId, null),
              { reset: false, skipLoadingState: true }
            );
          } catch (err) {
            debugLog.error('Failed to mark messages as read:', err);
          }
        }, 500);
      } else {
        // 古いメッセージを先頭に追加
        setMessages([...response.messages, ...messages]);
        debugLog.log('[ConversationPage] Messages appended, total count:', response.messages.length + messages.length);
      }

      setHasMore(response.messages.length === MESSAGES_PER_PAGE);
      clearError();
    } catch (err) {
      debugLog.error('[ConversationPage] loadMessages error:', err);
      // エラーが発生してもローディング状態はexecuteWithLoading内で解除される
    }
  };

  // 認証チェックと初期読み込み
  useEffect(() => {
    debugLog.log('[ConversationPage] Auth check useEffect', { authLoading, isAuthenticated, conversationId, isRedirecting });
    
    if (authLoading && !isAuthenticated) {
      debugLog.log('[ConversationPage] Auth still loading, skipping');
      return;
    }

    if (!isAuthenticated) {
      // 未認証の場合はホームにリダイレクト
      debugLog.log('[ConversationPage] Not authenticated, redirecting');
      setInitialLoading(false);
      if (!isRedirecting) {
        setIsRedirecting(true);
        router.push('/');
      }
      return;
    }

    // 両方の読み込みを並行して実行し、どちらかが失敗してもローディングを解除する
    let isCancelled = false;
    
    const loadData = async () => {
      debugLog.log('[ConversationPage] Starting loadData', { conversationId, isMounted: isMountedRef.current });
      try {
        // Promise.allSettledを使用して、どちらかが失敗しても続行する
        const results = await Promise.allSettled([
          loadConversation(),
          loadMessages(true, false), // skipLoadingState: false に変更してローディング状態を管理
        ]);
        
        debugLog.log('[ConversationPage] loadData results', results.map(r => ({ 
          status: r.status, 
          hasValue: r.status === 'fulfilled' && !!r.value,
          valueType: r.status === 'fulfilled' ? typeof r.value : 'N/A',
          value: r.status === 'fulfilled' ? (typeof r.value === 'object' ? Object.keys(r.value || {}) : r.value) : null,
        })));
        
        // エラーをログに記録
        results.forEach((result, index) => {
          const name = index === 0 ? 'conversation' : 'messages';
          if (result.status === 'rejected') {
            debugLog.error(`[ConversationPage] Failed to load ${name}:`, result.reason);
          } else if (result.status === 'fulfilled') {
            if (!result.value) {
              debugLog.warn(`[ConversationPage] ${name} returned null/undefined`);
            } else {
              debugLog.log(`[ConversationPage] ${name} loaded successfully`, {
                type: typeof result.value,
                keys: typeof result.value === 'object' && result.value ? Object.keys(result.value) : null,
                messagesCount: index === 1 ? (result.value as any)?.messages?.length : undefined,
              });
            }
          }
        });
        
        // 必ずinitialLoadingをfalseにする（成功・失敗に関わらず）
        if (!isCancelled) {
          debugLog.log('[ConversationPage] Setting initialLoading to false');
          setInitialLoading(false);
        }
      } catch (err) {
        debugLog.error('[ConversationPage] Failed to load data:', err);
        // エラーが発生してもinitialLoadingをfalseにする
        if (!isCancelled) {
          setInitialLoading(false);
        }
      }
    };

    loadData();
    
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, conversationId]);

  // リアルタイムメッセージ更新
  const handleNewMessage = (messageEvent: MessageEvent) => {
    debugLog.log('[handleNewMessage] Received message event:', {
      messageId: messageEvent.id,
      conversationId: messageEvent.conversation_id,
      currentConversationId: conversationId,
      senderId: messageEvent.sender_id,
      currentUserId: currentUser?.id,
    });

    // 現在の会話のメッセージのみ処理
    if (messageEvent.conversation_id !== conversationId) {
      debugLog.log('[handleNewMessage] Skipping message - conversation_id mismatch');
      return;
    }

    // メッセージをMessage形式に変換
    const newMessage: Message = {
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
    };

    // メッセージを追加（setMessages内で最新の状態を参照して重複チェック）
    // これにより、handleSendMessageで追加されたメッセージと重複しない
    setMessages(prev => {
      // 重複チェック（最新の状態を参照）
      if (prev.some(m => m.id === newMessage.id)) {
        debugLog.log('[handleNewMessage] Message already exists, skipping duplicate');
        return prev;
      }
      debugLog.log('[handleNewMessage] Adding new message');
      const updated = [...prev, newMessage];
      // メッセージ追加後にスクロール
      setTimeout(() => {
        scrollToBottom();
      }, 100);
      return updated;
    });

    // 会話情報を更新
    loadConversation();

    // 自分のメッセージでない場合は既読にする
    if (messageEvent.sender_id !== currentUser?.id) {
      setTimeout(async () => {
        try {
          await executeWithLoading(
            () => markMessagesAsRead(conversationId, [messageEvent.id]),
            { reset: false, skipLoadingState: true }
          );
        } catch (err) {
          debugLog.error('Failed to mark message as read:', err);
        }
      }, 500);
    }
  };

  useMessageStream(handleNewMessage);

  // 検索クエリが変更されたときにメッセージを再読み込み
  useEffect(() => {
    if (!isAuthenticated || !conversationId) return;
    
    // 検索クエリが変更されたときのみ再読み込み
    const timeoutId = setTimeout(() => {
      setIsSearching(true);
      loadMessages(true, false).finally(() => {
        setIsSearching(false);
      });
    }, 300); // デバウンス

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // メッセージ送信後にスクロール
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  // さらに読み込む
  const handleLoadMore = () => {
    setPage(page + 1);
    loadMessages(false);
  };

  // メッセージを送信
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageContent.trim() && !imageUrl.trim()) {
      return;
    }

    if (messageContent.length > 5000) {
      alert(tConv('messageTooLong'));
      return;
    }

    if (imageUrl && imageUrl.length > 500) {
      alert(tConv('imageUrlTooLong'));
      return;
    }

    setIsSending(true);
    clearError();

    if (!conversation?.other_user?.id) {
      alert(tConv('errorSending'));
      setIsSending(false);
      return;
    }

    try {
      // Ensure content is not empty (backend requires min_length=1)
      // If content is empty but image_url exists, use a placeholder
      const trimmedContent = messageContent.trim();
      const trimmedImageUrl = imageUrl.trim() || null;
      
      if (!trimmedContent && !trimmedImageUrl) {
        throw new Error('Message content or image URL is required');
      }

      const messageData: CreateMessageData = {
        recipient_id: conversation.other_user.id,
        content: trimmedContent || ' ', // Use single space if empty (image only message)
        image_url: trimmedImageUrl,
      };

      const newMessage = await executeWithLoading(
        () => sendMessage(messageData),
        { reset: false, skipLoadingState: true }
      );

      if (!newMessage) {
        throw new Error('Failed to send message');
      }
      debugLog.log('[handleSendMessage] Message sent successfully:', {
        id: newMessage.id,
        conversation_id: newMessage.conversation_id,
        currentConversationId: conversationId,
        sender_id: newMessage.sender_id,
      });
      
      // メッセージはSSE経由でhandleNewMessageから追加されるため、
      // ここでは追加しない（重複を防ぐ）
      // ただし、SSEが遅延する場合に備えて、短い遅延後に追加を試みる
      // （SSEが先に来た場合は重複チェックでスキップされる）
      setTimeout(() => {
        setMessages(prev => {
          // 重複チェック（SSE経由で既に追加されている可能性がある）
          if (prev.some(m => m.id === newMessage.id)) {
            debugLog.log('[handleSendMessage] Message already exists (added via SSE), skipping');
            return prev;
          }
          debugLog.log('[handleSendMessage] Adding message (SSE may have been delayed)');
          const updated = [...prev, newMessage];
          // メッセージ追加後にスクロール
          setTimeout(() => {
            scrollToBottom();
          }, 100);
          return updated;
        });
      }, 500); // SSEが500ms以内に来ない場合のみ追加
      
      // フォームをクリア
      setMessageContent('');
      setImageUrl('');
      
      // 会話情報を更新（非同期で実行）
      loadConversation().catch((err) => {
        debugLog.error('Failed to load conversation:', err);
      });
    } catch (err: any) {
      debugLog.error('Failed to send message:', err);
      const errorInfo = extractErrorInfo(err);
      setError(errorInfo);
      alert(tConv('errorSending') + ': ' + errorInfo.message);
    } finally {
      setIsSending(false);
    }
  };

  // メッセージを削除
  const handleDeleteMessage = async (messageId: string) => {
    setDeletingMessageId(messageId);
    
    try {
      await executeWithLoading(
        () => deleteMessage(messageId),
        { reset: false, skipLoadingState: true }
      );
      
      if (isMountedRef.current) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } catch (err: any) {
      debugLog.error('Failed to delete message:', err);
      alert(tConv('errorLoading'));
    } finally {
      setDeletingMessageId(null);
    }
  };

  // 時間表示のフォーマット（ユーザーのタイムゾーンを使用）
  const formatTime = (dateString: string) => {
    const userTimezone = currentUser ? getUserTimezone(currentUser.timezone, currentUser.country) : 'UTC';
    const date = new Date(dateString);
    const dateLocale = locale === 'ja' ? ja : enUS;
    
    // Use Intl.DateTimeFormat to format in user's timezone
    const formatter = new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
      timeZone: userTimezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    
    // Calculate relative time
    const relative = formatRelativeTime(dateString, locale, currentUser?.timezone, currentUser?.country);
    if (relative.minutes < 60) {
      return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale });
    }
    
    return formatter.format(date);
  };

  // 日付表示のフォーマット（ユーザーのタイムゾーンを使用）
  const formatDate = (dateString: string) => {
    return formatDateInTimezone(
      dateString,
      locale,
      currentUser?.timezone,
      currentUser?.country,
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }
    );
  };

  // 認証チェック中またはリダイレクト中のみページ全体をローディング
  if ((authLoading && !isAuthenticated) || isRedirecting) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !conversation) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <ErrorDisplay
              error={error}
              onRetry={() => {
                loadConversation();
                loadMessages(true);
              }}
              showDetails={false}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex flex-col flex-1">
          {/* Header */}
          <div className="py-4 border-b border-gray-200 bg-white sticky top-16 z-10">
            <div className="flex items-center gap-4">
              <Link
                href="/messages"
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              {conversation?.other_user && (
                <>
                  {conversation.other_user.avatar_url ? (
                    <Image
                      src={conversation.other_user.avatar_url}
                      alt={conversation.other_user.nickname}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-600 font-medium">
                        {conversation.other_user.nickname?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      {conversation.other_user.nickname}
                    </h1>
                    {conversation.unread_count > 0 && (
                      <p className="text-sm text-blue-600">
                        {conversation.unread_count} {tConv('markAsRead')}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
            
            {/* Message search */}
            {!initialLoading && !isLoading && (
              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={tConv('searchMessages')}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSearching}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={isSearching}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                  {isSearching && (
                    <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Messages container */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto py-4 space-y-4"
          >
            {error && (
              <div className="mb-4">
                <ErrorDisplay
                  error={error}
                  onRetry={() => loadMessages(true)}
                  showDetails={false}
                />
              </div>
            )}

            {/* ローディング状態 */}
            {(initialLoading || isLoading) && messages.length === 0 ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="mt-4 text-gray-500">{t('loading') || '読み込み中...'}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Load more button */}
                {hasMore && !searchQuery && (
                  <div className="flex justify-center">
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isLoadingMore
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      {isLoadingMore ? (
                        <span className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500"
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
                        tConv('loadMore')
                      )}
                    </button>
                  </div>
                )}

                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    {searchQuery ? (
                      <>
                        <Search className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">
                          {tConv('noSearchResults')}
                        </h3>
                        <p className="mt-2 text-gray-500">
                          {tConv('noSearchResultsMessage')}
                        </p>
                      </>
                    ) : (
                      <>
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
                          {tConv('noMessages')}
                        </h3>
                        <p className="mt-2 text-gray-500">
                          {tConv('noMessagesMessage')}
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => {
                  const prevMessage = index > 0 ? messages[index - 1] : null;
                  const showDateSeparator =
                    !prevMessage ||
                    formatDate(prevMessage.created_at) !== formatDate(message.created_at);
                  const isOwnMessage = currentUser?.id === message.sender_id;

                  return (
                    <div key={message.id}>
                      {showDateSeparator && (
                        <div className="text-center py-2">
                          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                      )}
                      <div
                        className={`flex gap-3 ${
                          isOwnMessage ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="flex-shrink-0 relative w-8 h-8">
                          {message.sender?.avatar_url ? (
                            <Image
                              src={message.sender.avatar_url}
                              alt={message.sender.nickname}
                              width={32}
                              height={32}
                              className="rounded-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-gray-600 text-xs font-medium">
                                {message.sender?.nickname?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Message content */}
                        <div
                          className={`flex-1 max-w-[70%] ${
                            isOwnMessage ? 'items-end' : 'items-start'
                          } flex flex-col`}
                        >
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              isOwnMessage
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-200 text-gray-900'
                            }`}
                          >
                            {message.is_deleted ? (
                              <p className="text-sm italic opacity-70">
                                ({tConv('deletedMessage')})
                              </p>
                            ) : (
                              <>
                                {message.content && (
                                  <p className="text-sm whitespace-pre-wrap break-words">
                                    {message.content}
                                  </p>
                                )}
                                {message.image_url && (
                                  <div className="mt-2 relative w-full">
                                    <Image
                                      src={message.image_url}
                                      alt="Attached image"
                                      width={400}
                                      height={300}
                                      className="max-w-full rounded-lg object-contain"
                                      unoptimized
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {formatTime(message.created_at)}
                            </span>
                            {isOwnMessage && !message.is_deleted && (
                              <button
                                onClick={() => handleDeleteMessage(message.id)}
                                disabled={deletingMessageId === message.id}
                                className="text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                                title={tConv('deleteMessage')}
                              >
                                {deletingMessageId === message.id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
                  </>
                )}
              </>
            )}
          </div>

          {/* Message form */}
          <div className="border-t border-gray-200 bg-white py-4 sticky bottom-0 z-10">
            <form onSubmit={handleSendMessage} className="space-y-2">
              {imageUrl && (
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <Image
                    src={imageUrl}
                    alt="Preview"
                    width={64}
                    height={64}
                    className="object-cover rounded"
                    unoptimized
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="text-red-600 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder={tConv('imageUrlPlaceholder')}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={isSending}
                />
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder={tConv('messagePlaceholder')}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                  rows={1}
                  maxLength={5000}
                  disabled={isSending}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={isSending || (!messageContent.trim() && !imageUrl.trim())}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSending ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
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
                      {tConv('sending')}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {tConv('send')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

