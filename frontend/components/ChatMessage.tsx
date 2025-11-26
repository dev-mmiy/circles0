/**
 * ChatMessage Component
 * 
 * Common component for displaying chat messages in both direct messages and group chats
 */

import { Trash2 } from 'lucide-react';
import Avatar from './Avatar';
import MessageImage from './MessageImage';

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
  otherMessageBgColor = 'bg-white border border-gray-200',
  otherMessageTextColor = 'text-gray-900',
  avatarSize = 32,
}: ChatMessageProps) {
  return (
    <div className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {showAvatar && (
        <div className="flex-shrink-0 relative" style={{ width: avatarSize, height: avatarSize }}>
          <Avatar
            avatarUrl={sender?.avatar_url}
            nickname={sender?.nickname}
            size={avatarSize}
            className="rounded-full object-cover"
            alt={sender?.nickname || 'Avatar'}
          />
        </div>
      )}

      {/* Message content */}
      <div
        className={`flex-1 max-w-[70%] ${
          isOwnMessage ? 'items-end' : 'items-start'
        } flex flex-col`}
      >
        {/* Sender name (for group chats) */}
        {showSenderName && !isOwnMessage && (
          <span className="text-xs text-gray-500 mb-1">
            {sender?.nickname || 'Unknown'}
          </span>
        )}

        {/* Message bubble */}
        <div
          className={`rounded-lg px-4 py-2 ${
            isOwnMessage
              ? `${ownMessageBgColor} ${ownMessageTextColor}`
              : `${otherMessageBgColor} ${otherMessageTextColor}`
          }`}
        >
          {isDeleted ? (
            <span className={`italic ${isOwnMessage ? 'opacity-70' : 'text-gray-500'}`}>
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
                />
              )}
            </>
          )}
        </div>

        {/* Timestamp and delete button */}
        <div
          className={`flex items-center gap-2 mt-1 ${
            isOwnMessage ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <span className={`text-xs text-gray-500 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
            {formatTime(createdAt)}
          </span>
          {isOwnMessage && !isDeleted && onDelete && (
            <button
              onClick={() => onDelete(id)}
              disabled={isDeleting}
              className={`text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors ${
                isOwnMessage ? '' : ''
              }`}
              title={deleteMessageTitle}
            >
              {isDeleting ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Delete button for own messages (alternative position) */}
      {isOwnMessage && !isDeleted && onDelete && (
        <button
          onClick={() => onDelete(id)}
          disabled={isDeleting}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
          title={deleteMessageTitle}
        >
          {isDeleting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );
}

