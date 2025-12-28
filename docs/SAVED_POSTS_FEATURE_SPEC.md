# 投稿の保存・ブックマーク機能 詳細仕様

**作成日**: 2025-11-27  
**機能名**: Saved Posts / Bookmark Feature  
**優先度**: 最高

---

## 📋 概要

ユーザーが興味のある投稿を保存し、後で簡単にアクセスできるようにする機能です。SNSでよく見られる「後で読む」機能に相当します。

---

## 🎯 機能要件

### 1. コア機能

#### 1.1 投稿の保存/解除
- **保存**: 投稿カードに保存アイコンを追加し、クリックで保存
- **解除**: 保存済みの投稿から保存アイコンをクリックで解除
- **状態表示**: 保存済みかどうかを視覚的に表示（アイコンの塗りつぶし、色の変更）
- **ツールチップ**: ホバー時に「保存」/「保存解除」のテキストを表示
- **即座のフィードバック**: 保存/解除時にトースト通知を表示

#### 1.2 保存した投稿一覧ページ
- **ページURL**: `/saved-posts` または `/posts/saved`
- **ページタイトル**: 「保存した投稿」/ "Saved Posts"
- **表示内容**:
  - 保存した投稿のリスト（PostCardコンポーネントを使用）
  - 保存日時の表示
  - 投稿の公開範囲に応じた表示制御
- **ページネーション**: 無限スクロール（20件ずつ読み込み）

#### 1.3 検索・フィルタリング機能
- **検索**: 保存した投稿の内容で検索（将来実装）
- **フィルタリング**:
  - 保存日時でソート（新しい順/古い順）
  - 投稿日時でソート（新しい順/古い順）
  - 投稿者でフィルタ（将来実装）

#### 1.4 通知機能（将来実装）
- 保存した投稿が更新された場合の通知
- 保存した投稿に新しいコメントが追加された場合の通知

---

## 🗄️ データベース設計

### テーブル: `saved_posts`

```sql
CREATE TABLE saved_posts (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 外部キー
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    
    -- メタデータ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    UNIQUE(user_id, post_id)
);

-- インデックス
CREATE INDEX idx_saved_posts_user_id ON saved_posts(user_id);
CREATE INDEX idx_saved_posts_user_created_at ON saved_posts(user_id, created_at DESC);
CREATE INDEX idx_saved_posts_post_id ON saved_posts(post_id);
```

**インデックスの説明**:
- `idx_saved_posts_user_id`: ユーザーごとの保存一覧取得を高速化
- `idx_saved_posts_user_created_at`: 保存日時順のソートを高速化
- `idx_saved_posts_post_id`: 投稿が削除された際の整合性チェック用

### マイグレーションファイル

**ファイル名**: `backend/alembic/versions/add_saved_posts_table_YYYYMMDD.py`

```python
"""add saved_posts table

Revision ID: add_saved_posts_table_YYYYMMDD
Revises: <previous_revision>
Create Date: YYYY-MM-DD HH:MM:SS.XXXXXX

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = 'add_saved_posts_table_YYYYMMDD'
down_revision: Union[str, None] = '<previous_revision>'
branch_labels: Union[Sequence[str], None] = None
depends_on: Union[Sequence[str], None] = None


def upgrade() -> None:
    # Create saved_posts table
    op.create_table(
        'saved_posts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('post_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', 'post_id', name='uq_saved_posts_user_post')
    )
    
    # Create indexes
    op.create_index('idx_saved_posts_user_id', 'saved_posts', ['user_id'])
    op.create_index('idx_saved_posts_user_created_at', 'saved_posts', ['user_id', sa.text('created_at DESC')])
    op.create_index('idx_saved_posts_post_id', 'saved_posts', ['post_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_saved_posts_post_id', table_name='saved_posts')
    op.drop_index('idx_saved_posts_user_created_at', table_name='saved_posts')
    op.drop_index('idx_saved_posts_user_id', table_name='saved_posts')
    
    # Drop table
    op.drop_table('saved_posts')
```

---

## 🔧 バックエンド実装

### 1. データモデル

**ファイル**: `backend/app/models/post.py`

```python
class SavedPost(Base):
    """
    Saved post model.
    
    Tracks which posts users have saved for later reading.
    """
    
    __tablename__ = "saved_posts"
    
    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    post_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="saved_posts")
    post = relationship("Post", back_populates="saved_by_users")
    
    __table_args__ = (
        UniqueConstraint('user_id', 'post_id', name='uq_saved_posts_user_post'),
    )
```

**Userモデルへの追加**:
```python
saved_posts = relationship("SavedPost", back_populates="user", cascade="all, delete-orphan")
```

**Postモデルへの追加**:
```python
saved_by_users = relationship("SavedPost", back_populates="post", cascade="all, delete-orphan")
```

### 2. スキーマ

**ファイル**: `backend/app/schemas/post.py`

```python
class SavedPostCreate(BaseModel):
    """Schema for creating a saved post."""
    post_id: UUID


class SavedPostResponse(BaseModel):
    """Schema for saved post response."""
    id: UUID
    user_id: UUID
    post_id: UUID
    created_at: datetime
    post: Optional[PostResponse] = None  # Include post details if needed
    
    class Config:
        from_attributes = True


class SavedPostListResponse(BaseModel):
    """Schema for saved posts list response."""
    items: List[PostResponse]  # Use PostResponse to include full post details
    total: int
    skip: int
    limit: int
```

### 3. サービス層

**ファイル**: `backend/app/services/post_service.py`

```python
class SavedPostService:
    """Service for saved post operations."""
    
    @staticmethod
    def save_post(db: Session, user_id: UUID, post_id: UUID) -> SavedPost:
        """
        Save a post for a user.
        
        Args:
            db: Database session
            user_id: User ID
            post_id: Post ID to save
            
        Returns:
            SavedPost instance
            
        Raises:
            ValueError: If post doesn't exist or is already saved
        """
        # Check if post exists and is active
        post = db.query(Post).filter(
            Post.id == post_id,
            Post.is_active == True
        ).first()
        
        if not post:
            raise ValueError("Post not found or inactive")
        
        # Check if already saved
        existing = db.query(SavedPost).filter(
            SavedPost.user_id == user_id,
            SavedPost.post_id == post_id
        ).first()
        
        if existing:
            raise ValueError("Post already saved")
        
        # Create saved post
        saved_post = SavedPost(
            user_id=user_id,
            post_id=post_id
        )
        db.add(saved_post)
        db.commit()
        db.refresh(saved_post)
        
        return saved_post
    
    @staticmethod
    def unsave_post(db: Session, user_id: UUID, post_id: UUID) -> bool:
        """
        Unsave a post for a user.
        
        Args:
            db: Database session
            user_id: User ID
            post_id: Post ID to unsave
            
        Returns:
            True if unsaved, False if not found
        """
        saved_post = db.query(SavedPost).filter(
            SavedPost.user_id == user_id,
            SavedPost.post_id == post_id
        ).first()
        
        if not saved_post:
            return False
        
        db.delete(saved_post)
        db.commit()
        return True
    
    @staticmethod
    def get_saved_posts(
        db: Session,
        user_id: UUID,
        current_user_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 20,
        sort_by: str = "created_at",  # "created_at" or "post_created_at"
        sort_order: str = "desc"  # "asc" or "desc"
    ) -> Tuple[List[Post], int]:
        """
        Get saved posts for a user.
        
        Args:
            db: Database session
            user_id: User ID to get saved posts for
            current_user_id: Current user ID (for visibility checks)
            skip: Number of posts to skip
            limit: Maximum number of posts to return
            sort_by: Sort by "created_at" (save date) or "post_created_at" (post date)
            sort_order: Sort order "asc" or "desc"
            
        Returns:
            Tuple of (list of posts, total count)
        """
        # Base query
        query = (
            db.query(SavedPost)
            .filter(SavedPost.user_id == user_id)
            .join(Post, SavedPost.post_id == Post.id)
            .filter(Post.is_active == True)
        )
        
        # Get total count
        total = query.count()
        
        # Apply sorting
        if sort_by == "created_at":
            order_column = SavedPost.created_at
        else:  # sort_by == "post_created_at"
            order_column = Post.created_at
        
        if sort_order == "desc":
            query = query.order_by(order_column.desc())
        else:
            query = query.order_by(order_column.asc())
        
        # Apply pagination
        saved_posts = query.offset(skip).limit(limit).all()
        
        # Get post IDs
        post_ids = [sp.post_id for sp in saved_posts]
        
        # Fetch posts with relationships
        posts = (
            db.query(Post)
            .options(
                joinedload(Post.user),
                joinedload(Post.likes).joinedload(PostLike.user),
                joinedload(Post.comments).joinedload(PostComment.user),
                joinedload(Post.images),
            )
            .filter(Post.id.in_(post_ids))
            .all()
        )
        
        # Sort posts to match saved_posts order
        post_dict = {post.id: post for post in posts}
        ordered_posts = [post_dict[post_id] for post_id in post_ids if post_id in post_dict]
        
        # Filter by visibility (same logic as get_feed)
        visible_posts = []
        for post in ordered_posts:
            if post.visibility == "private" and post.user_id != current_user_id:
                continue
            if post.visibility == "followers_only":
                if current_user_id is None:
                    continue
                if post.user_id != current_user_id:
                    from app.services.follow_service import FollowService
                    if not FollowService.is_following(db, current_user_id, post.user_id):
                        continue
            visible_posts.append(post)
        
        return visible_posts, total
    
    @staticmethod
    def is_post_saved(db: Session, user_id: UUID, post_id: UUID) -> bool:
        """
        Check if a post is saved by a user.
        
        Args:
            db: Database session
            user_id: User ID
            post_id: Post ID
            
        Returns:
            True if saved, False otherwise
        """
        saved_post = db.query(SavedPost).filter(
            SavedPost.user_id == user_id,
            SavedPost.post_id == post_id
        ).first()
        
        return saved_post is not None
    
    @staticmethod
    def get_saved_post_ids(
        db: Session,
        user_id: UUID,
        post_ids: List[UUID]
    ) -> List[UUID]:
        """
        Get list of post IDs that are saved by the user.
        
        Args:
            db: Database session
            user_id: User ID
            post_ids: List of post IDs to check
            
        Returns:
            List of post IDs that are saved
        """
        saved_posts = (
            db.query(SavedPost.post_id)
            .filter(
                SavedPost.user_id == user_id,
                SavedPost.post_id.in_(post_ids)
            )
            .all()
        )
        
        return [sp.post_id for sp in saved_posts]
```

### 4. APIエンドポイント

**ファイル**: `backend/app/api/posts.py`

```python
@router.post(
    "/{post_id}/save",
    status_code=status.HTTP_201_CREATED,
    summary="Save a post",
)
async def save_post(
    post_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Save a post for later reading.
    
    Requires authentication.
    """
    user_id = get_user_id_from_token(db, current_user)
    
    try:
        saved_post = SavedPostService.save_post(db, user_id, post_id)
        return {"message": "Post saved successfully", "id": saved_post.id}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete(
    "/{post_id}/save",
    status_code=status.HTTP_200_OK,
    summary="Unsave a post",
)
async def unsave_post(
    post_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Unsave a post.
    
    Requires authentication.
    """
    user_id = get_user_id_from_token(db, current_user)
    
    success = SavedPostService.unsave_post(db, user_id, post_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved post not found"
        )
    
    return {"message": "Post unsaved successfully"}


@router.get(
    "/saved",
    response_model=List[PostResponse],
    summary="Get saved posts",
)
async def get_saved_posts(
    skip: int = Query(0, ge=0, description="Number of posts to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of posts to return"),
    sort_by: str = Query(
        "created_at",
        regex="^(created_at|post_created_at)$",
        description="Sort by save date or post date"
    ),
    sort_order: str = Query(
        "desc",
        regex="^(asc|desc)$",
        description="Sort order"
    ),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get saved posts for the current user.
    
    Requires authentication.
    Posts are filtered by visibility settings.
    """
    user_id = get_user_id_from_token(db, current_user)
    
    posts, total = SavedPostService.get_saved_posts(
        db,
        user_id,
        current_user_id=user_id,
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    # Build response
    responses = []
    for post in posts:
        responses.append(_build_post_response(db, post, user_id))
    
    return responses


@router.get(
    "/saved/check",
    summary="Check if posts are saved",
)
async def check_saved_posts(
    post_ids: List[UUID] = Query(..., description="List of post IDs to check"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Check which posts are saved by the current user.
    
    Requires authentication.
    Returns a list of post IDs that are saved.
    """
    user_id = get_user_id_from_token(db, current_user)
    
    saved_post_ids = SavedPostService.get_saved_post_ids(db, user_id, post_ids)
    
    return {"saved_post_ids": saved_post_ids}
```

---

## 🎨 フロントエンド実装

### UIデザイン

保存アイコンは以下のように実装します：
- **位置**: コメントボタンとシェアボタンの間
- **アイコン**: ブックマークアイコン（未保存は枠線、保存済みは塗りつぶし）
- **色**: 
  - 未保存: グレー（`text-gray-500 dark:text-gray-400`）
  - 保存済み: 黄色系（`text-yellow-600 dark:text-yellow-400`）
- **ホバー効果**: 色が濃くなる（`hover:text-yellow-600 dark:hover:text-yellow-400`）
- **ツールチップ**: `title`属性で「保存」/「保存解除」を表示
- **サイズ**: 他のアクションボタンと同じサイズ（`w-5 h-5`）

### 1. APIクライアント

**ファイル**: `frontend/lib/api/posts.ts`

```typescript
/**
 * Save a post
 */
export async function savePost(
  postId: string,
  token: string
): Promise<void> {
  await apiClient.post(
    `/posts/${postId}/save`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/**
 * Unsave a post
 */
export async function unsavePost(
  postId: string,
  token: string
): Promise<void> {
  await apiClient.delete(`/posts/${postId}/save`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Get saved posts
 */
export async function getSavedPosts(
  skip: number = 0,
  limit: number = 20,
  sortBy: 'created_at' | 'post_created_at' = 'created_at',
  sortOrder: 'asc' | 'desc' = 'desc',
  token: string
): Promise<Post[]> {
  const response = await apiClient.get<Post[]>(`/posts/saved`, {
    params: {
      skip,
      limit,
      sort_by: sortBy,
      sort_order: sortOrder,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}

/**
 * Check if posts are saved
 */
export async function checkSavedPosts(
  postIds: string[],
  token: string
): Promise<string[]> {
  const response = await apiClient.get<{ saved_post_ids: string[] }>(
    `/posts/saved/check`,
    {
      params: {
        post_ids: postIds.join(','),
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.saved_post_ids;
}
```

### 2. PostCardコンポーネントの拡張

**ファイル**: `frontend/components/PostCard.tsx`

```typescript
// 追加するインポート
import { savePost, unsavePost } from '@/lib/api/posts';

// 追加する状態
const [isSaved, setIsSaved] = useState(false);
const [isSaving, setIsSaving] = useState(false);

// 追加する関数
const handleSaveToggle = async () => {
  if (!isAuthenticated || !user) {
    toast.error(t('errors.authenticationRequired'));
    return;
  }

  setIsSaving(true);
  try {
    const token = await getAccessTokenSilently();
    
    if (isSaved) {
      await unsavePost(post.id, token);
      setIsSaved(false);
      toast.success(t('savedPosts.unsaved'));
    } else {
      await savePost(post.id, token);
      setIsSaved(true);
      toast.success(t('savedPosts.saved'));
    }
  } catch (error) {
    debugLog.error('Failed to toggle save:', error);
    toast.error(t('savedPosts.saveFailed'));
  } finally {
    setIsSaving(false);
  }
};

// UIに追加する保存アイコン（コメントボタンとシェアボタンの間）
<button
  onClick={handleSaveToggle}
  disabled={isSaving}
  className={`transition-colors ${
    isSaved
      ? 'text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300'
      : 'text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400'
  } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
  title={isSaved ? t('savedPosts.unsave') : t('savedPosts.save')}
  aria-label={isSaved ? t('savedPosts.unsave') : t('savedPosts.save')}
>
  <svg
    className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`}
    fill={isSaved ? 'currentColor' : 'none'}
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
    />
  </svg>
</button>
```

**初期状態の設定**:
- 投稿一覧を取得する際に、保存状態も一緒に取得する必要があります
- `getFeed`や`getSavedPosts`のレスポンスに`is_saved`フィールドを追加するか、別途`checkSavedPosts`を呼び出す

### 3. 保存した投稿一覧ページ

**ファイル**: `frontend/app/[locale]/posts/saved/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth0 } from '@auth0/auth0-react';
import PostCard from '@/components/PostCard';
import Header from '@/components/Header';
import { useDataLoader } from '@/lib/hooks/useDataLoader';
import { getSavedPosts, type Post } from '@/lib/api/posts';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { extractErrorInfo } from '@/lib/utils/errorHandler';

export default function SavedPostsPage() {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const t = useTranslations('savedPosts');
  const [sortBy, setSortBy] = useState<'created_at' | 'post_created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const {
    items: posts,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    retry,
    clearError,
  } = useDataLoader<Post>({
    loadFn: async (skip, limit) => {
      if (!isAuthenticated) {
        throw new Error('Authentication required');
      }
      const token = await getAccessTokenSilently();
      const fetchedPosts = await getSavedPosts(
        skip,
        limit,
        sortBy,
        sortOrder,
        token
      );
      return {
        items: fetchedPosts,
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
  });

  // 認証チェック
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">{t('authenticationRequired')}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t('pleaseLogin')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* ヘッダー */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">{t('pageTitle')}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t('pageSubtitle')}</p>
          </div>

          {/* ソートオプション */}
          <div className="mb-6 flex items-center space-x-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'created_at' | 'post_created_at')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="created_at">{t('sortBy.saveDate')}</option>
              <option value="post_created_at">{t('sortBy.postDate')}</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="desc">{t('sortOrder.newest')}</option>
              <option value="asc">{t('sortOrder.oldest')}</option>
            </select>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="mb-6">
              <ErrorDisplay
                error={extractErrorInfo(error)}
                onRetry={retry}
                onDismiss={clearError}
              />
            </div>
          )}

          {/* 投稿一覧 */}
          {isLoading && posts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">{t('loading')}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
              <h2 className="text-xl font-semibold mb-2">{t('noSavedPosts')}</h2>
              <p className="text-gray-600 dark:text-gray-400">{t('noSavedPostsMessage')}</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onPostDeleted={() => {
                      // 削除された投稿をリストから削除
                      // useDataLoaderのrefreshを呼び出す
                    }}
                  />
                ))}
              </div>

              {/* もっと見るボタン */}
              {hasMore && (
                <div className="mt-6 text-center">
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingMore ? t('loadingMore') : t('loadMore')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 4. ナビゲーションへの追加

**ファイル**: `frontend/components/Header.tsx`

```typescript
// ナビゲーションメニューに追加
<Link
  href="/posts/saved"
  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
>
  {t('navigation.savedPosts')}
</Link>
```

---

## 🌐 多言語対応

### 翻訳キー

**ファイル**: `frontend/messages/ja.json` と `frontend/messages/en.json`

```json
{
  "savedPosts": {
    "pageTitle": "保存した投稿",
    "pageSubtitle": "後で読むために保存した投稿を管理します",
    "save": "保存",
    "unsave": "保存解除",
    "saved": "投稿を保存しました",
    "unsaved": "保存を解除しました",
    "saveFailed": "保存に失敗しました",
    "loading": "読み込み中...",
    "loadingMore": "読み込み中...",
    "loadMore": "もっと見る",
    "noSavedPosts": "保存した投稿がありません",
    "noSavedPostsMessage": "気になる投稿を見つけたら、保存アイコンをクリックして保存できます。",
    "sortBy": {
      "saveDate": "保存日時",
      "postDate": "投稿日時"
    },
    "sortOrder": {
      "newest": "新しい順",
      "oldest": "古い順"
    },
    "authenticationRequired": "ログインが必要です",
    "pleaseLogin": "保存した投稿を表示するには、ログインしてください。"
  },
  "navigation": {
    "savedPosts": "保存した投稿"
  },
  "post": {
    "saved": "保存済み",
    "save": "保存"
  }
}
```

**英語版** (`frontend/messages/en.json`):
```json
{
  "savedPosts": {
    "pageTitle": "Saved Posts",
    "pageSubtitle": "Manage posts you've saved for later reading",
    "save": "Save",
    "unsave": "Unsave",
    "saved": "Post saved",
    "unsaved": "Post unsaved",
    "saveFailed": "Failed to save post",
    "loading": "Loading...",
    "loadingMore": "Loading...",
    "loadMore": "Load More",
    "noSavedPosts": "No saved posts",
    "noSavedPostsMessage": "When you find interesting posts, click the save icon to save them.",
    "sortBy": {
      "saveDate": "Save Date",
      "postDate": "Post Date"
    },
    "sortOrder": {
      "newest": "Newest First",
      "oldest": "Oldest First"
    },
    "authenticationRequired": "Authentication Required",
    "pleaseLogin": "Please log in to view your saved posts."
  },
  "navigation": {
    "savedPosts": "Saved Posts"
  },
  "post": {
    "saved": "Saved",
    "save": "Save"
  }
}
```

---

## ✅ 実装チェックリスト

### バックエンド
- [ ] データベースマイグレーションの作成
- [ ] `SavedPost`モデルの実装
- [ ] `SavedPostService`の実装
- [ ] APIエンドポイントの実装
- [ ] ユニットテストの作成
- [ ] 統合テストの作成

### フロントエンド
- [ ] APIクライアント関数の実装
- [ ] `PostCard`コンポーネントへの保存アイコン追加（アイコンのみ）
- [ ] 保存した投稿一覧ページの作成
- [ ] ナビゲーションへのリンク追加
- [ ] 翻訳キーの追加（日本語・英語）
- [ ] エラーハンドリングの実装
- [ ] ローディング状態の実装
- [ ] ツールチップ（title属性）の実装
- [ ] アクセシビリティ対応（aria-label）の実装

### テスト
- [ ] 保存/解除機能のテスト
- [ ] 保存した投稿一覧のテスト
- [ ] ページネーションのテスト
- [ ] ソート機能のテスト
- [ ] 認証チェックのテスト
- [ ] 公開範囲によるフィルタリングのテスト

### ドキュメント
- [ ] APIドキュメントの更新
- [ ] ユーザーガイドの作成（オプション）

---

## 🚀 実装順序

1. **Phase 1: バックエンド基盤** (1-2日)
   - データベースマイグレーション
   - モデル・スキーマの実装
   - サービス層の実装
   - 基本的なAPIエンドポイント

2. **Phase 2: フロントエンド基本機能** (1-2日)
   - APIクライアントの実装
   - PostCardへの保存アイコン追加（アイコンのみ）
   - 保存した投稿一覧ページの作成

3. **Phase 3: 機能拡張** (0.5-1日)
   - ソート機能
   - エラーハンドリングの改善
   - UI/UXの改善

4. **Phase 4: テスト・ドキュメント** (0.5日)
   - テストの作成
   - ドキュメントの更新

---

## 📝 注意事項

1. **パフォーマンス**: 大量の保存がある場合、インデックスが重要
2. **公開範囲**: 保存した投稿でも、元の投稿の公開範囲設定を尊重
3. **削除された投稿**: 投稿が削除された場合、保存も自動的に削除（CASCADE）
4. **重複防止**: 同じ投稿を複数回保存できないようにする（UNIQUE制約）

---

**最終更新**: 2025-11-27

