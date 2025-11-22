'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
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
import { ArrowLeft, Trash2, Send, Image as ImageIcon } from 'lucide-react';
import { setAuthToken } from '@/lib/api/client';
import { useMessageStream, MessageEvent } from '@/lib/hooks/useMessageStream';

export default function ConversationPage() {
  const { isAuthenticated, isLoading: authLoading, getAccessTokenSilently } = useAuth0();
  const { user: currentUser } = useUser();
  const router = useRouter();
  const params = useNextParams();
  const locale = useLocale();
  const conversationId = params.conversationId as string;
  const t = useTranslations('messages');
  const tConv = useTranslations('messages.conversation');
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Message form state
  const [messageContent, setMessageContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const MESSAGES_PER_PAGE = 50;

  // スクロールを最下部に移動
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 会話とメッセージを取得
  const loadConversation = async () => {
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
      } else {
        setAuthToken(null);
      }

      const conv = await getConversation(conversationId);
      setConversation(conv);
    } catch (err: any) {
      console.error('Failed to load conversation:', err);
      const errorInfo = extractErrorInfo(err);
      setError(errorInfo);
    }
  };

  const loadMessages = async (reset: boolean = false) => {
    try {
      const currentPage = reset ? 0 : page;
      setIsLoadingMore(!reset);
      if (reset) {
        setIsLoading(true);
      }

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

      const response = await getMessages(
        conversationId,
        currentPage * MESSAGES_PER_PAGE,
        MESSAGES_PER_PAGE
      );

      if (reset) {
        setMessages(response.messages);
        setPage(0);
        // メッセージ読み込み後、既読にする
        setTimeout(async () => {
          try {
            if (isAuthenticated) {
              const token = await getAccessTokenSilently();
              setAuthToken(token);
            }
            await markMessagesAsRead(conversationId, null);
          } catch (err) {
            console.error('Failed to mark messages as read:', err);
          }
        }, 500);
      } else {
        // 古いメッセージを先頭に追加
        setMessages([...response.messages, ...messages]);
      }

      setHasMore(response.messages.length === MESSAGES_PER_PAGE);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      const errorInfo = extractErrorInfo(err);
      setError(errorInfo);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // 認証チェックと初期読み込み
  useEffect(() => {
    // authLoadingがtrueでも、isAuthenticatedがtrueなら続行する
    // （クライアントサイドナビゲーションで状態が維持されている場合）
    if (authLoading && !isAuthenticated) return;

    if (!isAuthenticated) {
      // 未認証の場合はホームにリダイレクト
      if (!isRedirecting) {
        setIsRedirecting(true);
        router.push('/');
      }
      return;
    }

    loadConversation();
    loadMessages(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, conversationId]);

  // リアルタイムメッセージ更新
  const handleNewMessage = (messageEvent: MessageEvent) => {
    console.log('[handleNewMessage] Received message event:', {
      messageId: messageEvent.id,
      conversationId: messageEvent.conversation_id,
      currentConversationId: conversationId,
      senderId: messageEvent.sender_id,
      currentUserId: currentUser?.id,
    });

    // 現在の会話のメッセージのみ処理
    if (messageEvent.conversation_id !== conversationId) {
      console.log('[handleNewMessage] Skipping message - conversation_id mismatch');
      return;
    }

    // 既に存在するメッセージは追加しない
    if (messages.some(m => m.id === messageEvent.id)) {
      console.log('[handleNewMessage] Skipping message - already exists');
      return;
    }

    console.log('[handleNewMessage] Processing new message');

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

    // メッセージを追加
    setMessages(prev => {
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
          if (isAuthenticated) {
            const token = await getAccessTokenSilently();
            setAuthToken(token);
          }
          await markMessagesAsRead(conversationId, [messageEvent.id]);
        } catch (err) {
          console.error('Failed to mark message as read:', err);
        }
      }, 500);
    }
  };

  const { isConnected: isMessageStreamConnected } = useMessageStream(handleNewMessage);

  // メッセージ送信後にスクロール
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  // さらに読み込む
  const handleLoadMore = () => {
    setIsLoadingMore(true);
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
    setError(null);

    if (!conversation?.other_user?.id) {
      alert(tConv('errorSending'));
      return;
    }

    try {
      console.log('[handleSendMessage] Starting message send...');
      
      // 認証トークンを設定
      if (isAuthenticated) {
        try {
          console.log('[handleSendMessage] Getting access token...');
          const token = await getAccessTokenSilently();
          setAuthToken(token);
          console.log('[handleSendMessage] Access token obtained');
        } catch (tokenError) {
          console.warn('[handleSendMessage] Failed to get access token:', tokenError);
          setAuthToken(null);
          throw new Error('Failed to get access token');
        }
      }

      // Ensure content is not empty (backend requires min_length=1)
      // If content is empty but image_url exists, use a placeholder
      const trimmedContent = messageContent.trim();
      const trimmedImageUrl = imageUrl.trim() || null;
      
      if (!trimmedContent && !trimmedImageUrl) {
        // This should not happen due to earlier validation, but just in case
        throw new Error('Message content or image URL is required');
      }

      const messageData: CreateMessageData = {
        recipient_id: conversation.other_user.id,
        content: trimmedContent || ' ', // Use single space if empty (image only message)
        image_url: trimmedImageUrl,
      };

      console.log('[handleSendMessage] Sending message:', messageData);
      const newMessage = await sendMessage(messageData);
      console.log('[handleSendMessage] Message sent successfully:', {
        id: newMessage.id,
        conversation_id: newMessage.conversation_id,
        currentConversationId: conversationId,
        sender_id: newMessage.sender_id,
      });
      
      // 新しいメッセージをリストに追加
      // Note: SSEストリームからも同じメッセージが来る可能性があるが、
      // handleNewMessageで重複チェックされる
      setMessages(prev => {
        // 重複チェック
        if (prev.some(m => m.id === newMessage.id)) {
          console.log('[handleSendMessage] Message already in list, skipping');
          return prev;
        }
        console.log('[handleSendMessage] Adding message to list');
        const updated = [...prev, newMessage];
        // メッセージ追加後にスクロール
        setTimeout(() => {
          scrollToBottom();
        }, 100);
        return updated;
      });
      
      // フォームをクリア
      setMessageContent('');
      setImageUrl('');
      console.log('[handleSendMessage] Form cleared');
      
      // 会話情報を更新（SSEで自動更新されるので、非同期で実行）
      // メッセージ送信のレスポンスを待たないようにする
      console.log('[handleSendMessage] Updating conversation (async)...');
      loadConversation().catch((err) => {
        console.error('[handleSendMessage] Failed to load conversation:', err);
      });
      console.log('[handleSendMessage] Message send completed');
    } catch (err: any) {
      console.error('[handleSendMessage] Failed to send message:', err);
      console.error('[handleSendMessage] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      const errorInfo = extractErrorInfo(err);
      setError(errorInfo);
      alert(tConv('errorSending') + ': ' + errorInfo.message);
    } finally {
      console.log('[handleSendMessage] Finally block - setting isSending to false');
      setIsSending(false);
    }
  };

  // メッセージを削除
  const handleDeleteMessage = async (messageId: string) => {
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

      setDeletingMessageId(messageId);
      await deleteMessage(messageId);
      // 削除後、リストから除外
      setMessages(messages.filter(m => m.id !== messageId));
    } catch (err: any) {
      console.error('Failed to delete message:', err);
      alert(tConv('errorLoading'));
    } finally {
      setDeletingMessageId(null);
    }
  };

  // 時間表示のフォーマット
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const dateLocale = locale === 'ja' ? ja : enUS;
    return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale });
  };

  // 日付表示のフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if ((authLoading && !isAuthenticated) || isLoading || isRedirecting) {
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
                    <img
                      src={conversation.other_user.avatar_url}
                      alt={conversation.other_user.nickname}
                      className="w-10 h-10 rounded-full object-cover"
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

            {/* Load more button */}
            {hasMore && (
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
                        <div className="flex-shrink-0">
                          {message.sender?.avatar_url ? (
                            <img
                              src={message.sender.avatar_url}
                              alt={message.sender.nickname}
                              className="w-8 h-8 rounded-full object-cover"
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
                                  <div className="mt-2">
                                    <img
                                      src={message.image_url}
                                      alt="Attached image"
                                      className="max-w-full rounded-lg"
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
          </div>

          {/* Message form */}
          <div className="border-t border-gray-200 bg-white py-4 sticky bottom-0 z-10">
            <form onSubmit={handleSendMessage} className="space-y-2">
              {imageUrl && (
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded"
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

