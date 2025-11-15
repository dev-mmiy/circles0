# ハッシュタグ機能 動作確認チェックリスト

## 実装完了項目

### バックエンド ✅
- [x] ハッシュタグデータモデル (`Hashtag`, `PostHashtag`)
- [x] マイグレーションファイル (`add_hashtag_tables_20251115.py`)
- [x] ハッシュタグ抽出ユーティリティ (`app/utils/hashtag.py`)
- [x] ハッシュタグサービス (`app/services/hashtag_service.py`)
- [x] ハッシュタグAPIエンドポイント (`app/api/hashtags.py`)
- [x] 投稿作成・更新時のハッシュタグ自動抽出・保存
- [x] 投稿レスポンスにハッシュタグを含める

### フロントエンド ✅
- [x] ハッシュタグ抽出ユーティリティ (`lib/utils/hashtag.ts`)
- [x] PostFormコンポーネントにハッシュタグ自動検出・表示
- [x] PostCardコンポーネントにハッシュタグ表示とクリック可能なリンク
- [x] 翻訳キーの追加（日本語・英語）

## 動作確認手順

### 1. バックエンドの動作確認

#### 1.1 マイグレーションの実行
```bash
cd backend
# マイグレーションを実行
alembic upgrade head
```

#### 1.2 データベーステーブルの確認
```sql
-- PostgreSQLに接続して確認
\dt hashtags
\dt post_hashtags

-- テーブル構造の確認
\d hashtags
\d post_hashtags
```

#### 1.3 APIエンドポイントの確認
```bash
# ハッシュタグ検索API
curl "http://localhost:8000/api/v1/hashtags?q=test&limit=10"

# 人気ハッシュタグAPI
curl "http://localhost:8000/api/v1/hashtags/popular?limit=10"
```

### 2. フロントエンドの動作確認

#### 2.1 ビルドエラーの確認
```bash
cd frontend
npm run build
# または
npm run type-check
```

#### 2.2 開発サーバーの起動
```bash
cd frontend
npm run dev
```

#### 2.3 UI動作確認

1. **投稿フォームでのハッシュタグ検出**
   - `/feed` ページにアクセス
   - 投稿フォームに `#test #hashtag #example` と入力
   - 「検出されたハッシュタグ」セクションにハッシュタグが表示されることを確認

2. **投稿作成後のハッシュタグ表示**
   - ハッシュタグを含む投稿を作成
   - フィードページで投稿カードにハッシュタグが表示されることを確認
   - ハッシュタグがクリック可能なリンクになっていることを確認

3. **投稿詳細ページでのハッシュタグ表示**
   - 投稿をクリックして詳細ページに移動
   - ハッシュタグが表示されることを確認

### 3. 統合テスト

#### 3.1 投稿作成フロー
1. ログイン
2. フィードページで `#test #hashtag` を含む投稿を作成
3. データベースで `hashtags` テーブルに `test` と `hashtag` が作成されていることを確認
4. `post_hashtags` テーブルに投稿とハッシュタグの関連が作成されていることを確認

#### 3.2 投稿更新フロー
1. 既存の投稿を編集
2. ハッシュタグを変更（例: `#old` → `#new`）
3. 古いハッシュタグの関連が削除され、新しいハッシュタグの関連が作成されることを確認

#### 3.3 ハッシュタグ検索
1. `/api/v1/hashtags?q=test` にアクセス
2. `test` を含むハッシュタグが返されることを確認

## テスト結果

### ユニットテスト ✅
- [x] バックエンド: ハッシュタグ抽出機能のテスト（10テストケース全てパス）
- [x] フロントエンド: ハッシュタグ抽出機能のテスト（10テストケース全てパス）

### 実装ファイル一覧

**バックエンド:**
- `backend/app/models/hashtag.py` - データモデル
- `backend/app/utils/hashtag.py` - ユーティリティ関数
- `backend/app/services/hashtag_service.py` - ビジネスロジック
- `backend/app/api/hashtags.py` - APIエンドポイント
- `backend/app/api/posts.py` - 投稿API（ハッシュタグ統合）
- `backend/app/schemas/post.py` - スキーマ（HashtagResponse追加）
- `backend/alembic/versions/add_hashtag_tables_20251115.py` - マイグレーション

**フロントエンド:**
- `frontend/lib/utils/hashtag.ts` - ユーティリティ関数
- `frontend/lib/api/posts.ts` - API型定義（Hashtag追加）
- `frontend/components/PostForm.tsx` - 投稿フォーム（ハッシュタグ検出）
- `frontend/components/PostCard.tsx` - 投稿カード（ハッシュタグ表示）
- `frontend/messages/ja.json` - 日本語翻訳
- `frontend/messages/en.json` - 英語翻訳

## 次のステップ

- [ ] ハッシュタグ検索ページの実装（`/search?q=hashtag&type=hashtag`）
- [ ] ハッシュタグ別フィード機能
- [ ] ハッシュタグの自動補完機能
- [ ] ハッシュタグトレンド表示

