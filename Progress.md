# Disease Community Platform - 開発進捗

## 最終更新日: 2025-11-15

## 完了した主要機能

### 1. 国際化対応 (i18n) - ✅ 完了
**実装日: 2025-11-14 - 2025-11-15**

#### 概要
Next.js 14 App Routerに対応したnext-intlを使用して、日本語と英語の多言語対応を実装しました。

#### 実装内容

**バックエンド関連の変更なし** - フロントエンドのみ

**フロントエンド実装:**

1. **next-intlのインストールと設定**
   - パッケージ: `next-intl` (v3.x)
   - 設定ファイル:
     - [i18n/routing.ts](frontend/i18n/routing.ts) - ロケール設定とナビゲーションヘルパー
     - [i18n/request.ts](frontend/i18n/request.ts) - リクエスト設定
     - [middleware.ts](frontend/middleware.ts) - ロケールルーティング
     - [next.config.js](frontend/next.config.js) - Next.js設定にプラグイン追加

2. **翻訳メッセージファイル**
   - [messages/ja.json](frontend/messages/ja.json) - 日本語翻訳 (257行、9つの名前空間)
   - [messages/en.json](frontend/messages/en.json) - 英語翻訳 (257行、9つの名前空間)

   **翻訳名前空間:**
   - `navigation` - ナビゲーションメニュー (5キー)
   - `auth` - 認証関連UI (14キー)
   - `notifications` - 通知システム (10キー + 6つの通知タイプ)
   - `feed` - フィードページ (10キー)
   - `post` - 投稿カード (11キー)
   - `postForm` - 投稿作成フォーム (9キー)
   - `notificationItem` - 通知アイテム (1キー + date-fnsロケール対応)
   - `userProfileEdit` - プロフィール編集 (38キー)
   - `languageSwitcher` - 言語切り替え (3キー)

3. **アプリケーション構造の再編成**
   - すべてのページを`app/[locale]/`ディレクトリ内に移動
   - [app/[locale]/layout.tsx](frontend/app/[locale]/layout.tsx) - NextIntlClientProviderでラップ
   - [app/layout.tsx](frontend/app/layout.tsx) - ルートレイアウトを最小限に

4. **翻訳済みコンポーネント一覧**
   - ✅ [components/Header.tsx](frontend/components/Header.tsx:14) - ナビゲーションメニュー (`navigation`)
   - ✅ [components/AuthButton.tsx](frontend/components/AuthButton.tsx:14) - 認証ボタンとエラーメッセージ (`auth`)
   - ✅ [components/notifications/NotificationDropdown.tsx](frontend/components/notifications/NotificationDropdown.tsx:23) - 通知ドロップダウン (`notifications`)
   - ✅ [app/[locale]/feed/page.tsx](frontend/app/[locale]/feed/page.tsx:14) - フィードページ (`feed`)
   - ✅ [components/PostCard.tsx](frontend/components/PostCard.tsx:21) - 投稿カード (`post`)
   - ✅ [components/PostForm.tsx](frontend/components/PostForm.tsx:18) - 投稿作成フォーム (`postForm`)
   - ✅ [components/notifications/NotificationItem.tsx](frontend/components/notifications/NotificationItem.tsx:33) - 通知アイテム (`notificationItem`)
   - ✅ [components/UserProfileEditForm.tsx](frontend/components/UserProfileEditForm.tsx:19) - プロフィール編集 (`userProfileEdit`)
   - ✅ [components/LanguageSwitcher.tsx](frontend/components/LanguageSwitcher.tsx:14) - 言語切り替え (`languageSwitcher`)

   **実装パターン:**
   ```tsx
   import { useTranslations } from 'next-intl';
   import { Link } from '@/i18n/routing';

   const t = useTranslations('namespace');
   <h1>{t('title')}</h1>
   <Link href="/path">{t('link')}</Link>
   ```

#### URL構造
- **日本語**: `http://localhost:3000/ja/*`
- **英語**: `http://localhost:3000/en/*`
- **ルート**: `http://localhost:3000/` → `/ja`に自動リダイレクト

#### 設定
- **デフォルトロケール**: `ja` (日本語)
- **サポートロケール**: `ja`, `en`
- **ロケールプレフィックス**: `always` (すべてのURLにロケールを含む)
- **ロケール検出**: `false` (ブラウザ言語設定を無視、常にデフォルトを使用)

#### 翻訳統計
| コンポーネント | 翻訳キー数 | 名前空間 | 実装日 |
|--------------|----------|---------|--------|
| Header | 5 | `navigation` | 2025-11-14 |
| AuthButton | 14 | `auth` | 2025-11-15 |
| NotificationDropdown | 16 | `notifications` | 2025-11-15 |
| Feed Page | 10 | `feed` | 2025-11-15 |
| PostCard | 11 | `post` | 2025-11-15 |
| PostForm | 9 | `postForm` | 2025-11-15 |
| NotificationItem | 1 + ロケール対応 | `notificationItem` | 2025-11-15 |
| UserProfileEditForm | 38 | `userProfileEdit` | 2025-11-15 |
| LanguageSwitcher | 3 | `languageSwitcher` | 2025-11-15 |
| **合計** | **107キー** | **9名前空間** | - |

**翻訳ファイルサイズ:**
- messages/ja.json: 257行 (162行から+95行)
- messages/en.json: 257行 (162行から+95行)

#### ドキュメント
- [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md) - 包括的な国際化実装ガイド
  - アーキテクチャ概要
  - 使用方法とベストプラクティス
  - 新しいコンポーネントへの翻訳追加手順
  - トラブルシューティング
  - 今後の拡張計画

#### 関連ファイル
- `frontend/i18n/routing.ts` - ロケール設定とナビゲーション
- `frontend/i18n/request.ts` - サーバーサイド設定
- `frontend/middleware.ts` - ミドルウェア設定
- `frontend/messages/*.json` - 翻訳ファイル
- `frontend/app/[locale]/layout.tsx` - ロケール対応レイアウト
- `frontend/components/Header.tsx` - 多言語ナビゲーション
- `frontend/components/AuthButton.tsx` - 多言語認証UI
- `frontend/components/notifications/NotificationDropdown.tsx` - 多言語通知
- `frontend/app/[locale]/feed/page.tsx` - 多言語フィードページ

---

### 2. リアルタイム通知機能 - ✅ 完了
**実装日: 2025-11-13**

#### 概要
Server-Sent Events (SSE)を使用したリアルタイム通知システムを実装しました。

#### 実装内容

**バックエンド:**
1. **通知API** - [backend/app/api/notifications.py](backend/app/api/notifications.py)
   - 通知一覧取得
   - 未読数取得
   - 既読マーク
   - 通知削除

2. **SSEストリーム** - [backend/app/api/notifications_sse.py](backend/app/api/notifications_sse.py)
   - `/api/v1/notifications/stream` - リアルタイム通知配信
   - ハートビート (30秒間隔)
   - 自動再接続 (9分でタイムアウト前にreconnectイベント)

3. **ルーティング設定** - [backend/app/main.py](backend/app/main.py:112-113)
   ```python
   app.include_router(notifications_router, prefix="/api/v1/notifications", tags=["notifications"])
   app.include_router(notifications_sse_router, prefix="/api/v1/notifications", tags=["notifications", "sse"])
   ```

**フロントエンド:**
1. **通知コンテキスト** - [frontend/contexts/NotificationContext.tsx](frontend/contexts/NotificationContext.tsx)
   - グローバル通知状態管理
   - SSE接続管理
   - 未読数自動更新

2. **SSEフック** - [frontend/lib/hooks/useNotificationStream.ts](frontend/lib/hooks/useNotificationStream.ts)
   - 自動接続・再接続
   - エラーハンドリング
   - 指数バックオフリトライ

3. **UIコンポーネント**
   - [frontend/components/notifications/NotificationBell.tsx](frontend/components/notifications/NotificationBell.tsx) - 通知ベルアイコン
   - [frontend/components/notifications/NotificationDropdown.tsx](frontend/components/notifications/NotificationDropdown.tsx) - 通知ドロップダウン
   - [frontend/components/Header.tsx](frontend/components/Header.tsx) - ヘッダーに統合

#### エンドポイント
- `GET /api/v1/notifications` - 通知一覧
- `GET /api/v1/notifications/stream` - SSEストリーム
- `GET /api/v1/notifications/unread-count` - 未読数
- `PUT /api/v1/notifications/mark-all-read` - 全て既読
- `PUT /api/v1/notifications/{id}/read` - 個別既読
- `DELETE /api/v1/notifications/{id}` - 個別削除

---

### 3. Auth0認証 - ✅ 完了

#### 概要
Auth0を使用したOAuth2.0認証システム。

#### 実装内容
- [frontend/contexts/Auth0ProviderWithConfig.tsx](frontend/contexts/Auth0ProviderWithConfig.tsx) - Auth0プロバイダー設定
- [backend/app/auth/dependencies.py](backend/app/auth/dependencies.py) - JWT検証
- ユーザー登録フロー
- トークンリフレッシュ

---

### 4. ユーザー管理 - ✅ 完了

#### 実装内容
- ユーザープロフィール (CRUD)
- フォロー/フォロワー機能
- 疾患情報の関連付け
- ニックネーム表示 (メールアドレスの代わり)

---

### 5. データベース自動マイグレーション - ✅ 完了

#### 概要
起動時にAlembicマイグレーションを自動実行し、マスターデータを自動投入。

#### 実装内容
- [backend/run_migrations.sh](backend/run_migrations.sh) - マイグレーション実行スクリプト
- [backend/seed_master_data.py](backend/seed_master_data.py) - マスターデータ投入 (冪等性対応)
- Docker Compose起動時に自動実行

---

## 現在の技術スタック

### フロントエンド
- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **認証**: Auth0 React SDK
- **状態管理**: React Context API
- **国際化**: next-intl v3.x
- **HTTP クライアント**: Axios

### バックエンド
- **フレームワーク**: FastAPI
- **言語**: Python 3.11
- **ORM**: SQLAlchemy
- **データベース**: PostgreSQL
- **マイグレーション**: Alembic
- **認証**: Auth0 (JWT検証)
- **リアルタイム**: Server-Sent Events (SSE)

### インフラ
- **コンテナ**: Docker / Docker Compose
- **データベース**: PostgreSQL 15
- **開発環境**: ホットリロード対応

---

## 既知の問題・制限事項

### 解決済み
1. ✅ ~~通知エンドポイントの404エラー~~ → ルーティング設定を修正 (2025-11-14)
2. ✅ ~~i18n設定のモジュール解決エラー~~ → next-intl APIの正しい使用方法に修正 (2025-11-14)
3. ✅ ~~Auth0 IDとUUIDの変換エラー~~ → UserServiceを使用した適切なユーザー検索に修正 (2025-11-13)

### 残存する問題
なし

---

## 今後の改善予定

### 優先度: 高
1. **多言語対応の拡充** ✅ 主要機能完了
   - ✅ 基盤となる9コンポーネントの翻訳完了 (107キー、9名前空間)
     - Header, AuthButton, NotificationDropdown, Feed ページ
     - PostCard, PostForm, NotificationItem, UserProfileEditForm
     - **LanguageSwitcher (言語切り替えUI)** ✅ 完了
   - ⏳ 今後の拡張:
     - 追加のページコンポーネント (プロフィールページ、設定ページなど)
     - ユーザーの`preferred_language`設定に基づいた自動ロケール選択

2. **エラーハンドリングの改善**
   - 401/403エラー時の適切なリダイレクト
   - ネットワークエラー時のユーザーフレンドリーなフィードバック

### 優先度: 中
1. **テストの追加**
   - ユニットテスト
   - インテグレーションテスト
   - E2Eテスト

2. **パフォーマンス最適化**
   - 画像の最適化
   - コードスプリッティング
   - キャッシング戦略

### 優先度: 低
1. **ドキュメント整備**
   - API仕様書の充実
   - 開発者ガイドの作成

---

## 開発履歴

### 2025-11-15
- **多言語対応の大幅な拡充** ✅ 完了
  - **フェーズ1** (午前):
    - AuthButton コンポーネントの翻訳追加 (14キー)
    - NotificationDropdown コンポーネントの翻訳追加 (16キー)
    - Feed ページの翻訳追加 (10キー)
    - INTERNATIONALIZATION.md ドキュメント作成
  - **フェーズ2** (午後):
    - PostCard コンポーネントの翻訳追加 (11キー)
      - 時間表示の多言語対応 (たった今、○分前、○時間前、○日前)
      - 公開範囲バッジの翻訳
      - エラーメッセージの翻訳
    - PostForm コンポーネントの翻訳追加 (9キー)
      - プレースホルダー、公開範囲、ボタンテキストの翻訳
    - NotificationItem コンポーネントの翻訳追加 (1キー + ロケール対応)
      - date-fnsのロケール対応 (ja/enUS自動切り替え)
      - ルーター`@/i18n/routing`への変更
    - UserProfileEditForm コンポーネントの翻訳追加 (38キー)
      - 3つのセクション、11個のフィールド、5個のプレースホルダー
      - 性別・公開設定・プライバシーオプションの翻訳
  - **フェーズ3** (夕方):
    - LanguageSwitcher コンポーネントの実装 (3キー)
      - ドロップダウン式言語切り替えUI
      - 地球儀アイコン + 現在の言語表示
      - 外側クリックで閉じる機能
      - スムーズなページ遷移 (useTransition)
      - Headerへの統合（通知ベルの前に配置）
  - **合計**: 107キー、9名前空間、257行 (両言語)
  - Progress.md 更新 (翻訳統計テーブル更新、LanguageSwitcher追加)

### 2025-11-14
- **next-intl国際化対応の基盤実装**
  - next-intl パッケージのインストールと設定
  - i18n/routing.ts, i18n/request.ts, middleware.ts の作成
  - App Routerの`[locale]`ディレクトリ構造に再編成
  - Header コンポーネントの翻訳 (5キー)
  - 通知エンドポイントのルーティング問題修正
  - messages/ja.json, messages/en.json の初期作成

### 2025-11-13
- リアルタイム通知機能の実装 (SSE)
- Auth0 ID→UUID変換エラーの修正
- Headerコンポーネントへの通知ベル統合
- ニックネーム表示の実装

### 2025-11-12以前
- プロジェクト基盤構築
- Auth0認証実装
- ユーザー管理機能
- データベース設計・実装
