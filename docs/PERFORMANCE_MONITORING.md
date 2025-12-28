# パフォーマンス監視ガイド

## 概要

このドキュメントでは、最適化されたエンドポイント（`get_feed`、`get_conversations`）のパフォーマンス測定と監視方法について説明します。

## パフォーマンス測定機能

### バックエンド

最適化されたエンドポイントでは、以下のパフォーマンス指標がログに記録されます：

#### `get_feed` エンドポイント

- **feed**: 投稿取得にかかった時間
- **bulk_fetch**: 一括取得（like_counts, comment_counts, hashtags, mentions）にかかった時間
- **response_build**: レスポンス構築にかかった時間
- **total**: 全体の処理時間

ログ例：
```
[get_feed] Response built successfully: 20 posts (feed: 0.045s, bulk_fetch: 0.012s, response_build: 0.003s, total: 0.060s)
```

#### `get_conversations` エンドポイント

- **conversations**: 会話取得にかかった時間
- **unread_counts**: 未読数一括取得にかかった時間
- **response_build**: レスポンス構築にかかった時間
- **total**: 全体の処理時間

ログ例：
```
[get_conversations] Response built successfully: 20 conversations (conversations: 0.032s, unread_counts: 0.008s, response_build: 0.002s, total: 0.042s)
```

### フロントエンド

APIクライアントでは、最適化されたエンドポイントのレスポンス時間とデータサイズがログに記録されます。

ログ例（開発環境のみ）：
```javascript
[apiClient] Performance metrics: {
  endpoint: '/api/v1/posts?skip=0&limit=20&filter_type=all',
  status: 200,
  elapsed: '125ms',
  dataSize: 45678,
  itemsCount: 20
}
```

## パフォーマンステストスクリプト

### 使用方法

```bash
# すべてのエンドポイントをテスト（デフォルト）
python backend/scripts/performance_test.py

# 特定のエンドポイントのみテスト
python backend/scripts/performance_test.py --endpoint feed
python backend/scripts/performance_test.py --endpoint conversations

# イテレーション数を指定
python backend/scripts/performance_test.py --iterations 10
```

### 環境変数

`.env`ファイルに以下を設定：

```env
API_BASE_URL=http://localhost:8000
TEST_AUTH_TOKEN=your_auth_token_here  # conversationsエンドポイント用
```

### 出力例

```
============================================================
Performance Testing Script
============================================================
API Base URL: http://localhost:8000
Iterations: 5
Endpoint: all

============================================================
Testing get_feed endpoint performance
============================================================
  Iteration 1: 0.125s - Status: 200, Posts: 20
  Iteration 2: 0.098s - Status: 200, Posts: 20
  Iteration 3: 0.112s - Status: 200, Posts: 20
  Iteration 4: 0.105s - Status: 200, Posts: 20
  Iteration 5: 0.110s - Status: 200, Posts: 20

  Results: avg=0.110s, min=0.098s, max=0.125s

============================================================
Summary
============================================================
Feed: avg=0.110s, min=0.098s, max=0.125s
Conversations: avg=0.085s, min=0.072s, max=0.098s
```

## パフォーマンス目標

### `get_feed` エンドポイント

- **目標**: 20件の投稿取得で200ms以下
- **最適化前**: 101回以上のクエリ、約500-1000ms
- **最適化後**: 6回のクエリ、約100-200ms（約80%改善）

### `get_conversations` エンドポイント

- **目標**: 20件の会話取得で150ms以下
- **最適化前**: 41回以上のクエリ、約300-600ms
- **最適化後**: 約3回のクエリ、約80-150ms（約75%改善）

## 本番環境での監視

### ログの確認

本番環境では、以下のログを確認してパフォーマンスを監視できます：

1. **バックエンドログ**:
   - `[get_feed] Response built successfully` - フィード取得のパフォーマンス
   - `[get_conversations] Response built successfully` - 会話取得のパフォーマンス
   - `[RequestLogging] Response` - 1秒以上のリクエスト（自動ログ）

2. **フロントエンドログ**（開発環境のみ）:
   - `[apiClient] Performance metrics` - API呼び出しのパフォーマンス

### パフォーマンス問題の検出

以下の場合、パフォーマンス問題の可能性があります：

- `get_feed`の`total`が500msを超える
- `get_conversations`の`total`が300msを超える
- `bulk_fetch`または`unread_counts`が100msを超える
- フロントエンドの`elapsed`が500msを超える

## トラブルシューティング

### パフォーマンスが悪い場合

1. **データベースクエリの確認**:
   - インデックスが適切に設定されているか確認
   - スロークエリログを確認

2. **ネットワークの確認**:
   - フロントエンドとバックエンド間のネットワーク遅延を確認
   - タイムアウト設定を確認

3. **データ量の確認**:
   - 取得するデータ量が適切か確認
   - ページネーションの設定を確認

## 今後の改善

- [ ] データベースクエリのプロファイリングツールの導入
- [ ] APM（Application Performance Monitoring）の導入
- [ ] パフォーマンスダッシュボードの作成
- [ ] 自動パフォーマンステストのCI/CD統合

