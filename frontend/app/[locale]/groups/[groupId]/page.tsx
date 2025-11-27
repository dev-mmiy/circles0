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
  getGroup,
  getGroupMessages,
  sendGroupMessage,
  markGroupMessagesAsRead,
  deleteGroupMessage,
  GroupMessage,
  Group,
  CreateGroupMessageData,
} from '@/lib/api/groups';
import { formatDistanceToNow } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { getUserTimezone, formatDateInTimezone } from '@/lib/utils/timezone';
import { shouldShowAvatar } from '@/lib/utils/chatMessage';
import { ArrowLeft, Trash2, Send, Image as ImageIcon, Users, Settings } from 'lucide-react';
import { setAuthToken } from '@/lib/api/client';
import dynamic from 'next/dynamic';
import { useMessageStream } from '@/lib/hooks/useMessageStream';
import { debugLog } from '@/lib/utils/debug';
import MessageImage from '@/components/MessageImage';
import ImageUploadPreview from '@/components/ImageUploadPreview';
import Avatar from '@/components/Avatar';
import ChatMessage from '@/components/ChatMessage';
import { useImageUpload } from '@/hooks/useImageUpload';

// Dynamically import GroupSettingsModal to reduce initial bundle size
const GroupSettingsModal = dynamic(() => import('@/components/GroupSettingsModal'), {
  loading: () => null,
  ssr: false,
});

export default function GroupChatPage() {
  const { isAuthenticated, isLoading: authLoading, getAccessTokenSilently } = useAuth0();
  const { user: currentUser } = useUser();
  const router = useRouter();
  const params = useNextParams();
  const locale = useLocale();
  const groupId = params.groupId as string;
  const t = useTranslations('groups');
  const tChat = useTranslations('groups.chat');

  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
      invalidImageFile: tChat('invalidImageFile'),
      failedToCreatePreview: tChat('failedToCreatePreview'),
      uploadServiceNotConfigured: tChat('uploadServiceNotConfigured'),
      uploadFailed: tChat('uploadFailed'),
    },
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const MESSAGES_PER_PAGE = 50;

  // Real-time updates
  const { lastMessage } = useMessageStream();

  useEffect(() => {
    if (lastMessage && lastMessage.group_id === groupId) {
      // Check if message already exists
      if (!messages.find(m => m.id === lastMessage.id)) {
        // Convert MessageEvent to GroupMessage (they are compatible)
        const newMessage = lastMessage as unknown as GroupMessage;
        debugLog.log('[GroupChatPage] SSE message received:', {
          id: newMessage.id,
          image_url: newMessage.image_url,
          content: newMessage.content,
        });
        setMessages(prev => [...prev, newMessage]);

        // Mark as read if it's not our own message
        if (newMessage.sender_id !== currentUser?.id) {
          markGroupMessagesAsRead(groupId, [newMessage.id]).catch(console.error);
        }
      }
    }
  }, [lastMessage, groupId, messages, currentUser?.id]);

  // スクロールを最下部に移動
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // グループとメッセージを取得
  const loadGroup = async () => {
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

      const grp = await getGroup(groupId);
      setGroup(grp);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load group:', err);
      const errorInfo = extractErrorInfo(err);
      setError(errorInfo);
      // グループの読み込みに失敗した場合でも、メッセージの読み込みは続行する
    }
  };

  const loadMessages = async (reset: boolean = false) => {
    const currentPage = reset ? 0 : page;
    setIsLoadingMore(!reset);
    if (reset) {
      setIsLoading(true);
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
      } else {
        setAuthToken(null);
      }

      const response = await getGroupMessages(
        groupId,
        currentPage * MESSAGES_PER_PAGE,
        MESSAGES_PER_PAGE
      );

      if (reset) {
        setMessages(response.messages);
        setPage(0);
      } else {
        setMessages([...response.messages, ...messages]);
      }

      setHasMore(response.messages.length === MESSAGES_PER_PAGE);
      setError(null);

      // 既読マーク
      if (reset && response.messages.length > 0) {
        const unreadMessages = response.messages.filter(
          m => m.sender_id !== currentUser?.id && !m.is_read
        );
        if (unreadMessages.length > 0) {
          try {
            await markGroupMessagesAsRead(groupId, unreadMessages.map(m => m.id));
          } catch (err) {
            console.error('Failed to mark messages as read:', err);
            // 既読マークの失敗はローディング状態に影響しない
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      const errorInfo = extractErrorInfo(err);
      setError(errorInfo);
    } finally {
      // 必ずローディング状態を解除
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // 認証チェックと初期読み込み
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      if (!isRedirecting) {
        setIsRedirecting(true);
        router.push('/');
      }
      return;
    }

    loadGroup();
    loadMessages(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, groupId]);

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

    if (!messageContent.trim() && !uploadedImageUrl) {
      return;
    }

    if (messageContent.length > 5000) {
      alert(tChat('messageTooLong'));
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      // 認証トークンを設定
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          setAuthToken(token);
        } catch (tokenError) {
          debugLog.warn('Failed to get access token:', tokenError);
          setAuthToken(null);
        }
      }

      const messageData: CreateGroupMessageData = {
        content: messageContent.trim() || '',
        image_url: uploadedImageUrl || null,
      };

      // Send message - SSE will handle the update for us, but we can optimistically add it or wait for SSE
      // For now, let's wait for the response to ensure it's sent, but rely on SSE for the list update to avoid duplicates if we're not careful
      // Actually, the existing logic adds it manually. Let's keep it but be careful with duplicates in the SSE effect.
      const newMessage = await sendGroupMessage(groupId, messageData);
      
      debugLog.log('[handleSendMessage] Message sent successfully:', {
        id: newMessage.id,
        image_url: newMessage.image_url,
        content: newMessage.content,
      });

      setMessages(prev => [...prev, newMessage]);

      // フォームをクリア
      setMessageContent('');
      clearImage();

      // グループ情報を更新 (last_message_at etc)
      loadGroup();
    } catch (err: any) {
      debugLog.error('Failed to send message:', err);
      const errorInfo = extractErrorInfo(err);
      setError(errorInfo);
      alert(tChat('errorSending'));
    } finally {
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
      await deleteGroupMessage(groupId, messageId);
      // 削除後、リストから除外
      setMessages(messages.filter(m => m.id !== messageId));
    } catch (err: any) {
      console.error('Failed to delete message:', err);
      alert(tChat('errorLoading'));
    } finally {
      setDeletingMessageId(null);
    }
  };

  // 時間表示のフォーマット（ユーザーのタイムゾーンを使用）
  const formatTime = (dateString: string | undefined | null) => {
    if (!dateString) {
      return '';
    }
    const userTimezone = currentUser ? getUserTimezone(currentUser.timezone, currentUser.country) : 'UTC';
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }
    const dateLocale = locale === 'ja' ? ja : enUS;
    return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale });
  };

  if (authLoading || isLoading || isRedirecting) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-12">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <ErrorDisplay
              error={error}
              onRetry={() => {
                loadGroup();
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
      <div className="h-[calc(100vh-4rem)] bg-gray-50 flex flex-col">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="py-4 border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/messages"
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                {group?.avatar_url ? (
                  <div className="w-10 h-10 rounded-full flex-shrink-0 relative overflow-hidden">
                    <Image
                      src={group.avatar_url}
                      alt={group.name}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">
                    {group?.name || t('group')}
                  </h2>
                  {group && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Users className="w-4 h-4" />
                      <span>{group.member_count} {t('members')}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title={t('groupSettings')}
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0"
          >
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  {tChat('loadingMore')}
                </button>
              </div>
            )}

            {messages.map((message, index) => {
              const isOwnMessage = message.sender_id === currentUser?.id;
              const prevSenderId = index > 0 ? messages[index - 1].sender_id : null;
              const showAvatar = shouldShowAvatar(
                index,
                prevSenderId,
                message.sender_id,
                !!message.image_url,
                false // Group chats: show avatar based on sender change or image
              );
              // Compare dates in user's timezone
              const userTimezone = currentUser ? getUserTimezone(currentUser.timezone, currentUser.country) : undefined;
              const currentDate = formatDateInTimezone(
                message.created_at,
                locale,
                currentUser?.timezone,
                currentUser?.country,
                { year: 'numeric', month: 'long', day: 'numeric' }
              );
              const prevDate = index > 0 ? formatDateInTimezone(
                messages[index - 1].created_at,
                locale,
                currentUser?.timezone,
                currentUser?.country,
                { year: 'numeric', month: 'long', day: 'numeric' }
              ) : '';
              const showDate = index === 0 || currentDate !== prevDate;

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="text-center text-xs text-gray-500 py-2">
                      {formatDateInTimezone(
                        message.created_at,
                        locale,
                        currentUser?.timezone,
                        currentUser?.country,
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }
                      )}
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
                    showAvatar={showAvatar}
                    showSenderName={showAvatar && !isOwnMessage}
                    onDelete={handleDeleteMessage}
                    isDeleting={deletingMessageId === message.id}
                    formatTime={formatTime}
                    deleteMessageTitle={tChat('deleteMessage')}
                    deletedMessageText={tChat('deletedMessage')}
                    priority={index >= messages.length - 3}
                  />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Form */}
          <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder={tChat('typeMessage')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  maxLength={5000}
                />
                {imagePreview && (
                  <ImageUploadPreview
                    previewUrl={imagePreview}
                    onRemove={handleRemoveImage}
                    isUploading={uploadingImage}
                  />
                )}
                {uploadingImage && (
                  <div className="mt-2 text-sm text-gray-500">
                    {tChat('uploading') || 'Uploading...'}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="group-image-upload"
                />
                <label
                  htmlFor="group-image-upload"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors flex items-center"
                  title={tChat('attachImage') || 'Attach image'}
                >
                  <ImageIcon className="w-5 h-5" />
                </label>
                <button
                  type="submit"
                  disabled={isSending || uploadingImage || (!messageContent.trim() && !uploadedImageUrl)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSending ? (
                    <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {group && (
        <GroupSettingsModal
          group={group}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onUpdate={loadGroup}
        />
      )}
    </>
  );
}

