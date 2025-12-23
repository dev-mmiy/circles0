# 改善提案

**作成日**: 2025-11-27  
**最終更新**: 2025-11-27

## 概要

このドキュメントは、疾患コミュニティプラットフォームの次の改善提案をまとめたものです。ユーザー価値、実装難易度、技術的影響を考慮して優先度を設定しています。

---

## 🔥 優先度: 最高（即座に実装すべき）

### 1. 投稿の保存・ブックマーク機能 ⭐⭐⭐

**現状**: 未実装  
**ユーザー価値**: ⭐⭐⭐（高）  
**実装難易度**: ⭐⭐（低）  
**実装時間**: 3-4日

#### 提案内容
- 投稿を保存する機能（後で読む）
- 保存した投稿一覧ページ（`/saved-posts`）
- 保存した投稿の検索・フィルタリング
- 保存した投稿への通知（投稿が更新された場合）

#### 実装詳細
**バックエンド**:
- `saved_posts`テーブルの作成
  ```sql
  CREATE TABLE saved_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id)
  );
  ```
- インデックス追加: `(user_id, created_at)`, `(post_id)`
- APIエンドポイント:
  - `POST /api/v1/posts/{post_id}/save` - 投稿を保存
  - `DELETE /api/v1/posts/{post_id}/save` - 保存を解除
  - `GET /api/v1/posts/saved` - 保存した投稿一覧

**フロントエンド**:
- `PostCard`コンポーネントに保存ボタンを追加
- 保存した投稿一覧ページの作成
- 多言語対応（日本語・英語）

#### 期待される効果
- ユーザーエンゲージメントの向上
- コンテンツの再訪問率向上
- ユーザー満足度の向上

---

### 2. 通知設定のカスタマイズ ⭐⭐

**現状**: 通知機能は実装済みだが、設定が限定的  
**ユーザー価値**: ⭐⭐（中）  
**実装難易度**: ⭐⭐（低）  
**実装時間**: 2-3日

#### 提案内容
- 通知タイプごとのON/OFF設定
- メール通知の設定（将来実装）
- プッシュ通知の設定（既存機能の拡張）
- 通知頻度の設定（即座、日次、週次）

#### 実装詳細
**バックエンド**:
- `user_notification_settings`テーブルの作成
  ```sql
  CREATE TABLE user_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    follow_enabled BOOLEAN DEFAULT true,
    comment_enabled BOOLEAN DEFAULT true,
    reply_enabled BOOLEAN DEFAULT true,
    like_enabled BOOLEAN DEFAULT true,
    comment_like_enabled BOOLEAN DEFAULT true,
    message_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT false,
    frequency VARCHAR(20) DEFAULT 'immediate', -- 'immediate', 'daily', 'weekly'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
  ```
- APIエンドポイント:
  - `GET /api/v1/users/me/notification-settings` - 設定取得
  - `PUT /api/v1/users/me/notification-settings` - 設定更新

**フロントエンド**:
- 通知設定ページの作成（`/notifications/settings`の拡張）
- トグルスイッチUI
- 多言語対応

#### 期待される効果
- ユーザー満足度の向上（通知のカスタマイズ）
- 通知の過多による離脱防止

---

### 3. 投稿の検索機能（全文検索） ⭐⭐⭐

**現状**: ハッシュタグ検索は実装済み、全文検索は未実装  
**ユーザー価値**: ⭐⭐⭐（高）  
**実装難易度**: ⭐⭐⭐（中）  
**実装時間**: 4-5日

#### 提案内容
- 投稿内容の全文検索
- 投稿者による検索
- 日付範囲での検索
- 保存した検索条件

#### 実装詳細
**バックエンド**:
- PostgreSQLの全文検索機能（tsvector）を使用
  ```sql
  -- postsテーブルに検索用カラムを追加
  ALTER TABLE posts ADD COLUMN search_vector tsvector;
  
  -- 検索ベクトルを自動生成するトリガー
  CREATE TRIGGER posts_search_vector_update BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION tsvector_update_trigger(
    search_vector, 'pg_catalog.japanese', content
  );
  
  -- GINインデックスを追加（高速検索のため）
  CREATE INDEX idx_posts_search_vector ON posts USING GIN(search_vector);
  ```
- APIエンドポイント:
  - `GET /api/v1/posts/search?q={query}&author={user_id}&from={date}&to={date}`

**フロントエンド**:
- 検索ページに「投稿検索」タブを追加
- 検索フォームの実装
- 検索結果の表示
- 多言語対応

#### 技術的考慮事項
- PostgreSQLの日本語全文検索には`pg_trgm`拡張機能が必要
- 検索パフォーマンスの最適化（インデックス、キャッシュ）

---

## 🚀 優先度: 高（中期実装）

### 4. 健康記録機能（簡易版） ⭐⭐⭐

**現状**: Phase 4で計画されているが未実装  
**ユーザー価値**: ⭐⭐⭐（高）  
**実装難易度**: ⭐⭐⭐（中）  
**実装時間**: 1-2週間

#### 提案内容（MVP版）
- 日記機能（テキストベース）
- 症状メモ
- カレンダー表示
- 簡単なグラフ表示（症状の推移）

#### 段階的実装
1. **Phase 1**: 日記・症状メモ（テキストのみ）
   - `health_records`テーブルの作成
   - 日記作成・編集・削除機能
   - カレンダー表示
   
2. **Phase 2**: グラフ表示
   - 症状の推移グラフ（Chart.js等を使用）
   - 週別・月別の統計表示

3. **Phase 3**: バイタル記録（血圧、体温、体重）
   - バイタルデータの入力フォーム
   - バイタルデータのグラフ表示

#### データモデル
```sql
CREATE TABLE health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  record_type VARCHAR(50) NOT NULL, -- 'diary', 'symptom', 'vital'
  content TEXT,
  symptoms TEXT,
  vital_type VARCHAR(50), -- 'blood_pressure', 'temperature', 'weight'
  vital_value DECIMAL(10, 2),
  vital_unit VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, record_date, record_type)
);

CREATE INDEX idx_health_records_user_date ON health_records(user_id, record_date);
```

---

### 5. ユーザー統計・分析ダッシュボード ⭐⭐

**現状**: 未実装  
**ユーザー価値**: ⭐⭐（中）  
**実装難易度**: ⭐⭐（低）  
**実装時間**: 3-4日

#### 提案内容
- ユーザーの投稿数、コメント数、いいね数の統計
- アクティビティグラフ（週別、月別）
- フォロワー/フォロー中の推移
- 疾患別の活動状況

#### 実装詳細
**バックエンド**:
- 統計データを計算するエンドポイント
  - `GET /api/v1/users/me/stats` - ユーザー統計
  - `GET /api/v1/users/me/activity` - アクティビティデータ

**フロントエンド**:
- 統計ダッシュボードページ（`/profile/me/stats`）
- Chart.js等を使用したグラフ表示
- 多言語対応

---

### 6. 投稿の下書き保存機能 ⭐⭐

**現状**: 未実装  
**ユーザー価値**: ⭐⭐（中）  
**実装難易度**: ⭐⭐（低）  
**実装時間**: 2-3日

#### 提案内容
- 投稿作成時の下書き保存
- 下書き一覧
- 下書きの自動保存（ローカルストレージ + サーバー）
- 下書きの編集・削除

#### 実装詳細
**バックエンド**:
- `post_drafts`テーブルの作成
- APIエンドポイント:
  - `POST /api/v1/posts/drafts` - 下書き作成
  - `PUT /api/v1/posts/drafts/{draft_id}` - 下書き更新
  - `GET /api/v1/posts/drafts` - 下書き一覧
  - `DELETE /api/v1/posts/drafts/{draft_id}` - 下書き削除

**フロントエンド**:
- `PostForm`に下書き保存機能を追加
- 自動保存機能（デバウンス付き）
- 下書き一覧ページ

---

## 💡 優先度: 中（UX改善）

### 7. コメントのスレッド表示改善 ⭐

**現状**: コメントは実装済みだが、スレッド表示が限定的  
**ユーザー価値**: ⭐（低）  
**実装難易度**: ⭐⭐（低）  
**実装時間**: 2-3日

#### 提案内容
- コメントの折りたたみ/展開
- コメントの並び替え（新着順、人気順）
- コメントのフィルタリング
- スレッドの視覚的改善

---

### 8. ユーザー推薦機能 ⭐⭐

**現状**: ユーザー検索は実装済み  
**ユーザー価値**: ⭐⭐（中）  
**実装難易度**: ⭐⭐⭐（中）  
**実装時間**: 3-4日

#### 提案内容
- 同じ疾患を持つユーザーの推薦
- 相互フォローしているユーザーの推薦
- アクティブなユーザーの推薦
- 「あなたへのおすすめ」セクション

---

## 🔧 優先度: 低（技術的改善）

### 9. E2Eテストの導入 ⭐

**現状**: ユニットテスト、統合テストは実装済み  
**ユーザー価値**: ⭐（低、開発者向け）  
**実装難易度**: ⭐⭐⭐（中）  
**実装時間**: 1週間

#### 提案内容
- PlaywrightによるE2Eテスト
- 主要フローのテスト:
  - ログイン
  - 投稿作成
  - コメント
  - メッセージ送信
- CI/CDへの統合

#### 実装詳細
- `tests/e2e/`ディレクトリの作成
- Playwrightのセットアップ
- 主要フローのテストケース作成
- GitHub Actionsへの統合

---

### 10. パフォーマンス監視の強化 ⭐

**現状**: 基本的なロギングは実装済み  
**ユーザー価値**: ⭐（低、運用者向け）  
**実装難易度**: ⭐⭐⭐（中）  
**実装時間**: 3-4日

#### 提案内容
- Google Cloud Monitoringの活用
- エラー追跡（Sentry）の導入
- パフォーマンスメトリクスの可視化
- アラート設定

#### 実装詳細
**バックエンド**:
- Sentry SDKの統合
- カスタムメトリクスの追加
- Cloud Monitoringへのメトリクス送信

**フロントエンド**:
- Sentry SDKの統合
- エラーバウンダリーの改善
- パフォーマンスメトリクスの収集

---

### 11. Redisキャッシュの導入 ⭐⭐

**現状**: キャッシュは未実装（メモリキャッシュのみ）  
**ユーザー価値**: ⭐⭐（中、パフォーマンス向上）  
**実装難易度**: ⭐⭐⭐（中）  
**実装時間**: 3-4日

#### 提案内容
- Redisキャッシュの導入
- 頻繁にアクセスされるデータのキャッシュ:
  - ユーザー情報
  - 疾患マスターデータ
  - 投稿フィード（短時間）
- キャッシュ無効化戦略の実装

#### 実装詳細
**インフラ**:
- Google Cloud Memorystore（Redis）のセットアップ
- 接続設定の追加

**バックエンド**:
- Redisクライアントの統合
- キャッシュレイヤーの実装
- キャッシュ無効化ロジック

---

### 12. データベースインデックスの最適化 ⭐⭐

**現状**: 基本的なインデックスは実装済み  
**ユーザー価値**: ⭐⭐（中、パフォーマンス向上）  
**実装難易度**: ⭐⭐（低）  
**実装時間**: 1-2日

#### 提案内容
- クエリパフォーマンスの分析
- 不足しているインデックスの追加
- 複合インデックスの最適化

#### 確認すべきインデックス
- `messages`テーブル: `(conversation_id, created_at)`, `(sender_id, created_at)`
- `notifications`テーブル: `(recipient_id, is_read, created_at)`
- `post_comments`テーブル: `(post_id, created_at)`, `(parent_comment_id, created_at)`
- `groups`テーブル: `(created_at)`, `(name)`（検索用）

---

## 📊 実装優先順位

### 短期（1-2週間）
1. ✅ **投稿の保存・ブックマーク機能** - ユーザー価値が高く、実装が容易
2. ✅ **通知設定のカスタマイズ** - ユーザー満足度向上
3. ✅ **データベースインデックスの最適化** - パフォーマンス向上

### 中期（1ヶ月）
4. ✅ **投稿の検索機能（全文検索）** - ユーザー価値が高い
5. ✅ **健康記録機能（簡易版）** - プラットフォームの核心機能
6. ✅ **ユーザー統計・分析ダッシュボード** - エンゲージメント向上
7. ✅ **投稿の下書き保存機能** - UX改善

### 長期（2-3ヶ月）
8. ✅ **E2Eテストの導入** - 品質保証
9. ✅ **パフォーマンス監視の強化** - 運用改善
10. ✅ **Redisキャッシュの導入** - スケーラビリティ向上

---

## 実装時の考慮事項

### データベース設計
- 新しい機能を追加する際は、既存のデータモデルとの整合性を確認
- インデックスの追加を検討（パフォーマンス向上のため）
- マイグレーションの冪等性を確保

### パフォーマンス
- 大量のデータを扱う機能（検索、統計）は、パフォーマンステストを実施
- 必要に応じてキャッシュを導入
- データベースクエリのプロファイリング

### セキュリティ
- ユーザー入力のバリデーション
- 権限チェックの実装
- SQLインジェクション対策（既に実装済み）

### 国際化
- すべての新機能は多言語対応（日本語・英語）
- 翻訳キーの追加
- 日付・数値のフォーマット対応

### テスト
- ユニットテストの追加
- 統合テストの追加
- E2Eテストの追加（主要フロー）

---

## 参考資料

- [Progress.md](../Progress.md) - 現在の実装状況
- [FEATURE_PROPOSALS.md](./FEATURE_PROPOSALS.md) - 機能追加提案
- [INTERNATIONALIZATION.md](../INTERNATIONALIZATION.md) - 国際化実装ガイド
- [COST_OPTIMIZATION.md](./COST_OPTIMIZATION.md) - コスト最適化ガイド
- [PERFORMANCE_MONITORING.md](./PERFORMANCE_MONITORING.md) - パフォーマンス監視ガイド

---

**最終更新**: 2025-11-27




