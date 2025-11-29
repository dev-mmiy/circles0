'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageReaction } from '@/lib/api/messages';
import { GroupMessageReaction } from '@/lib/api/groups';
import { useTranslations } from 'next-intl';

// 36種類のリアクションタイプ（Facebook Messenger風）
export type ReactionType = 
  | 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry'
  | 'thumbs_up' | 'thumbs_down' | 'clap' | 'fire' | 'party' | 'pray'
  | 'heart_eyes' | 'kiss' | 'thinking' | 'cool' | 'ok_hand' | 'victory'
  | 'muscle' | 'point_up' | 'point_down' | 'wave' | 'handshake' | 'fist_bump'
  | 'rocket' | 'star' | 'trophy' | 'medal' | 'crown' | 'gem'
  | 'balloon' | 'cake' | 'gift' | 'confetti' | 'sparkles' | 'rainbow';

// クイックアクセス用の5つのリアクション
const QUICK_REACTIONS: ReactionType[] = ['like', 'love', 'haha', 'wow', 'sad'];

// 全36種類のリアクション
const ALL_REACTIONS: ReactionType[] = [
  'like', 'love', 'haha', 'wow', 'sad', 'angry',
  'thumbs_up', 'thumbs_down', 'clap', 'fire', 'party', 'pray',
  'heart_eyes', 'kiss', 'thinking', 'cool', 'ok_hand', 'victory',
  'muscle', 'point_up', 'point_down', 'wave', 'handshake', 'fist_bump',
  'rocket', 'star', 'trophy', 'medal', 'crown', 'gem',
  'balloon', 'cake', 'gift', 'confetti', 'sparkles', 'rainbow',
];

// リアクションタイプから絵文字へのマッピング
const REACTION_EMOJI_MAP: Record<ReactionType, string> = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😠',
  thumbs_up: '👍',
  thumbs_down: '👎',
  clap: '👏',
  fire: '🔥',
  party: '🎉',
  pray: '🙏',
  heart_eyes: '😍',
  kiss: '😘',
  thinking: '🤔',
  cool: '😎',
  ok_hand: '👌',
  victory: '✌️',
  muscle: '💪',
  point_up: '👆',
  point_down: '👇',
  wave: '👋',
  handshake: '🤝',
  fist_bump: '👊',
  rocket: '🚀',
  star: '⭐',
  trophy: '🏆',
  medal: '🏅',
  crown: '👑',
  gem: '💎',
  balloon: '🎈',
  cake: '🎂',
  gift: '🎁',
  confetti: '🎊',
  sparkles: '✨',
  rainbow: '🌈',
};

interface MessageReactionsProps {
  reactions: (MessageReaction | GroupMessageReaction)[];
  currentUserId?: string;
  onReactionClick?: (reactionType: ReactionType) => void;
  messagePosition?: 'left' | 'right';
  showAddButton?: boolean; // 追加ボタンを表示するかどうか
}

export default function MessageReactions({
  reactions = [],
  currentUserId,
  onReactionClick,
  messagePosition = 'left',
  showAddButton = false, // デフォルトは非表示
}: MessageReactionsProps) {
  const t = useTranslations('messages.reactions');
  const [showPicker, setShowPicker] = useState(false);
  const [showUsersPanel, setShowUsersPanel] = useState<string | null>(null);
  const [usersPanelPosition, setUsersPanelPosition] = useState<{ top: number; left: number } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const usersPanelRef = useRef<HTMLDivElement>(null);
  const reactionButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const hoverTimeoutRef = useRef<Record<string, NodeJS.Timeout | null>>({});
  const touchStartTimeRef = useRef<Record<string, number | null>>({});
  const longPressTimeoutRef = useRef<Record<string, NodeJS.Timeout | null>>({});
  
  // Group reactions by type
  const reactionsByType = reactions.reduce((acc, reaction) => {
    const type = reaction.reaction_type as ReactionType;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(reaction);
    return acc;
  }, {} as Record<ReactionType, (MessageReaction | GroupMessageReaction)[]>);

  // 実際に使われているリアクションを表示（最大5個まで）
  const displayedReactions = Object.entries(reactionsByType).slice(0, 5);

  // パネル外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
      if (usersPanelRef.current && !usersPanelRef.current.contains(event.target as Node)) {
        // リアクションボタン以外をクリックした場合のみ閉じる
        const clickedReactionButton = Object.values(reactionButtonRefs.current).some(
          ref => ref && ref.contains(event.target as Node)
        );
        if (!clickedReactionButton) {
          setShowUsersPanel(null);
          setUsersPanelPosition(null);
        }
      }
    };

    if (showPicker || showUsersPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [showPicker, showUsersPanel]);

  // クリーンアップ: タイマーをクリア
  useEffect(() => {
    return () => {
      Object.values(hoverTimeoutRef.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
      Object.values(longPressTimeoutRef.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  // ユーザーパネルを表示する関数
  const showUsersPanelForReaction = (reactionType: ReactionType) => {
    const button = reactionButtonRefs.current[reactionType];
    if (button) {
      const rect = button.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      // Calculate position relative to viewport
      let left = messagePosition === 'right' ? rect.right - 200 : rect.left;
      
      // Ensure panel doesn't go off screen
      if (left + 200 > window.innerWidth) {
        left = window.innerWidth - 200 - 10;
      }
      if (left < 10) {
        left = 10;
      }
      
      setUsersPanelPosition({
        top: rect.bottom + scrollTop + 4,
        left: left + scrollLeft,
      });
      setShowUsersPanel(reactionType);
    }
  };

  // リアクションアイコンのクリック処理（追加/削除のみ）
  const handleReactionIconClick = (reactionType: ReactionType, event: React.MouseEvent | React.TouchEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    // マウスオーバーによるpopup表示をキャンセル
    if (hoverTimeoutRef.current[reactionType]) {
      clearTimeout(hoverTimeoutRef.current[reactionType]!);
      hoverTimeoutRef.current[reactionType] = null;
    }
    
    // 既に表示されているpopupを閉じる
    if (showUsersPanel === reactionType) {
      setShowUsersPanel(null);
      setUsersPanelPosition(null);
    }
    
    // クリック時はリアクションの追加/削除のみを行う
    // APIは既にトグル機能を持っているので、同じリアクションタイプを再度送信すると削除される
    // 既にユーザーがそのリアクションタイプでリアクションしている場合、クリックで取り消しになる
    if (onReactionClick) {
      // 既にユーザーがそのリアクションタイプでリアクションしているかチェック
      const typeReactions = reactionsByType[reactionType] || [];
      const isCurrentUserReacted = typeReactions.some(r => r.user_id === currentUserId);
      
      // 既にリアクションしている場合でも、APIがトグル機能を持っているので、そのまま呼び出す
      // API側で同じリアクションタイプの場合は削除される
      onReactionClick(reactionType);
    }
  };

  // PC版: マウスオーバー処理（一定時間後にpopup表示）
  const handleMouseEnter = (reactionType: ReactionType) => {
    // 既存のタイマーをクリア
    if (hoverTimeoutRef.current[reactionType]) {
      clearTimeout(hoverTimeoutRef.current[reactionType]!);
    }
    
    // 500ms後にpopupを表示
    hoverTimeoutRef.current[reactionType] = setTimeout(() => {
      showUsersPanelForReaction(reactionType);
    }, 500);
  };

  // PC版: マウスアウト処理
  const handleMouseLeave = (reactionType: ReactionType) => {
    // タイマーをクリア（パネルが表示されていない場合のみ）
    if (hoverTimeoutRef.current[reactionType]) {
      clearTimeout(hoverTimeoutRef.current[reactionType]!);
      hoverTimeoutRef.current[reactionType] = null;
    }
    // パネルが表示されている場合は、パネル自体のonMouseLeaveで閉じる処理が行われる
  };

  // モバイル版: タッチ開始処理
  const handleTouchStart = (reactionType: ReactionType, event: React.TouchEvent) => {
    touchStartTimeRef.current[reactionType] = Date.now();
    
    // 長押し検出用のタイマー（500ms）
    longPressTimeoutRef.current[reactionType] = setTimeout(() => {
      showUsersPanelForReaction(reactionType);
    }, 500);
  };

  // モバイル版: タッチ終了処理
  const handleTouchEnd = (reactionType: ReactionType, event: React.TouchEvent) => {
    // 長押しタイマーをクリア
    if (longPressTimeoutRef.current[reactionType]) {
      clearTimeout(longPressTimeoutRef.current[reactionType]!);
      longPressTimeoutRef.current[reactionType] = null;
    }
    
    // 短いタッチ（クリック）の場合はリアクションの追加/削除
    const touchDuration = touchStartTimeRef.current[reactionType] 
      ? Date.now() - touchStartTimeRef.current[reactionType]!
      : 0;
    
    if (touchDuration < 500) {
      // 短いタッチなので、クリックとして扱う
      handleReactionIconClick(reactionType, event);
    }
    
    touchStartTimeRef.current[reactionType] = null;
  };

  // モバイル版: タッチキャンセル処理
  const handleTouchCancel = (reactionType: ReactionType) => {
    if (longPressTimeoutRef.current[reactionType]) {
      clearTimeout(longPressTimeoutRef.current[reactionType]!);
      longPressTimeoutRef.current[reactionType] = null;
    }
    touchStartTimeRef.current[reactionType] = null;
  };

  if (reactions.length === 0 && !onReactionClick) {
    return null;
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1 flex-wrap">
        {/* Display reactions (show up to 5, then show "+" button) */}
        {displayedReactions.map(([type, typeReactions]) => {
          const reactionType = type as ReactionType;
          const isCurrentUserReacted = typeReactions.some(r => r.user_id === currentUserId);
          
          return (
            <button
              key={type}
              ref={(el) => {
                reactionButtonRefs.current[reactionType] = el;
              }}
              onClick={(e) => handleReactionIconClick(reactionType, e)}
              onMouseEnter={() => handleMouseEnter(reactionType)}
              onMouseLeave={() => handleMouseLeave(reactionType)}
              onTouchStart={(e) => handleTouchStart(reactionType, e)}
              onTouchEnd={(e) => handleTouchEnd(reactionType, e)}
              onTouchCancel={() => handleTouchCancel(reactionType)}
              className={`relative flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all hover:scale-110 ${
                isCurrentUserReacted
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 ring-2 ring-blue-400 dark:ring-blue-600'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={`${REACTION_EMOJI_MAP[reactionType] || '👍'} ${t(`types.${reactionType}` as any) || reactionType} ${typeReactions.length}`}
            >
              <span className="text-base">{REACTION_EMOJI_MAP[reactionType] || '👍'}</span>
              {typeReactions.length > 1 && (
                <span className="text-xs font-medium">{typeReactions.length}</span>
              )}
            </button>
          );
        })}
        
        {/* Add reaction button */}
        {onReactionClick && showAddButton && (
          <div className="relative" ref={pickerRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPicker(!showPicker);
                setShowUsersPanel(null);
              }}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              title={t('addReaction') || 'Add reaction'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            
            {/* Reaction picker */}
            {showPicker && (
              <div 
                className={`absolute bottom-full mb-2 ${
                  messagePosition === 'right' ? 'right-0' : 'left-0'
                } bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 z-30`}
                style={{ minWidth: '280px' }}
              >
                {/* Quick reactions row */}
                <div className="flex gap-2 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                  {QUICK_REACTIONS.map((type) => {
                    const isCurrentUserReacted = reactions.some(
                      r => r.user_id === currentUserId && r.reaction_type === type
                    );
                    
                    return (
                      <button
                        key={type}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReactionClick(type);
                          setShowPicker(false);
                        }}
                        className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-110 ${
                          isCurrentUserReacted ? 'bg-blue-50 dark:bg-blue-900 ring-2 ring-blue-400 dark:ring-blue-600' : ''
                        }`}
                        title={t(`types.${type}` as any) || type}
                      >
                        <span className="text-2xl">{REACTION_EMOJI_MAP[type]}</span>
                      </button>
                    );
                  })}
                </div>
                
                {/* All reactions grid */}
                <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto">
                  {ALL_REACTIONS.map((type) => {
                    const isCurrentUserReacted = reactions.some(
                      r => r.user_id === currentUserId && r.reaction_type === type
                    );
                    const isQuickReaction = QUICK_REACTIONS.includes(type);
                    
                    return (
                      <button
                        key={type}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReactionClick(type);
                          setShowPicker(false);
                        }}
                        className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-110 ${
                          isCurrentUserReacted ? 'bg-blue-50 dark:bg-blue-900 ring-2 ring-blue-400 dark:ring-blue-600' : ''
                        } ${isQuickReaction ? 'opacity-60' : ''}`}
                        title={t(`types.${type}` as any) || type}
                      >
                        <span className="text-xl">{REACTION_EMOJI_MAP[type]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Users panel (Facebook Messenger style - compact, below reaction icon) */}
      {showUsersPanel && usersPanelPosition && reactionsByType[showUsersPanel] && (
        <div
          ref={usersPanelRef}
          className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-40"
          style={{
            top: `${usersPanelPosition.top}px`,
            left: `${usersPanelPosition.left}px`,
            minWidth: '200px',
            maxWidth: '300px',
          }}
          onMouseEnter={() => {
            // パネル上にマウスがある場合は閉じない
            if (hoverTimeoutRef.current[showUsersPanel]) {
              clearTimeout(hoverTimeoutRef.current[showUsersPanel]!);
              hoverTimeoutRef.current[showUsersPanel] = null;
            }
          }}
          onMouseLeave={() => {
            // パネルからマウスが離れたら閉じる
            setShowUsersPanel(null);
            setUsersPanelPosition(null);
          }}
        >
          <div className="px-3 py-1 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {REACTION_EMOJI_MAP[showUsersPanel as ReactionType]} {reactionsByType[showUsersPanel].length} {t('usersWhoReacted') || 'users'}
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {reactionsByType[showUsersPanel].map((reaction) => (
              <div
                key={reaction.id}
                className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                  {reaction.user?.nickname || 'Unknown User'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
