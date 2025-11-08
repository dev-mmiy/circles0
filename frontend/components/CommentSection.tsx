'use client';

import { useAuth0 } from '@auth0/auth0-react';
import Link from 'next/link';
import { useState } from 'react';
import {
  createComment,
  getCommentReplies,
  type Comment,
  type CreateCommentData,
} from '@/lib/api/posts';

interface CommentSectionProps {
  postId: string;
  initialComments: Comment[];
  onCommentAdded?: () => void;
}

export default function CommentSection({
  postId,
  initialComments,
  onCommentAdded,
}: CommentSectionProps) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      alert('コメントするにはログインが必要です');
      return;
    }

    if (!newCommentContent.trim()) {
      setError('コメント内容を入力してください');
      return;
    }

    if (newCommentContent.length > 2000) {
      setError('コメントは2000文字以内にしてください');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const accessToken = await getAccessTokenSilently();

      const commentData: CreateCommentData = {
        content: newCommentContent.trim(),
      };

      const newComment = await createComment(postId, commentData, accessToken);

      // Add new comment to the list
      setComments([newComment, ...comments]);
      setNewCommentContent('');

      // Notify parent
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (err: any) {
      console.error('Failed to create comment:', err);
      setError(err.message || 'コメントの投稿に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">
        コメント ({comments.length})
      </h3>

      {/* Comment form */}
      <form onSubmit={handleSubmitComment} className="mb-6">
        <textarea
          value={newCommentContent}
          onChange={(e) => setNewCommentContent(e.target.value)}
          placeholder="コメントを追加..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
          maxLength={2000}
          disabled={isSubmitting || !isAuthenticated}
        />

        <div className="flex items-center justify-between mt-2">
          <span
            className={`text-sm ${
              newCommentContent.length > 1800 ? 'text-red-500' : 'text-gray-500'
            }`}
          >
            {newCommentContent.length} / 2000
          </span>

          <button
            type="submit"
            disabled={isSubmitting || !newCommentContent.trim() || !isAuthenticated}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isSubmitting || !newCommentContent.trim() || !isAuthenticated
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? 'コメント中...' : 'コメントする'}
          </button>
        </div>

        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!isAuthenticated && (
          <p className="mt-2 text-sm text-gray-500">
            コメントするには<Link href="/login" className="text-blue-600 hover:underline">ログイン</Link>してください
          </p>
        )}
      </form>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            まだコメントがありません
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              onReplyAdded={() => {
                if (onCommentAdded) {
                  onCommentAdded();
                }
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Individual comment item component
interface CommentItemProps {
  comment: Comment;
  postId: string;
  onReplyAdded?: () => void;
  isReply?: boolean;
}

function CommentItem({
  comment,
  postId,
  onReplyAdded,
  isReply = false,
}: CommentItemProps) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60)
      );
      return diffInMinutes < 1 ? 'たった今' : `${diffInMinutes}分前`;
    } else if (diffInHours < 24) {
      return `${diffInHours}時間前`;
    } else {
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // Load replies
  const handleLoadReplies = async () => {
    if (showReplies) {
      setShowReplies(false);
      return;
    }

    setLoadingReplies(true);
    try {
      const fetchedReplies = await getCommentReplies(comment.id);
      setReplies(fetchedReplies);
      setShowReplies(true);
    } catch (error) {
      console.error('Failed to load replies:', error);
      alert('返信の読み込みに失敗しました');
    } finally {
      setLoadingReplies(false);
    }
  };

  // Submit reply
  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      alert('返信するにはログインが必要です');
      return;
    }

    if (!replyContent.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const accessToken = await getAccessTokenSilently();

      const replyData: CreateCommentData = {
        content: replyContent.trim(),
        parent_comment_id: comment.id,
      };

      const newReply = await createComment(postId, replyData, accessToken);

      // Add reply to the list
      setReplies([...replies, newReply]);
      setReplyContent('');
      setShowReplyForm(false);
      setShowReplies(true);

      // Notify parent
      if (onReplyAdded) {
        onReplyAdded();
      }
    } catch (error) {
      console.error('Failed to create reply:', error);
      alert('返信の投稿に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${isReply ? 'ml-8' : ''}`}>
      <div className="flex space-x-3">
        {/* Avatar */}
        <Link href={`/profile/${comment.user_id}`}>
          {comment.author?.avatar_url ? (
            <img
              src={comment.author.avatar_url}
              alt={comment.author.nickname}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
              <span className="text-gray-600 font-semibold text-xs">
                {comment.author?.nickname?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          )}
        </Link>

        {/* Comment content */}
        <div className="flex-1">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Link
                href={`/profile/${comment.user_id}`}
                className="font-semibold text-sm text-gray-900 hover:underline"
              >
                {comment.author?.nickname || 'Unknown User'}
              </Link>
              <span className="text-xs text-gray-500">
                {formatDate(comment.created_at)}
              </span>
            </div>
            <p className="text-gray-800 text-sm whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4 mt-1 ml-2">
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-sm text-gray-500 hover:text-blue-600"
              disabled={!isAuthenticated}
            >
              返信
            </button>

            {comment.reply_count > 0 && !isReply && (
              <button
                onClick={handleLoadReplies}
                className="text-sm text-blue-600 hover:underline"
                disabled={loadingReplies}
              >
                {loadingReplies
                  ? '読み込み中...'
                  : showReplies
                  ? '返信を非表示'
                  : `返信を表示 (${comment.reply_count})`}
              </button>
            )}
          </div>

          {/* Reply form */}
          {showReplyForm && (
            <form onSubmit={handleSubmitReply} className="mt-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="返信を入力..."
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                rows={2}
                maxLength={2000}
                disabled={isSubmitting}
              />
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyContent('');
                  }}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  disabled={isSubmitting}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !replyContent.trim()}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    isSubmitting || !replyContent.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isSubmitting ? '送信中...' : '返信'}
                </button>
              </div>
            </form>
          )}

          {/* Replies */}
          {showReplies && replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  onReplyAdded={onReplyAdded}
                  isReply={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
