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
   - [messages/ja.json](frontend/messages/ja.json) - 日本語翻訳 (619行、28つの名前空間)
   - [messages/en.json](frontend/messages/en.json) - 英語翻訳 (619行、28つの名前空間)

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
   - `diseaseList` - 疾患リスト (23キー)
   - `diseaseForm` - 疾患フォーム (67キー)
   - `diseaseStatusBadge` - 疾患ステータスバッジ (11キー)
   - `categorySelector` - カテゴリセレクター (2キー)
   - `homePage` - ホームページ (18キー)
   - `addDiseasePage` - 疾患追加ページ (6キー)
   - `editProfilePage` - プロフィール編集ページ (8キー)
   - `publicProfilePage` - 他のユーザーのプロフィールページ (14キー)
   - `postDetailPage` - 投稿詳細ページ (5キー)
   - `commentSection` - コメントセクション (約30キー)
   - `userSearch` - ユーザー検索 (約10キー)
   - `diseaseSearch` - 疾患検索 (約15キー)
   - `userProfileCard` - ユーザープロフィールカード (約20キー)
   - `followersList` - フォロワーリスト (約3キー)
   - `followingList` - フォロー中リスト (約3キー)
   - `followButton` - フォローボタン (約4キー)
   - `searchPage` - 検索ページ (約15キー)
   - `errors` - エラーメッセージ (9キー)

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
   - ✅ [components/DiseaseList.tsx](frontend/components/DiseaseList.tsx:35) - 疾患リスト (`diseaseList`)
   - ✅ [components/DiseaseForm.tsx](frontend/components/DiseaseForm.tsx:41) - 疾患フォーム (`diseaseForm`)
   - ✅ [components/EditDiseaseForm.tsx](frontend/components/EditDiseaseForm.tsx:21) - 疾患編集フォーム（インライン） (`diseaseForm`)
   - ✅ [components/EditDiseaseModal.tsx](frontend/components/EditDiseaseModal.tsx:28) - 疾患編集モーダル (`diseaseForm`)
   - ✅ [components/DiseaseStatusBadge.tsx](frontend/components/DiseaseStatusBadge.tsx:69) - 疾患ステータスバッジ (`diseaseStatusBadge`)
   - ✅ [components/CategorySelector.tsx](frontend/components/CategorySelector.tsx:29) - カテゴリセレクター (`categorySelector`)
   - ✅ [app/[locale]/page.tsx](frontend/app/[locale]/page.tsx:24) - ホームページ (`homePage`)
   - ✅ [app/[locale]/diseases/add/page.tsx](frontend/app/[locale]/diseases/add/page.tsx:12) - 疾患追加ページ (`addDiseasePage`)
   - ✅ [app/[locale]/profile/me/edit/page.tsx](frontend/app/[locale]/profile/me/edit/page.tsx:12) - プロフィール編集ページ (`editProfilePage`)
   - ✅ [app/[locale]/profile/[id]/page.tsx](frontend/app/[locale]/profile/[id]/page.tsx:16) - 他のユーザーのプロフィールページ (`publicProfilePage`)
   - ✅ [app/[locale]/posts/[id]/page.tsx](frontend/app/[locale]/posts/[id]/page.tsx:14) - 投稿詳細ページ (`postDetailPage`)
   - ✅ [components/CommentSection.tsx](frontend/components/CommentSection.tsx:27) - コメントセクション (`commentSection`)
   - ✅ [components/UserSearch.tsx](frontend/components/UserSearch.tsx:25) - ユーザー検索 (`userSearch`)
   - ✅ [components/DiseaseSearch.tsx](frontend/components/DiseaseSearch.tsx:26) - 疾患検索 (`diseaseSearch`)
   - ✅ [components/UserProfileCard.tsx](frontend/components/UserProfileCard.tsx:20) - ユーザープロフィールカード (`userProfileCard`)
   - ✅ [components/FollowersList.tsx](frontend/components/FollowersList.tsx:20) - フォロワーリスト (`followersList`)
   - ✅ [components/FollowingList.tsx](frontend/components/FollowingList.tsx:16) - フォロー中リスト (`followingList`)
   - ✅ [components/FollowButton.tsx](frontend/components/FollowButton.tsx:22) - フォローボタン (`followButton`)

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
| DiseaseList | 23 | `diseaseList` | 2025-11-15 |
| DiseaseForm | 50 | `diseaseForm` | 2025-11-15 |
| EditDiseaseForm | 17 (追加) | `diseaseForm` | 2025-11-15 |
| EditDiseaseModal | 17 (追加) | `diseaseForm` | 2025-11-15 |
| DiseaseStatusBadge | 11 | `diseaseStatusBadge` | 2025-11-15 |
| CategorySelector | 2 | `categorySelector` | 2025-11-15 |
| Home Page | 18 | `homePage` | 2025-11-15 |
| Add Disease Page | 6 | `addDiseasePage` | 2025-11-15 |
| Edit Profile Page | 8 | `editProfilePage` | 2025-11-15 |
| Public Profile Page | 14 | `publicProfilePage` | 2025-11-15 |
| Post Detail Page | 5 | `postDetailPage` | 2025-11-15 |
| CommentSection | 25 | `commentSection` | 2025-11-15 |
| UserSearch | 12 | `userSearch` | 2025-11-15 |
| DiseaseSearch | 13 | `diseaseSearch` | 2025-11-15 |
| UserProfileCard | 21 | `userProfileCard` | 2025-11-15 |
| FollowersList | 3 | `followersList` | 2025-11-15 |
| FollowingList | 3 | `followingList` | 2025-11-15 |
| FollowButton | 4 | `followButton` | 2025-11-15 |
| Search Page | 15 | `searchPage` | 2025-11-15 |
| **合計** | **357キー** | **26名前空間** | - |

**翻訳ファイルサイズ:**
- messages/ja.json: 619行
- messages/en.json: 619行

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
   - ✅ 基盤となる35コンポーネント/ページの翻訳完了 (約357キー、26名前空間)
     - Header, AuthButton, NotificationDropdown, Feed ページ
     - PostCard, PostForm, NotificationItem, UserProfileEditForm
     - **LanguageSwitcher (言語切り替えUI)** ✅ 完了
     - **DiseaseList (疾患リスト)** ✅ 完了
     - **DiseaseForm (疾患フォーム)** ✅ 完了
     - **EditDiseaseForm (疾患編集フォーム)** ✅ 完了
     - **EditDiseaseModal (疾患編集モーダル)** ✅ 完了
     - **DiseaseStatusBadge (疾患ステータスバッジ)** ✅ 完了
     - **CategorySelector (カテゴリセレクター)** ✅ 完了
     - **Home Page (ホームページ)** ✅ 完了
     - **Add Disease Page (疾患追加ページ)** ✅ 完了
     - **Edit Profile Page (プロフィール編集ページ)** ✅ 完了
     - **Public Profile Page (他のユーザーのプロフィールページ)** ✅ 完了
     - **Post Detail Page (投稿詳細ページ)** ✅ 完了
     - **CommentSection (コメントセクション)** ✅ 完了
     - **UserSearch (ユーザー検索)** ✅ 完了
     - **DiseaseSearch (疾患検索)** ✅ 完了
     - **UserProfileCard (ユーザープロフィールカード)** ✅ 完了
     - **FollowersList (フォロワーリスト)** ✅ 完了
     - **FollowingList (フォロー中リスト)** ✅ 完了
     - **FollowButton (フォローボタン)** ✅ 完了
     - **Search Page (検索ページ)** ✅ 完了
   - ⏳ 今後の拡張:
     - 追加のページコンポーネント (設定ページなど)
     - ユーザーの`preferred_language`設定に基づいた自動ロケール選択

2. **エラーハンドリングの改善** ✅ 完了
   - ✅ 401/403エラー時の自動リダイレクト処理
     - APIクライアントのインターセプターで401/403エラーを検出
     - 認証トークンをクリア
     - 現在のURLをsessionStorageに保存（ログイン後にリダイレクト用）
     - ホームページに自動リダイレクト
   - ✅ ネットワークエラー時のユーザーフレンドリーなフィードバック
     - ErrorDisplayコンポーネントの実装
     - エラータイプに応じたアイコンと色分け表示
     - 多言語対応のエラーメッセージ
     - 再試行ボタンの提供
   - ✅ エラーハンドリングユーティリティの実装
     - `errorHandler.ts` - エラー情報の抽出と分類
     - エラータイプの列挙型（NETWORK, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION, SERVER, UNKNOWN）
     - Axiosエラー、標準エラー、文字列エラーの統一的な処理
   - ✅ エラーメッセージの翻訳追加
     - `errors`名前空間に9キー追加（network, unauthorized, forbidden, notFound, validation, server, general, statusCode, retry）
   - ✅ フィードページでの使用例実装
     - ErrorDisplayコンポーネントの統合
     - extractErrorInfoを使用したエラー情報の抽出

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
  - **フェーズ4** (追加):
    - DiseaseList コンポーネントの翻訳追加 (23キー)
      - 疾患情報表示、診断情報、症状・制限事項・服薬情報の翻訳
      - プライバシーバッジ（公開/非公開、検索可能/不可、有効/無効）の翻訳
      - アクションボタン（詳細、編集、キャンセル、削除）の翻訳
  - **フェーズ5** (追加):
    - DiseaseForm コンポーネントの翻訳追加 (50キー)
      - 疾患追加・編集フォームの完全な多言語対応
      - セクションタイトル（疾患選択、診断情報、症状・治療情報、プライバシー設定）
      - ステップガイド（カテゴリ選択、疾患選択）
      - フィールドラベル（14フィールド）
      - プレースホルダー（8個）
      - 重症度レベルオプション（5段階）
      - エラーメッセージ（3種類）
      - ボタンテキスト（キャンセル、保存中、追加、更新）
  - **フェーズ6** (追加):
    - EditDiseaseForm と EditDiseaseModal コンポーネントの翻訳追加 (17キー追加)
      - 既存の`diseaseForm`名前空間を再利用
      - 追加フィールド（診断医師、診断病院、服用薬、メモ）
      - 重症度範囲表示（軽度/重度）
      - 詳細プレースホルダー（症状、制限事項、服薬情報）
      - プライバシー設定ラベル（この疾患を公開する、検索可能にする）
      - エラーメッセージ（更新に失敗しました）
  - **フェーズ7** (追加):
    - DiseaseStatusBadge コンポーネントの翻訳追加 (11キー)
      - 疾患ステータスラベル（活動期、寛解期、完治、疑い、治療中）
      - 重症度ラベル（軽度、やや軽度、中程度、やや重度、重度）
      - レベルプレフィックス（Lv.）
      - 現在のロケールに応じた翻訳表示（useLocale使用）
      - SeverityBadgeコンポーネントも多言語対応
  - **フェーズ8** (追加):
    - CategorySelector コンポーネントの翻訳追加 (2キー)
      - ラベルとプレースホルダーの多言語対応
      - カテゴリ名の現在のロケールに応じた表示（useLocale使用）
      - インデント処理の多言語対応（日本語は全角スペース、英語は半角スペース）
      - CategoryBreadcrumbコンポーネントも多言語対応
  - **フェーズ9** (追加):
    - Home Page (app/[locale]/page.tsx) の翻訳追加 (18キー)
      - タイトル、サブタイトル、ローディングメッセージの多言語対応
      - エラーメッセージとデバッグ情報の翻訳
      - APIレスポンス表示ラベルの翻訳
      - 「始める」セクションとAPIドキュメントリンクの翻訳
  - **フェーズ10** (追加):
    - Add Disease Page (app/[locale]/diseases/add/page.tsx) の翻訳追加 (6キー)
      - タイトル、説明、ローディングメッセージの多言語対応
      - エラーメッセージ（疾患選択エラー、追加失敗）の翻訳
      - 戻るリンクの翻訳
    - Edit Profile Page (app/[locale]/profile/me/edit/page.tsx) の翻訳追加 (8キー)
      - タイトル、説明、ローディングメッセージの多言語対応
      - 認証エラー、プロフィール読み込みエラーの翻訳
      - 再試行ボタンの翻訳
    - Public Profile Page (app/[locale]/profile/[id]/page.tsx) の翻訳追加 (14キー)
      - ローディング、エラー、プロフィール未検出メッセージの多言語対応
      - フォロワー/フォロー中ラベルの翻訳
      - タブ（投稿、フォロワー、フォロー中）の翻訳
      - 自己紹介、登録疾患、登録日の翻訳
      - 日付フォーマットのロケール対応（ja-JP/en-US）
      - 投稿一覧の「今後実装予定」メッセージの翻訳
  - **フェーズ11** (追加):
    - Post Detail Page (app/[locale]/posts/[id]/page.tsx) の翻訳追加 (5キー)
      - 戻るボタンの翻訳
      - 投稿読み込みエラーメッセージの翻訳
      - 投稿未検出メッセージとエラー説明の翻訳
      - フィードに戻るリンクの翻訳
  - **フェーズ12** (追加):
    - CommentSection コンポーネントの翻訳追加 (25キー)
      - コメント一覧表示（タイトル、コメント数表示）
      - コメント投稿フォーム（プレースホルダー、送信ボタン）
      - 返信機能（返信ボタン、返信フォーム、返信表示/非表示）
      - 時間表示の多言語対応（たった今、○分前、○時間前）
      - エラーメッセージ（ログイン必要、内容必須、文字数制限、投稿失敗など）
      - ログインプロンプト（RichText対応）
    - UserSearch コンポーネントの翻訳追加 (12キー)
      - 検索フォーム（プレースホルダー、検索ボタン、検索中表示）
      - 詳細検索（会員ID検索、疾患フィルター）
      - 検索結果表示（件数表示、結果なしメッセージ）
      - エラーメッセージ（検索失敗）
    - DiseaseSearch コンポーネントの翻訳追加 (13キー)
      - 検索フォーム（プレースホルダー、検索ボタン、検索中表示）
      - 詳細検索（ICD-10コード検索、カテゴリー選択）
      - 検索結果表示（コード表示、選択ボタン、結果なしメッセージ）
      - エラーメッセージ（検索失敗）
    - UserProfileCard コンポーネントの翻訳追加 (21キー)
      - プロフィール情報表示（会員ID、自己紹介、国、言語）
      - 個人情報セクション（名前、メール、電話、生年月日、性別）
      - アカウント情報（作成日、最終ログイン、登録疾患数）
      - 性別値の翻訳（男性、女性、その他、回答しない）
      - プロフィール編集リンク
    - FollowersList コンポーネントの翻訳追加 (3キー)
      - ローディング表示
      - フォロワーなしメッセージ
      - エラーメッセージ（読み込み失敗）
    - FollowingList コンポーネントの翻訳追加 (3キー)
      - ローディング表示
      - フォロー中なしメッセージ
      - エラーメッセージ（読み込み失敗）
    - FollowButton コンポーネントの翻訳追加 (4キー)
      - フォロー/フォロー解除ボタン
      - フォロー中表示
      - エラーメッセージ（更新失敗）
    - Search Page (app/[locale]/search/page.tsx) の翻訳追加 (15キー)
      - ページタイトルとサブタイトル
      - タブ（疾患検索、ユーザー検索）
      - 検索のヒント（疾患検索用4つ、ユーザー検索用4つ）
      - ホームに戻るリンク
  - **合計**: 357キー、26名前空間、619行 (両言語)
  - Progress.md 更新 (翻訳統計テーブル更新、フェーズ12追加)

### 2025-11-15 (続き)
- **エラーハンドリングの改善** ✅ 完了
  - エラーハンドリングユーティリティの実装 (`lib/utils/errorHandler.ts`)
    - ErrorType列挙型の定義（NETWORK, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION, SERVER, UNKNOWN）
    - extractErrorInfo関数 - 各種エラー形式を統一的なErrorInfoに変換
    - requiresAuthRedirect関数 - 認証リダイレクトが必要か判定
    - getErrorMessageKey関数 - 翻訳キーを取得
  - ErrorDisplayコンポーネントの実装 (`components/ErrorDisplay.tsx`)
    - エラータイプに応じたアイコン表示
    - エラータイプに応じた色分け（ネットワーク=黄色、認証=赤、バリデーション=オレンジ）
    - 多言語対応のエラーメッセージ表示
    - 再試行ボタンの提供
    - 詳細情報の表示オプション
  - APIクライアントの改善 (`lib/api/client.ts`)
    - 401/403エラー時の自動リダイレクト処理
    - 認証トークンの自動クリア
    - 現在のURLをsessionStorageに保存（ログイン後リダイレクト用）
  - エラーメッセージの翻訳追加
    - `errors`名前空間に9キー追加（日本語・英語）
    - ネットワーク、認証、権限、検証、サーバーエラーのメッセージ
  - フィードページでの使用例実装
    - ErrorDisplayコンポーネントの統合
    - extractErrorInfoを使用したエラー情報の抽出

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
