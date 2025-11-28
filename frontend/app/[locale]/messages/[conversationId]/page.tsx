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
import { formatDateInTimezone, formatRelativeTime, getUserTimezone } from '@/lib/utils/timezone';
import { shouldShowAvatar } from '@/lib/utils/chatMessage';
import { ArrowLeft, Trash2, Send, Search, X, Image as ImageIcon } from 'lucide-react';
import { useMessageStream, MessageEvent } from '@/lib/hooks/useMessageStream';
import { useAuthWithLoader } from '@/lib/hooks/useAuthWithLoader';
import { debugLog } from '@/lib/utils/debug';
import MessageImage from '@/components/MessageImage';
import ImageUploadPreview from '@/components/ImageUploadPreview';
import Avatar from '@/components/Avatar';
import ChatMessage from '@/components/ChatMessage';
import { useImageUpload } from '@/hooks/useImageUpload';
import { addMessageReaction, removeMessageReaction } from '@/lib/api/messages';

export default function ConversationPage() {
  // Disable Next.js automatic scroll restoration for this page
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      const originalScrollRestoration = window.history.scrollRestoration;
      window.history.scrollRestoration = 'manual';
      return () => {
        window.history.scrollRestoration = originalScrollRestoration;
      };
    }
  }, []);
  const { isAuthenticated, isLoading: authLoading, getAccessTokenSilently } = useAuth0();
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
  const [isSending, setIsSending] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  
  // Image upload hook
  const {
    uploadedImageUrl,
    imagePreview,
    uploadingImage,
    fileInputRef,
    handleImageSelect,
    handleRemoveImage,
    clearImage,
  } = useImageUpload({
    translationKeys: {
      invalidImageFile: tConv('invalidImageFile'),
      failedToCreatePreview: tConv('failedToCreatePreview'),
      uploadServiceNotConfigured: tConv('uploadServiceNotConfigured'),
      uploadFailed: tConv('uploadFailed'),
    },
  });
  
  // Message search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const MESSAGES_PER_PAGE = 50;

  // スクロールを最下部に移動
  // sticky要素がある場合でも確実にスクロールするため、scrollTopを直接設定
  const scrollToBottom = (smooth: boolean = true, retries: number = 3) => {
    const attemptScroll = (attempt: number) => {
      if (messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        const maxScrollTop = container.scrollHeight - container.clientHeight;
        
        // scrollTopを直接設定（sticky要素の影響を受けない）
        if (smooth && attempt === retries) {
          // 最後の試行時のみスムーズスクロール
          container.scrollTo({
            top: maxScrollTop,
            behavior: 'smooth'
          });
        } else {
          // 即座にスクロール（scrollTopを直接設定）
          container.scrollTop = maxScrollTop;
        }
        
        // スクロールが完了したか確認（余裕を持たせる）
        const currentScrollTop = container.scrollTop;
        const isAtBottom = Math.abs(currentScrollTop - maxScrollTop) < 5;
        
        // まだ最下部に到達していない場合、再試行
        if (!isAtBottom && attempt < retries) {
          requestAnimationFrame(() => {
            attemptScroll(attempt + 1);
          });
        }
      }
    };
    
    // requestAnimationFrameを使用してDOM更新後にスクロール
    requestAnimationFrame(() => {
      attemptScroll(1);
    });
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
        responseValue: response,
      });

      // executeWithLoadingはエラー時やアンマウント時にnullを返す可能性がある
      if (!response) {
        debugLog.warn('[ConversationPage] executeWithLoading returned null (error or unmounted)', { reset, skipLoadingState });
        // エラーが発生した場合でもinitialLoadingを解除する
        if (reset) {
          setInitialLoading(false);
          setMessages([]);
        }
        return;
      }

      // response.messagesが存在しない場合
      if (!response.messages) {
        debugLog.warn('[ConversationPage] Response has no messages property', { response, responseKeys: Object.keys(response) });
        if (reset) {
          setInitialLoading(false);
          setMessages([]);
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
        // メッセージ読み込み後、最下部にスクロール（初期読み込み時は即座に）
        // DOM更新を待つために複数のタイミングで試行
        requestAnimationFrame(() => {
          setTimeout(() => {
            scrollToBottom(false, 5); // 初期読み込み時は即座にスクロール、5回まで再試行
          }, 100);
        });
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
              // executeWithLoadingはエラー時やアンマウント時にnullを返す可能性がある
              // これは正常な動作なので、警告レベルを下げる
              debugLog.log(`[ConversationPage] ${name} returned null/undefined (likely error or unmounted)`);
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

  /**
   * Handle new message from Server-Sent Events (SSE) stream
   * 
   * This function is called when a new message is received via the SSE connection.
   * It filters messages to only process those for the current conversation,
   * converts the SSE message format to the internal Message format,
   * and updates the UI state accordingly.
   * 
   * @param messageEvent - Message event received from SSE stream
   */
  const handleNewMessage = (messageEvent: MessageEvent) => {
    debugLog.log('[handleNewMessage] Received message event:', {
      messageId: messageEvent.id,
      conversationId: messageEvent.conversation_id,
      currentConversationId: conversationId,
      senderId: messageEvent.sender_id,
      currentUserId: currentUser?.id,
    });

    // Filter: Only process messages for the current conversation
    // This prevents messages from other conversations from appearing in the UI
    if (messageEvent.conversation_id !== conversationId) {
      debugLog.log('[handleNewMessage] Skipping message - conversation_id mismatch');
      return;
    }

    // Convert SSE message format to internal Message format
    // SSE messages come with sender data included, but we need to match
    // the Message interface used throughout the component
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
      is_read: false,  // New messages are unread by default
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
        requestAnimationFrame(() => {
          setTimeout(() => {
            scrollToBottom(true, 3);
          }, 100);
        });
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

  // メッセージが変更されたときにスクロール（初期読み込み時を除く）
  useEffect(() => {
    if (messages.length > 0 && !initialLoading) {
      // DOM更新を待つためにrequestAnimationFrameを使用
      requestAnimationFrame(() => {
        setTimeout(() => {
          scrollToBottom(true, 3);
        }, 100);
      });
    }
  }, [messages.length, initialLoading]);
  
  // 初期読み込み完了時に最下部にスクロール
  useEffect(() => {
    if (!initialLoading && messages.length > 0) {
      // 初期読み込み完了時は即座にスクロール、複数回試行
      requestAnimationFrame(() => {
        setTimeout(() => {
          scrollToBottom(false, 5);
        }, 200);
      });
    }
  }, [initialLoading, messages.length]);

  // さらに読み込む
  const handleLoadMore = () => {
    setPage(page + 1);
    loadMessages(false);
  };


  // メッセージを送信
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageContent.trim() && !uploadedImageUrl) {
      return;
    }

    if (messageContent.length > 5000) {
      alert(tConv('messageTooLong'));
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
      
      if (!trimmedContent && !uploadedImageUrl) {
        throw new Error('Message content or image is required');
      }

      const messageData: CreateMessageData = {
        recipient_id: conversation.other_user.id,
        content: trimmedContent || ' ', // Use single space if empty (image only message)
        image_url: uploadedImageUrl || null,
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
      
      // Message handling strategy:
      // 1. Messages are typically added via SSE (handleNewMessage) for real-time updates
      // 2. However, SSE may be delayed or fail, so we add a fallback:
      //    - Wait 500ms for SSE to deliver the message
      //    - If SSE message hasn't arrived, add it manually
      //    - Duplicate check prevents adding the same message twice
      // This ensures messages appear immediately even if SSE is slow
      setTimeout(() => {
        setMessages(prev => {
          // Duplicate check: SSE may have already added this message
          if (prev.some(m => m.id === newMessage.id)) {
            debugLog.log('[handleSendMessage] Message already exists (added via SSE), skipping');
            return prev;
          }
          debugLog.log('[handleSendMessage] Adding message (SSE may have been delayed)');
          const updated = [...prev, newMessage];
          // Scroll to bottom after adding message
          setTimeout(() => {
            requestAnimationFrame(() => {
          setTimeout(() => {
            scrollToBottom(true, 3);
          }, 100);
        });
          }, 100);
          return updated;
        });
      }, 500); // Wait 500ms for SSE, then add manually if not received
      
      // フォームをクリア
      setMessageContent('');
      clearImage();
      
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
  // Handle reaction
  const handleReactionClick = async (messageId: string, reactionType: string) => {
    try {
      // 現在のメッセージのリアクション状態を確認
      const currentMessage = messages.find(msg => msg.id === messageId);
      const existingUserReaction = currentMessage?.reactions?.find(r => r.user_id === currentUser?.id);
      const isSameReactionType = existingUserReaction?.reaction_type === reactionType;
      
      // 同じリアクションタイプの場合は、削除APIを呼び出す
      if (isSameReactionType && existingUserReaction) {
        try {
          await removeMessageReaction(messageId);
          // 状態から削除
          setMessages(prevMessages => 
            prevMessages.map(msg => {
              if (msg.id === messageId) {
                return {
                  ...msg,
                  reactions: msg.reactions?.filter(r => r.user_id !== currentUser?.id) || null,
                };
              }
              return msg;
            })
          );
          return;
        } catch (err) {
          debugLog.error('Failed to remove reaction:', err);
          // 削除に失敗した場合は、通常の追加処理を続行
        }
      }
      
      const updatedReaction = await addMessageReaction(messageId, { reaction_type: reactionType });
      
      // Update message reactions in state
      setMessages(prevMessages => 
        prevMessages.map(msg => {
          if (msg.id === messageId) {
            // If reaction was removed (null), remove it from reactions
            if (updatedReaction === null) {
              return {
                ...msg,
                reactions: msg.reactions?.filter(r => r.user_id !== currentUser?.id) || null,
              };
            }
            
            // Otherwise, add or update reaction
            const existingReactions = msg.reactions || [];
            const existingIndex = existingReactions.findIndex(r => r.user_id === currentUser?.id);
            
            if (existingIndex >= 0) {
              // Update existing reaction
              const updated = [...existingReactions];
              updated[existingIndex] = updatedReaction;
              return { ...msg, reactions: updated };
            } else {
              // Add new reaction
              return { ...msg, reactions: [...existingReactions, updatedReaction] };
            }
          }
          return msg;
        })
      );
    } catch (err: any) {
      debugLog.error('Failed to add reaction:', err);
      // 422エラーの場合は詳細を表示
      if (err.response?.status === 422) {
        const errorDetail = err.response?.data?.detail;
        const errorMessage = Array.isArray(errorDetail) 
          ? errorDetail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ')
          : errorDetail || 'Validation error';
        alert(`${tReactions('errorAddingReaction') || 'Failed to add reaction'}: ${errorMessage}`);
      } else {
        alert(tReactions('errorAddingReaction') || 'Failed to add reaction');
      }
    }
  };

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
    // Normalize date string to ensure UTC interpretation
    const normalizedDateString = dateString.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateString) 
      ? dateString 
      : dateString + 'Z';
    const date = new Date(normalizedDateString);
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
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
      <div className="h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900 flex flex-col">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
            <div className="flex items-center gap-4">
              <Link
                href="/messages"
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              {conversation?.other_user && (
                <>
                  <Avatar
                    avatarUrl={conversation.other_user.avatar_url}
                    nickname={conversation.other_user.nickname}
                    size={40}
                    className="rounded-full object-cover"
                    alt={conversation.other_user.nickname}
                  />
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {conversation.other_user.nickname}
                    </h1>
                    {conversation.unread_count > 0 && (
                      <p className="text-sm text-blue-600 dark:text-blue-400">
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
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={tConv('searchMessages')}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    disabled={isSearching}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
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
            className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0"
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
                  <p className="mt-4 text-gray-500 dark:text-gray-400">{t('loading') || '読み込み中...'}</p>
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
                          ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
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
                        <Search className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                          {tConv('noSearchResults')}
                        </h3>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">
                          {tConv('noSearchResultsMessage')}
                        </p>
                      </>
                    ) : (
                      <>
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
                          {tConv('noMessages')}
                        </h3>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">
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
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                      )}
                      <ChatMessage
                        id={message.id}
                        sender={message.sender ? {
                          id: message.sender.id,
                          nickname: message.sender.nickname,
                          avatar_url: message.sender.avatar_url,
                        } : null}
                        senderId={message.sender_id}
                        content={message.content}
                        imageUrl={message.image_url}
                        isDeleted={message.is_deleted}
                        createdAt={message.created_at}
                        isOwnMessage={isOwnMessage}
                        showAvatar={shouldShowAvatar(
                          index,
                          index > 0 ? messages[index - 1].sender_id : null,
                          message.sender_id,
                          !!message.image_url,
                          true // Direct messages: always show avatar
                        )}
                        showSenderName={false}
                        onDelete={handleDeleteMessage}
                        isDeleting={deletingMessageId === message.id}
                        formatTime={formatTime}
                        deleteMessageTitle={tConv('deleteMessage')}
                        deletedMessageText={`(${tConv('deletedMessage')})`}
                        priority={index >= messages.length - 3}
                        reactions={message.reactions || []}
                        currentUserId={currentUser?.id}
                        onReactionClick={(reactionType) => handleReactionClick(message.id, reactionType)}
                      />
                    </div>
                  );
                })}
                  </>
                )}
              </>
            )}
          </div>

          {/* Message form */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-4 flex-shrink-0">
            <form onSubmit={handleSendMessage} className="space-y-2">
              {imagePreview && (
                <ImageUploadPreview
                  previewUrl={imagePreview}
                  onRemove={handleRemoveImage}
                  isUploading={uploadingImage}
                  className="max-w-xs max-h-32 rounded-lg object-contain"
                />
              )}
              <div className="flex gap-2">
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder={tConv('messagePlaceholder')}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  rows={1}
                  maxLength={5000}
                  disabled={isSending || uploadingImage}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={isSending || uploadingImage}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSending || uploadingImage}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  title={tConv('attachImage')}
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  disabled={isSending || uploadingImage || (!messageContent.trim() && !uploadedImageUrl)}
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

