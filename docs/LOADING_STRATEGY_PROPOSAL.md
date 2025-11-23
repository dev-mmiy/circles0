# 統一ロード管理戦略の提案

## 現状の問題点

1. **一貫性の欠如**: 各ページで異なるロードパターンを使用
   - `feed/page.tsx`: `useAuthWithLoader`を使用
   - `messages/page.tsx`: `useAuthWithLoader` + 複雑なref管理
   - `groups/page.tsx`: 直接`useAuth0`を使用（古いパターン）

2. **複雑な状態管理**: 
   - `initialLoading`, `isLoading`, `isLoadingMore`が混在
   - `hasInitialLoadStartedRef`, `isLoadingConversationsRef`などのrefが複雑
   - ページ遷移時の状態リセットが不十分

3. **エラー時のUX問題**:
   - エラー時にUIが完全にブロックされる
   - 既存データが表示されない
   - リトライ機能が不十分

4. **タイムアウト処理**:
   - タイムアウト時に適切なフォールバックがない
   - ユーザーが待ち続けるしかない

## 提案する統一アプローチ

### 1. 統一されたロード管理フック: `useDataLoader`

```typescript
interface UseDataLoaderOptions<T> {
  // データ取得関数
  loadFn: (skip: number, limit: number) => Promise<{ items: T[]; total?: number }>;
  // ページサイズ
  pageSize?: number;
  // 自動ロード（初期マウント時に自動実行）
  autoLoad?: boolean;
  // 認証が必要か
  requireAuth?: boolean;
  // エラー時のリトライ設定
  retryConfig?: {
    maxRetries?: number;
    retryDelay?: number;
    autoRetry?: boolean;
  };
  // キャッシュ設定
  cacheConfig?: {
    enabled?: boolean;
    ttl?: number; // Time to live in milliseconds
  };
}

interface UseDataLoaderReturn<T> {
  // データ
  items: T[];
  // ロード状態
  isLoading: boolean; // 初期ロード中
  isLoadingMore: boolean; // 追加ロード中
  isRefreshing: boolean; // リフレッシュ中
  // エラー状態
  error: ErrorInfo | null;
  // ページネーション
  hasMore: boolean;
  total: number | null;
  // アクション
  load: (reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  clearError: () => void;
}
```

### 2. 段階的なロード状態

- **初期ロード (`isLoading`)**: 初回データ取得中
- **追加ロード (`isLoadingMore`)**: ページネーションで追加データ取得中
- **リフレッシュ (`isRefreshing`)**: 既存データを更新中（既存データを表示したまま）

### 3. エラー時のフォールバック戦略

1. **既存データの保持**: エラー時も既存データを表示
2. **部分的なエラー表示**: エラーバナーを表示しつつ、既存データは表示
3. **リトライ機能**: 自動リトライと手動リトライの両方
4. **オフライン対応**: ネットワークエラー時はキャッシュデータを表示

### 4. オプティミスティックUI

- データがなくてもUIの骨組み（ヘッダー、ナビゲーション、空のリストコンテナ）を表示
- スケルトンローダーではなく、実際のUI構造を表示
- ロード中は該当部分のみスピナーを表示

### 5. キャッシュ戦略

- **メモリキャッシュ**: セッション中はメモリに保持
- **ローカルストレージ**: 重要なデータはローカルストレージに保存（オプション）
- **TTL (Time To Live)**: キャッシュの有効期限を設定

### 6. リトライロジック

- **自動リトライ**: ネットワークエラー時は自動的にリトライ（指数バックオフ）
- **手動リトライ**: ユーザーがリトライボタンをクリック
- **最大リトライ回数**: 無限リトライを防ぐ

## 実装方針

### Phase 1: 統一フックの作成
1. `useDataLoader`フックを作成
2. エラーハンドリングとリトライロジックを実装
3. キャッシュ機能を実装

### Phase 2: 既存ページの移行
1. `feed/page.tsx`を移行
2. `messages/page.tsx`を移行
3. `messages/[conversationId]/page.tsx`を移行
4. `groups/page.tsx`を移行

### Phase 3: UX改善
1. オプティミスティックUIの実装
2. エラー時のフォールバック表示
3. リトライUIの改善

## 期待される効果

1. **一貫性**: すべてのページで同じロードパターンを使用
2. **保守性**: ロードロジックが一箇所に集約され、修正が容易
3. **UX向上**: エラー時も既存データを表示し、ユーザー体験が継続
4. **パフォーマンス**: キャッシュにより、不要なリクエストを削減
5. **堅牢性**: リトライロジックにより、一時的なネットワークエラーに対応

