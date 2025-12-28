/**
 * ChatMessage Component
 * 
 * Common component for displaying chat messages in both direct messages and group chats
 */

import { useState, useRef, useEffect } from 'react';
import { Trash2, SmilePlus } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import Avatar from './Avatar';
import MessageImage from './MessageImage';
import MessageReactions from './MessageReactions';
import { MessageReaction } from '@/lib/api/messages';
import { GroupMessageReaction } from '@/lib/api/groups';

interface ChatMessageSender {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
}

interface ChatMessageProps {
  id: string;
  sender: ChatMessageSender | null;
  senderId: string;
  content: string | null;
  imageUrl: string | null;
  isDeleted: boolean;
  createdAt: string;
  isOwnMessage: boolean;
  showAvatar: boolean;
  showSenderName?: boolean;
  onDelete?: (messageId: string) => void;
  isDeleting?: boolean;
  formatTime: (dateString: string) => string;
  deleteMessageTitle?: string;
  deletedMessageText?: string;
  priority?: boolean;
  // Styling
  ownMessageBgColor?: string;
  ownMessageTextColor?: string;
  otherMessageBgColor?: string;
  otherMessageTextColor?: string;
  avatarSize?: number;
  // Reactions
  reactions?: (MessageReaction | GroupMessageReaction)[];
  currentUserId?: string;
  onReactionClick?: (reactionType: string) => void;
  // Image click handler
  onImageClick?: (imageUrl: string) => void;
}

export default function ChatMessage({
  id,
  sender,
  senderId,
  content,
  imageUrl,
  isDeleted,
  createdAt,
  isOwnMessage,
  showAvatar,
  showSenderName = false,
  onDelete,
  isDeleting = false,
  formatTime,
  deleteMessageTitle,
  deletedMessageText = 'Deleted message',
  priority = false,
  ownMessageBgColor = 'bg-blue-600',
  ownMessageTextColor = 'text-white',
  otherMessageBgColor = 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600',
  otherMessageTextColor = 'text-gray-900 dark:text-gray-100',
  avatarSize = 32,
  reactions,
  currentUserId,
  onReactionClick,
  onImageClick,
}: ChatMessageProps) {
  const t = useTranslations('messages.reactions');
  const [showReactionButton, setShowReactionButton] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // パネル外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowReactionPicker(false);
      }
    };

    if (showReactionPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [showReactionPicker]);

  return (
    <div 
      className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} relative group`}
      ref={messageRef}
      onMouseEnter={() => {
        if (!isDeleted && onReactionClick) {
          setShowReactionButton(true);
        }
      }}
      onMouseLeave={() => {
        if (!showReactionPicker) {
          setShowReactionButton(false);
        }
      }}
      onClick={() => {
        if (!isDeleted && onReactionClick) {
          setShowReactionButton(true);
        }
      }}
    >
      {/* Avatar */}
      {showAvatar && (
        <div className="flex-shrink-0 relative" style={{ width: avatarSize, height: avatarSize }}>
          {!isOwnMessage && sender?.id ? (
            <Link href={`/profile/${sender.id}`} className="block">
              <Avatar
                avatarUrl={sender?.avatar_url}
                nickname={sender?.nickname}
                size={avatarSize}
                className="rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                alt={sender?.nickname || 'Avatar'}
              />
            </Link>
          ) : (
            <Avatar
              avatarUrl={sender?.avatar_url}
              nickname={sender?.nickname}
              size={avatarSize}
              className="rounded-full object-cover"
              alt={sender?.nickname || 'Avatar'}
            />
          )}
        </div>
      )}

      {/* Message content */}
      <div
        className={`flex-1 max-w-[70%] ${
          isOwnMessage ? 'items-end' : 'items-start'
        } flex flex-col relative`}
      >
        {/* Sender name (for group chats) */}
        {showSenderName && !isOwnMessage && (
          <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {sender?.nickname || 'Unknown'}
          </span>
        )}

        {/* Message bubble */}
        <div
          className={`rounded-lg px-4 py-2 relative ${
            isOwnMessage
              ? `${ownMessageBgColor} ${ownMessageTextColor}`
              : `${otherMessageBgColor} ${otherMessageTextColor}`
          }`}
        >
          {isDeleted ? (
            <span className={`italic ${isOwnMessage ? 'opacity-70' : 'text-gray-500 dark:text-gray-400'}`}>
              {deletedMessageText}
            </span>
          ) : (
            <>
              {content && (
                <p className={`whitespace-pre-wrap break-words ${isOwnMessage ? '' : 'text-sm'}`}>
                  {content}
                </p>
              )}
              {imageUrl && (
                <MessageImage
                  imageUrl={imageUrl}
                  messageId={id}
                  alt="Message attachment"
                  priority={priority}
                  onClick={onImageClick ? () => onImageClick(imageUrl) : undefined}
                />
              )}
            </>
          )}

          {/* Reaction add button - shown on hover (PC) or click (mobile) - right next to message bubble */}
          {!isDeleted && onReactionClick && (showReactionButton || showReactionPicker) && (
            <div 
              className={`absolute top-1/2 -translate-y-1/2 z-10 ${
                isOwnMessage ? 'right-full mr-1' : 'left-full ml-1'
              }`}
              ref={pickerRef}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReactionPicker(!showReactionPicker);
                }}
                className="w-8 h-8 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-2 border-gray-300 dark:border-gray-600 shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 transition-colors"
                title={t('addReaction')}
              >
                <SmilePlus className="w-5 h-5 text-gray-500 dark:text-gray-400 stroke-[2.5]" style={{ fill: 'none' }} />
              </button>
              
              {/* Reaction picker */}
              {showReactionPicker && (
                <>
                  {/* Mobile overlay */}
                  <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReactionPicker(false);
                      setShowReactionButton(false);
                    }}
                  />
                  {/* Reaction picker */}
                  <div 
                    className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:absolute md:top-0 md:left-auto md:right-auto md:translate-x-0 md:translate-y-0 ${
                      isOwnMessage ? 'md:right-full md:mr-2' : 'md:left-full md:ml-2'
                    } bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 z-50 md:z-20 w-[90vw] max-w-[320px]`}
                  >
                  {/* Quick reactions row */}
                  <div className="flex gap-2 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                    {['like', 'love', 'haha', 'wow', 'sad'].map((type) => {
                      const emojiMap: Record<string, string> = {
                        like: '👍',
                        love: '❤️',
                        haha: '😂',
                        wow: '😮',
                        sad: '😢',
                      };
                      const isCurrentUserReacted = reactions?.some(
                        r => r.user_id === currentUserId && r.reaction_type === type
                      );
                      
                      return (
                        <button
                          key={type}
                          onClick={(e) => {
                            e.stopPropagation();
                            onReactionClick(type);
                            setShowReactionPicker(false);
                            setShowReactionButton(false);
                          }}
                          className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-110 ${
                            isCurrentUserReacted ? 'bg-blue-50 dark:bg-blue-900 ring-2 ring-blue-400 dark:ring-blue-600' : ''
                          }`}
                          title={t(`types.${type}` as any) || type}
                        >
                          <span className="text-2xl">{emojiMap[type]}</span>
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* All reactions grid */}
                  <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto">
                    {['like', 'love', 'haha', 'wow', 'sad', 'angry', 'thumbs_up', 'thumbs_down', 'clap', 'fire', 'party', 'pray', 'heart_eyes', 'kiss', 'thinking', 'cool', 'ok_hand', 'victory', 'muscle', 'point_up', 'point_down', 'wave', 'handshake', 'fist_bump', 'rocket', 'star', 'trophy', 'medal', 'crown', 'gem', 'balloon', 'cake', 'gift', 'confetti', 'sparkles', 'rainbow'].map((type) => {
                      const emojiMap: Record<string, string> = {
                        like: '👍', love: '❤️', haha: '😂', wow: '😮', sad: '😢', angry: '😠',
                        thumbs_up: '👍', thumbs_down: '👎', clap: '👏', fire: '🔥', party: '🎉', pray: '🙏',
                        heart_eyes: '😍', kiss: '😘', thinking: '🤔', cool: '😎', ok_hand: '👌', victory: '✌️',
                        muscle: '💪', point_up: '👆', point_down: '👇', wave: '👋', handshake: '🤝', fist_bump: '👊',
                        rocket: '🚀', star: '⭐', trophy: '🏆', medal: '🏅', crown: '👑', gem: '💎',
                        balloon: '🎈', cake: '🎂', gift: '🎁', confetti: '🎊', sparkles: '✨', rainbow: '🌈',
                      };
                      const isCurrentUserReacted = reactions?.some(
                        r => r.user_id === currentUserId && r.reaction_type === type
                      );
                      const isQuickReaction = ['like', 'love', 'haha', 'wow', 'sad'].includes(type);
                      
                      return (
                        <button
                          key={type}
                          onClick={(e) => {
                            e.stopPropagation();
                            onReactionClick(type);
                            setShowReactionPicker(false);
                            setShowReactionButton(false);
                          }}
                          className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-110 ${
                            isCurrentUserReacted ? 'bg-blue-50 dark:bg-blue-900 ring-2 ring-blue-400 dark:ring-blue-600' : ''
                          } ${isQuickReaction ? 'opacity-60' : ''}`}
                          title={t(`types.${type}` as any) || type}
                        >
                          <span className="text-xl">{emojiMap[type]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Reactions */}
        {!isDeleted && reactions && (
          <div className={`mt-1 ${isOwnMessage ? 'flex justify-end' : 'flex justify-start'}`}>
            <MessageReactions
              reactions={reactions}
              currentUserId={currentUserId}
              onReactionClick={onReactionClick}
              messagePosition={isOwnMessage ? 'right' : 'left'}
              showAddButton={false}
            />
          </div>
        )}

        {/* Timestamp and delete button */}
        <div
          className={`flex items-center gap-2 mt-1 ${
            isOwnMessage ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <span className={`text-xs text-gray-500 dark:text-gray-400 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
            {formatTime(createdAt)}
          </span>
          {isOwnMessage && !isDeleted && onDelete && (
            <button
              onClick={() => onDelete(id)}
              disabled={isDeleting}
              className={`text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 transition-colors ${
                isOwnMessage ? '' : ''
              }`}
              title={deleteMessageTitle}
            >
              {isDeleting ? (
                <div className="w-3 h-3 border-4 border-red-600 dark:border-red-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
