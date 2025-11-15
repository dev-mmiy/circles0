# Disease Community Platform - 開発進捗

## 最終更新日: 2025-11-15

**現在のステータス**: Phase 2 コミュニティ機能実装中、本番環境稼働中

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
| Header | 7 | `navigation` | 2025-11-14 (2025-11-15更新) |
| AuthButton | 14 | `auth` | 2025-11-15 |
| NotificationDropdown | 16 | `notifications` | 2025-11-15 |
| NotificationBell | 2 (追加) | `notifications` | 2025-11-15 |
| Feed Page | 10 | `feed` | 2025-11-15 |
| PostCard | 11 | `post` | 2025-11-15 |
| PostForm | 9 | `postForm` | 2025-11-15 |
| NotificationItem | 1 + ロケール対応 | `notificationItem` | 2025-11-15 |
| UserProfileEditForm | 54 | `userProfileEdit` | 2025-11-15 (2025-11-15更新) |
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
| Register Page | 13 | `register` | 2025-11-15 |
| **合計** | **381キー** | **26名前空間** | - |

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
4. ✅ ~~CORS エラー（500エラー時のヘッダー欠如）~~ → 修正完了
5. ✅ ~~TypeScript ビルドエラー（DiseaseContext プロパティ名）~~ → 修正完了
6. ✅ ~~Pydantic バリデーションエラー（member_id, nickname が NULL）~~ → 修正完了
7. ✅ ~~プロフィール更新が永続化されない~~ → API呼び出し実装完了
8. ✅ ~~ユーザー名バリデーションが厳しすぎる~~ → 制約緩和完了
9. ✅ ~~疾患名が英語表示される~~ → 多言語対応完了
10. ✅ ~~マスターデータシーディングの外部キー制約違反~~ → 冪等性対応完了（2025-11-13）
11. ✅ ~~PostgreSQL ENUM型の重複作成エラー~~ → raw SQL + DO block対応完了（2025-11-13）
12. ✅ ~~環境間のデータ不整合~~ → 自動マイグレーション・シード導入完了（2025-11-13）

### 残存する問題
- [ ] `.next` ディレクトリの権限問題（ローカル環境のみ）
- [ ] `tsconfig.tsbuildinfo` がgitignoreに未登録

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
   - ✅ **ユーザーの`preferred_language`設定に基づいた自動ロケール選択** ✅ 完了（2025-11-15）
     - UserContextでユーザー情報取得時に`preferred_language`をチェック
     - 現在のロケールと異なる場合、自動的にロケールを切り替え
     - ユーザーが手動で言語を切り替えた場合は、その設定を優先（localStorageに`locale_override`フラグを保存）
     - LanguageSwitcherコンポーネントで手動切り替え時に`locale_override`フラグを設定

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

## 今後追加する機能 (Planned Features)

### Phase 1: コア機能強化（優先度：高）

#### 1.1 疾患検索・フィルタリング ✅ 完了（2025-11-09、検索履歴・フィルター保存は2025-11-15完了）
- [x] **疾患名による検索機能**
  - [x] 部分一致検索
  - [x] 英語・日本語翻訳名での検索
  - [x] 検索履歴保存 ✅ 完了（2025-11-15）
- [x] **カテゴリーによるフィルタリング**
  - [x] 複数カテゴリー選択
  - [x] フィルター条件の保存 ✅ 完了（2025-11-15）
- [x] **ICD-10コードによる検索**
  - [x] 部分一致検索
  - [ ] コード範囲指定
  - [ ] コード補完機能

#### 1.2 ユーザー検索・発見 ✅ 完了（2025-11-09）
- [x] **疾患による検索**
  - [x] 同じ疾患を持つユーザー検索
  - [x] 複数疾患の組み合わせ検索
- [x] **プロフィールによる検索**
  - [x] ニックネーム検索
  - [x] 会員ID検索
  - [x] 国・言語による絞り込み
- [x] **検索結果のソート** ✅ 完了（2025-11-15）
  - [x] 登録日順
  - [x] 最終ログイン順
  - [x] ニックネーム順（ユーザー検索）
  - [x] 名前順（疾患検索）
  - [x] コード順（疾患検索）
  - [x] 昇順/降順の選択

#### 1.3 プロフィール公開範囲制御
- [ ] **詳細な公開設定**
  - [ ] 疾患ごとの公開範囲設定
  - [ ] フィールドごとの公開範囲設定
  - [ ] ブロック機能
- [ ] **公開範囲プリセット**
  - [ ] 完全公開
  - [ ] 認証ユーザーのみ
  - [ ] 同じ疾患を持つユーザーのみ
  - [ ] 非公開

### Phase 2: コミュニティ機能（優先度：高）

#### 2.1 投稿・フィード機能 ✅ 完了（2025-11-09）
- [x] **投稿機能**
  - [x] テキスト投稿
  - [x] 画像添付（最大5枚、画像URL対応） ✅ 完了（2025-11-15）
  - [x] ハッシュタグ ✅ 完了（2025-11-15）
    - [x] ハッシュタグ抽出・保存機能
    - [x] ハッシュタグ検索機能
    - [x] ハッシュタグ別投稿表示
  - [x] メンション ✅ 完了（2025-11-15）
    - [x] メンション抽出・保存機能（バックエンド）
    - [x] メンション表示機能（フロントエンド）
    - [x] 投稿フォームでのメンション検出・表示
    - [x] 投稿カードでのメンション表示（プロフィールリンク付き）
- [x] **フィード**
  - [x] タイムライン表示
  - [x] 疾患別フィード ✅ 完了（2025-11-15）
  - [x] フォローしているユーザーのフィード ✅ 完了（既に実装済み）
  - [x] 無限スクロール（ページネーション）

#### 2.2 コメント・リアクション ✅ 完了（2025-11-09）
- [x] **コメント機能**
  - [x] 投稿へのコメント
  - [x] コメントへの返信（ネスト対応）
  - [x] コメント編集・削除
- [x] **リアクション機能**
  - [x] いいね（❤️）
  - [x] 応援（💪）
  - [x] 共感（🤝）
  - [x] リアクション数表示

#### 2.3 フォロー・フォロワー ✅ 完了（2025-11-11）
- [x] **フォロー機能**
  - [x] ユーザーフォロー/アンフォロー
  - [x] フォロー一覧
  - [x] フォロワー一覧
  - [x] 相互フォロー表示
  - [x] フォロー統計（フォロワー数/フォロー中数）
  - [x] プロフィールページからのフォロー
  - [x] フォロワー限定投稿フィルター ✅ 完了（既に実装済み）
- [x] **通知機能** ✅ 完了（2025-11-11）
  - [x] 通知データモデル（Notification テーブル）
  - [x] 通知タイプ（FOLLOW、COMMENT、REPLY、LIKE、COMMENT_LIKE）
  - [x] 通知サービス（重複防止、24時間ウィンドウ）
  - [x] 通知API（一覧、既読、未読カウント、削除）
  - [x] 既存サービスへの統合（フォロー/コメント/いいね時の通知作成）
  - [x] データベースマイグレーション（本番環境適用済み）
  - [x] フロントエンド実装
    - [x] 通知ベルアイコン（未読バッジ、30秒自動更新）
    - [x] 通知ドロップダウン/パネル
    - [x] 通知アイテムUI（タイムスタンプ、既読/削除）
    - [x] ヘッダーコンポーネント統合
    - [x] リアルタイム通知機能（SSE） ✅ 完了（2025-11-13）
    - [x] 通知一覧ページ ✅ 完了（2025-11-15）

### Phase 3: メッセージング・コミュニケーション（優先度：中）

#### 3.1 ダイレクトメッセージ (DM)
- [ ] **1対1メッセージ**
  - [ ] テキストメッセージ送受信
  - [ ] 画像送信
  - [ ] リンク共有
  - [ ] 既読・未読管理
- [ ] **メッセージ一覧**
  - [ ] 会話スレッド一覧
  - [ ] 未読バッジ表示
  - [ ] 検索機能

#### 3.2 グループチャット
- [ ] **グループ作成**
  - [ ] グループ名・説明設定
  - [ ] メンバー招待
  - [ ] 管理者権限設定
- [ ] **グループ機能**
  - [ ] グループチャット
  - [ ] メンバー管理（追加/削除）
  - [ ] グループ設定変更

### Phase 4: 記録・分析機能（優先度：中）

#### 4.1 健康記録
- [ ] **日記機能**
  - [ ] 日々の体調記録
  - [ ] 症状メモ
  - [ ] 服薬記録
  - [ ] カレンダー表示
- [ ] **バイタル記録**
  - [ ] 血圧
  - [ ] 体温
  - [ ] 体重
  - [ ] その他のバイタル
  - [ ] グラフ表示

#### 4.2 分析・レポート
- [ ] **統計ダッシュボード**
  - [ ] 症状の推移グラフ
  - [ ] 服薬遵守率
  - [ ] 体調の傾向分析
- [ ] **月次レポート**
  - [ ] PDF出力
  - [ ] 医師共有機能

### Phase 5: 医療連携・情報提供（優先度：低）

#### 5.1 医療機関連携
- [ ] **医療機関検索**
  - [ ] 疾患別専門病院検索
  - [ ] 地域別検索
  - [ ] 口コミ・評価
- [ ] **医師アカウント**
  - [ ] 医療従事者向けアカウント
  - [ ] Q&A機能
  - [ ] 専門家の投稿

#### 5.2 情報リソース
- [ ] **疾患情報ライブラリ**
  - [ ] 疾患詳細情報
  - [ ] 治療法ガイド
  - [ ] 最新研究情報
- [ ] **FAQ・よくある質問**
  - [ ] カテゴリー別FAQ
  - [ ] 検索機能
  - [ ] ユーザー投稿FAQ

### Phase 6: モバイル・通知（優先度：低）

#### 6.1 プッシュ通知
- [ ] **Web Push Notifications**
  - [ ] 新規フォロワー通知
  - [ ] コメント・リアクション通知
  - [ ] DM通知
  - [ ] 服薬リマインダー

#### 6.2 モバイルアプリ
- [ ] **React Native / Flutter アプリ**
  - [ ] iOS対応
  - [ ] Android対応
  - [ ] ネイティブ通知

### Phase 7: 管理・運用機能（優先度：低）

#### 7.1 管理者機能
- [ ] **ユーザー管理**
  - [ ] ユーザー一覧
  - [ ] ユーザー詳細情報
  - [ ] アカウント停止/削除
- [ ] **コンテンツモデレーション**
  - [ ] 投稿の報告・削除
  - [ ] コメントの非表示
  - [ ] 不適切コンテンツフィルター

#### 7.2 運用ツール
- [ ] **分析ダッシュボード**
  - [ ] ユーザー数推移
  - [ ] アクティブユーザー数
  - [ ] 人気の疾患カテゴリー
  - [ ] エンゲージメント指標
- [ ] **バックアップ・復旧**
  - [ ] 定期バックアップ
  - [ ] ポイントインタイムリカバリ

---

## 技術的改善項目 (Technical Improvements)

### セキュリティ
- [ ] **認証強化**
  - [ ] 多要素認証 (MFA)
  - [ ] パスワードレス認証
  - [ ] セッション管理強化
- [ ] **データ保護**
  - [ ] 個人情報の暗号化
  - [ ] GDPR対応
  - [ ] データエクスポート機能

### パフォーマンス
- [ ] **フロントエンド最適化**
  - [ ] 画像最適化（WebP、遅延読み込み）
  - [ ] コード分割
  - [ ] キャッシング戦略
- [ ] **バックエンド最適化**
  - [ ] データベースクエリ最適化
  - [ ] インデックス追加
  - [ ] Redis キャッシュ導入
  - [ ] CDN導入

### テスト
- [ ] **自動テスト**
  - [ ] ユニットテスト（pytest、Jest）
  - [ ] 統合テスト
  - [ ] E2Eテスト（Playwright）
  - [ ] テストカバレッジ 80%以上
- [ ] **CI/CD改善**
  - [ ] 自動テスト実行
  - [ ] Lint チェック
  - [ ] セキュリティスキャン

### 監視・ロギング
- [ ] **アプリケーション監視**
  - [ ] Google Cloud Monitoring
  - [ ] エラー追跡（Sentry）
  - [ ] パフォーマンス監視（APM）
- [ ] **ロギング強化**
  - [ ] 構造化ログ
  - [ ] ログ集約（Cloud Logging）
  - [ ] アラート設定

---

## 次回セッションの推奨タスク

### 最優先（すぐに着手）
1. ~~**通知機能の完成**~~ ✅ 完了（2025-11-13）
   - [x] バックエンド実装完了（モデル、サービス、API）
   - [x] 既存サービスへの統合完了
   - [x] データベースマイグレーション実行
   - [x] フロントエンド実装完了
   - [x] ローカル環境でのテスト完了
   - [x] 本番環境デプロイ完了

2. ~~**リアルタイム通知機能**~~ ✅ 完了（2025-11-15）
   - [x] Server-Sent Events (SSE) 実装
   - [x] 通知のリアルタイム配信
   - [x] ブラウザ通知（Web Push API） ✅ 完了（2025-11-15）

3. ~~**フォロワー限定投稿フィルター**~~ ✅ 完了（既に実装済み）
   - [x] バックエンド: フォロー関係に基づく投稿フィルタリング
   - [x] フロントエンド: フォローしているユーザーの投稿のみ表示
   - [x] フィルタータブUI実装（すべての投稿/フォロー中のユーザー）

4. ~~**通知一覧ページ**~~ ✅ 完了（2025-11-15）
   - [x] 通知一覧ページ (`app/[locale]/notifications/page.tsx`) の作成
   - [x] フィルター機能（すべての通知/未読のみ）の実装
   - [x] ページネーション対応（20件ずつ読み込み）
   - [x] 全て既読にするボタンの実装
   - [x] リアルタイム通知の自動更新対応
   - [x] 多言語対応（日本語・英語）
   - [x] 認証チェックと未認証時のリダイレクト処理
   - [x] エラーハンドリングと再試行機能

### 優先度高（短期目標）
5. ~~**投稿機能の拡張**~~ ✅ 完了（2025-11-15）
   - [x] 画像添付機能（画像URL対応） ✅ 完了（2025-11-15）
     - [x] PostImageモデルの作成（post_imagesテーブル）
     - [x] データベースマイグレーション（add_post_image_table_20251115.py）
     - [x] PostCreateスキーマにimage_urlsフィールド追加（最大5枚）
     - [x] PostServiceに画像作成処理追加
     - [x] APIレスポンスに画像情報を含める（PostImageResponse）
     - [x] PostFormに画像URL入力機能追加（プレビュー、削除機能付き）
     - [x] PostCardに画像表示機能追加（グリッドレイアウト、クリックで拡大）
     - [x] 多言語対応（日本語・英語）
   - [ ] 画像アップロード機能（Cloud Storage連携） - 今後実装予定
   - [x] ハッシュタグ対応 ✅ 完了（2025-11-15）
   - [x] メンション機能 ✅ 完了（2025-11-15）
   - [x] 疾患別フィード ✅ 完了（2025-11-15）

6. ~~**検索機能の拡張**~~ ✅ 完了（2025-11-15）
   - [x] 検索履歴保存 ✅ 完了（2025-11-15）
     - [x] 検索履歴ユーティリティ関数の作成（localStorage使用）
     - [x] ユーザー検索の検索履歴機能（最大10件、重複排除）
     - [x] 疾患検索の検索履歴機能（最大10件、重複排除）
     - [x] 検索履歴ドロップダウンUI（クリックで再検索、個別削除、全削除）
     - [x] 検索パラメータの保存と復元（フィルター、ソート設定）
     - [x] 多言語対応（日本語・英語）
   - [x] 検索結果のソート機能 ✅ 完了（2025-11-15）
     - [x] ユーザー検索のソート機能（登録日順、最終ログイン順、ニックネーム順）
     - [x] 疾患検索のソート機能（名前順、コード順、登録日順）
     - [x] 昇順/降順の選択機能
     - [x] 多言語対応（日本語・英語）
   - [x] フィルター条件の保存 ✅ 完了（2025-11-15）
     - [x] フィルター条件保存ユーティリティ関数の作成（filterSettings.ts）
     - [x] ユーザー検索のフィルター条件保存・復元（会員ID、疾患フィルター、ソート設定）
     - [x] 疾患検索のフィルター条件保存・復元（カテゴリー、ICD-10コード、ソート設定）
     - [x] フィルター条件の自動保存（変更時に即座に保存）
     - [x] ページ読み込み時のフィルター条件自動復元
     - [x] フィルター条件クリアボタンの実装
     - [x] 多言語対応（日本語・英語）

### 技術改善
6. **自動テストの導入**
   - pytest によるバックエンドテスト
   - Jest によるフロントエンドテスト

7. ~~**`.gitignore` の更新**~~ ✅ 完了（2025-11-15）
   - [x] `tsconfig.tsbuildinfo` 追加
   - [x] `*.tsbuildinfo` パターン追加

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
  - **フェーズ13** (追加):
    - Header コンポーネントのモバイルメニューaria-label翻訳追加 (2キー)
      - メニューを開く/閉じるのaria-labelの多言語対応
      - `navigation.openMenu` / `navigation.closeMenu` キー追加
  - **フェーズ14** (追加):
    - NotificationBell コンポーネントの翻訳追加 (2キー)
      - aria-labelとtitle属性の多言語対応
      - `notifications.realtimeConnected` / `notifications.connecting` キー追加
      - 既存の`notifications.title`キーを活用
  - **フェーズ15** (追加):
    - UserProfileEditForm コンポーネントの言語選択オプション翻訳追加 (5キー)
      - 優先言語選択の言語名の多言語対応
      - `userProfileEdit.languages` セクション追加（ja, en, es, fr, de）
      - 日本語環境では各言語のネイティブ名、英語環境では英語名を表示
  - **フェーズ16** (追加):
    - Register Page (app/[locale]/register/page.tsx) の翻訳追加 (13キー)
      - 会員登録ページの完全な多言語対応
      - タイトル、サブタイトル、ローディングメッセージ
      - フォームフィールド（メール、ニックネーム、プロフィール公開設定）
      - プロフィール画像セクション
      - 送信ボタンと利用規約の注意書き
      - エラーメッセージ
  - **フェーズ17** (新機能追加):
    - **ユーザーの`preferred_language`設定に基づいた自動ロケール選択機能** ✅ 完了
      - UserContextに自動ロケール選択ロジックを追加
      - ユーザー情報取得時に`preferred_language`をチェック
      - 現在のロケールと異なる場合、自動的にロケールを切り替え
      - ユーザーが手動で言語を切り替えた場合は、その設定を優先（localStorageに`locale_override`フラグを保存）
      - LanguageSwitcherコンポーネントで手動切り替え時に`locale_override`フラグを設定
      - 実装ファイル:
        - `frontend/contexts/UserContext.tsx` - 自動ロケール選択ロジック
        - `frontend/components/LanguageSwitcher.tsx` - 手動切り替え時のフラグ設定
  - **フェーズ18** (バグ修正):
    - UserProfileEditFormコンポーネントの不足翻訳キー追加 (11キー)
      - フィールド別公開設定セクションの翻訳キー追加
      - `sections.fieldVisibility` - セクションタイトル
      - `fieldVisibility.description` - 説明文
      - `fieldVisibility.loading` - ローディングメッセージ
      - `fieldVisibility.updateFailed` - エラーメッセージ
      - `fieldVisibility.options.*` - 公開設定オプション（public, limited, private, sameDiseaseOnly）
      - `fields.avatarUrl`, `fields.language`, `fields.timezone` - フィールドラベル

### 2025-11-15 (続き)
- **ハッシュタグ機能の実装** ✅ 完了
  - バックエンド実装:
    - ハッシュタグデータモデル（Hashtag, PostHashtag）の作成
    - マイグレーションファイル（add_hashtag_tables_20251115.py）の作成
    - ハッシュタグ抽出ユーティリティ関数（extract_hashtags, normalize_hashtag）
    - ハッシュタグサービス（HashtagService）の実装
      - ハッシュタグの取得・作成（get_or_create_hashtag）
      - 投稿からのハッシュタグ抽出・関連付け（extract_and_create_hashtags）
      - ハッシュタグ検索（search_hashtags）
      - 人気ハッシュタグ取得（get_popular_hashtags）
    - ハッシュタグAPIエンドポイント（/api/v1/hashtags）の実装
      - GET /api/v1/hashtags?q={query} - ハッシュタグ検索
      - GET /api/v1/hashtags/popular - 人気ハッシュタグ取得
    - 投稿作成・更新時のハッシュタグ自動抽出・保存機能
    - 投稿レスポンスにハッシュタグを含める機能
  - フロントエンド実装:
    - ハッシュタグ抽出ユーティリティ関数（extractHashtags）の実装
    - PostFormコンポーネントにハッシュタグ自動検出・表示機能を追加
      - 入力中にハッシュタグを自動検出
      - 検出されたハッシュタグを視覚的に表示
    - PostCardコンポーネントにハッシュタグ表示機能を追加
      - 投稿に含まれるハッシュタグを表示
      - ハッシュタグをクリック可能なリンクとして表示（検索ページへのリンク）
    - 翻訳キーの追加（日本語・英語）
      - postForm.detectedHashtags
  - テスト結果:
    - バックエンド: ハッシュタグ抽出機能のテスト（10テストケース全てパス）
    - フロントエンド: ハッシュタグ抽出機能のテスト（10テストケース全てパス）
  - 動作確認チェックリスト: HASHTAG_FEATURE_CHECKLIST.md を作成

- **ハッシュタグ検索機能の実装** ✅ 完了（2025-11-15）
  - バックエンド実装:
    - PostServiceに`get_posts_by_hashtag`メソッドを追加
      - ハッシュタグ名で投稿を検索
      - 公開範囲設定を考慮したフィルタリング
      - フォロー関係を考慮した表示制御
    - Posts APIに`GET /api/v1/posts/hashtag/{hashtag_name}`エンドポイントを追加
      - ページネーション対応（skip, limit）
      - 認証オプショナル
  - フロントエンド実装:
    - ハッシュタグ検索API関数の実装
      - `searchHashtags` - ハッシュタグ検索（部分一致）
      - `getPopularHashtags` - 人気ハッシュタグ取得
      - `getPostsByHashtag` - ハッシュタグで投稿取得
    - HashtagSearchコンポーネントの作成
      - ハッシュタグ検索フォーム（自動補完機能付き）
      - 人気ハッシュタグの表示
      - ハッシュタグを含む投稿一覧の表示
      - ページネーション（もっと見るボタン）
      - エラーハンドリング
    - 検索ページに「ハッシュタグ」タブを追加
      - タブナビゲーションに統合
      - URLパラメータ対応（`?q=hashtag&type=hashtags`）
      - 初期値としてURLパラメータから読み込み
    - PostCardコンポーネントのハッシュタグリンク修正
      - ハッシュタグクリックで検索ページに遷移
      - URLパラメータで検索結果を表示
    - 翻訳キーの追加（日本語・英語）
      - `searchPage.tabHashtags`
      - `searchPage.hintsHashtags` (4つのヒント)
      - `hashtagSearch`名前空間（7キー）
  - 修正内容:
    - TypeScriptエラー修正: `lib/utils/hashtag.ts`の`matchAll`を`exec`ループに変更（ES5互換性）
    - useEffect依存配列の修正: ESLint警告の適切な処理
  - 動作確認:
    - TypeScript型チェック: パス
    - リンターエラー: なし
    - バックエンド構文チェック: パス
  - 動作確認ドキュメント: HASHTAG_SEARCH_VERIFICATION.md を作成

- **モバイル対応のハンバーガーメニュー実装** ✅ 完了
  - Headerコンポーネントにハンバーガーメニューを追加
  - スマートフォンでナビゲーションメニューにアクセス可能に
  - モバイルメニューの開閉機能とオーバーレイを実装
  - ルート変更時の自動メニュー閉鎖機能を追加
  - メニュー開閉中のbodyスクロール無効化
  - アクセシビリティ対応（aria-label、aria-expanded）

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

- **通知一覧ページの実装** ✅ 完了
  - 通知一覧ページ (`app/[locale]/notifications/page.tsx`) の作成
  - フィルター機能（すべての通知/未読のみ）の実装
  - ページネーション対応（20件ずつ読み込み）
  - 全て既読にするボタンの実装
  - リアルタイム通知の自動更新対応
  - 多言語対応（日本語・英語）
  - 翻訳キーの追加（pageTitle, pageSubtitle, filterAll, filterUnread, loading, loadMore, allNotificationsShown, noUnreadNotifications, noUnreadNotificationsMessage, errorLoading, retry）
  - 認証チェックと未認証時のリダイレクト処理
  - エラーハンドリングと再試行機能

- **検索履歴保存機能の実装** ✅ 完了
  - 検索履歴ユーティリティ関数の作成 (`lib/utils/searchHistory.ts`)
    - localStorageを使用した検索履歴の保存・取得
    - 最大10件の履歴保持、重複排除機能
    - 検索パラメータの保存と復元機能
  - UserSearchコンポーネントに検索履歴機能を追加
    - 検索ボックスフォーカス時に履歴ドロップダウン表示
    - 履歴アイテムクリックで再検索
    - 個別削除・全削除機能
    - 検索パラメータ（フィルター、ソート設定）の保存と復元
  - DiseaseSearchコンポーネントに検索履歴機能を追加
    - 同様の機能を疾患検索にも実装
  - 多言語対応（日本語・英語）
    - 翻訳キーの追加（searchHistory, clearHistory, noHistory, clickToSearch）

- **`.gitignore`の更新** ✅ 完了
  - `*.tsbuildinfo`と`tsconfig.tsbuildinfo`を追加

- **バックエンドのバグ修正** ✅ 完了
  - `app/api/users.py`に`Query`のインポートを追加（NameError修正）

- **投稿機能の拡張** ✅ 完了（2025-11-15）
  - **疾患別フィード機能の実装**
    - フィードページに「疾患別」タブを追加
    - ユーザーの登録疾患から選択してフィルタリング
    - 選択した疾患を持つユーザーの投稿を表示
    - 多言語対応（日本語・英語）
    - 翻訳キーの追加（filterDisease, selectDisease, selectDiseasePlaceholder, selectDiseasePrompt, noDiseasePosts, noDiseasePostsMessage）
  - **メンション機能の実装**
    - バックエンド実装:
      - PostMentionとCommentMentionモデルの作成
      - メンション抽出ユーティリティ関数（`@username`形式を検出）
      - MentionServiceの実装（メンション抽出・保存・取得）
      - 投稿作成・更新時のメンション自動抽出
      - APIレスポンスにメンション情報を含める
      - データベースマイグレーション（post_mentions, comment_mentionsテーブル）
    - フロントエンド実装:
      - メンション抽出ユーティリティ関数
      - 投稿フォームでのメンション検出・表示
      - 投稿カードでのメンション表示（プロフィールリンク付き）
      - 多言語対応（日本語・英語）
      - 翻訳キーの追加（postForm.detectedMentions, post.mentions）
  - **エラーハンドリングの修正**
    - errorHandler.tsのgetErrorMessageKey関数を修正（名前空間プレフィックスを削除）
    - ErrorDisplayコンポーネントが正しく翻訳キーを解決できるように修正
  - **データベースマイグレーション実行**
    - ハッシュタグテーブルとメンションテーブルのマイグレーションを実行
- **Web Push API（ブラウザ通知）の実装** ✅ 完了（2025-11-15）
  - バックエンド実装:
    - PushSubscriptionモデルの作成（push_subscriptionsテーブル）
    - データベースマイグレーション（add_push_subscription_table_20251115.py）
    - PushServiceの実装（サブスクリプション管理、プッシュ通知送信）
    - Push Subscription APIエンドポイント（登録・削除・公開キー取得）
    - NotificationServiceへのPush通知送信統合
    - VAPIDキー生成スクリプト（scripts/generate_vapid_keys.py）
    - 必要なライブラリ追加（pywebpush, py-vapid）
  - フロントエンド実装:
    - Service Workerの実装（public/sw.js）
      - Push通知の受信と表示
      - 通知クリック時のページ遷移処理
    - Push通知ユーティリティ関数（lib/utils/pushNotifications.ts）
      - Service Worker登録
      - 通知許可リクエスト
      - サブスクリプション管理
    - usePushNotificationsフック（lib/hooks/usePushNotifications.ts）
      - Push通知の状態管理
      - サブスクリプションの有効化/無効化
    - NotificationContextへのブラウザ通知表示機能追加
    - next.config.jsにService Worker設定追加
  - ドキュメント:
    - WEB_PUSH_SETUP.md - セットアップガイド作成
  - 機能:
    - ユーザーが通知許可を付与すると、自動的にプッシュサブスクリプションが登録される
    - 新しい通知が作成されると、ブラウザにプッシュ通知が表示される
    - 通知をクリックすると、関連するページに遷移する
    - ブラウザが閉じていても通知を受信できる

- **フィルター条件の保存機能** ✅ 完了（2025-11-15）
  - フィルター条件保存ユーティリティ関数の作成（`lib/utils/filterSettings.ts`）
    - ユーザー検索フィルター設定の保存・取得・クリア機能
    - 疾患検索フィルター設定の保存・取得・クリア機能
    - localStorageを使用した永続化
  - UserSearchコンポーネントへの統合
    - ページ読み込み時のフィルター条件自動復元
    - フィルター条件変更時の自動保存
    - フィルター条件クリアボタンの追加
  - DiseaseSearchコンポーネントへの統合
    - 同様の機能を疾患検索にも実装
  - 多言語対応（日本語・英語）
    - 翻訳キーの追加（clearFilters）

- **画像添付機能の実装** ✅ 完了（2025-11-15）
  - バックエンド実装:
    - PostImageモデルの作成（post_imagesテーブル）
      - post_id, image_url, display_order, created_atフィールド
      - Postモデルとのリレーションシップ（1対多）
    - データベースマイグレーション（add_post_image_table_20251115.py）
      - post_imagesテーブルの作成
      - 外部キー制約（CASCADE削除）
      - インデックス追加
    - PostCreateスキーマにimage_urlsフィールド追加（最大5枚）
      - Optional[List[str]]型
      - バリデーション（最大5枚）
    - PostServiceに画像作成処理追加
      - create_postメソッドで画像URLを受け取り、PostImageレコードを作成
      - display_orderで順序管理
    - APIレスポンスに画像情報を含める
      - PostImageResponseスキーマの作成
      - _build_post_responseと_build_post_detail_responseに画像情報追加
      - get_post_by_id, get_feed, get_user_posts, get_posts_by_hashtagで画像をjoinedload
  - フロントエンド実装:
    - APIクライアントの型定義更新
      - PostImageインターフェースの追加
      - Postインターフェースにimagesフィールド追加
      - CreatePostDataにimage_urlsフィールド追加
    - PostFormに画像URL入力機能追加
      - 画像URL入力フィールド（最大5枚）
      - 画像プレビュー表示（サムネイル）
      - 画像削除機能（×ボタン）
      - Enterキーで画像追加
      - バリデーション（最大5枚）
    - PostCardに画像表示機能追加
      - 画像グリッドレイアウト（1枚: 1列、2枚以上: 2列）
      - 画像クリックで新しいタブで開く
      - エラー時のフォールバック画像表示
      - レスポンシブ対応
    - 多言語対応（日本語・英語）
      - 翻訳キーの追加（imagesLabel, imageUrlPlaceholder, addImage, tooManyImages）
  - 注意事項:
    - 現在は画像URLを直接入力する形式
    - Cloud Storage連携による画像アップロード機能は今後実装予定

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

---

## 開発統計

### コードベース
- **総行数**: 約18,000行以上
- **バックエンド（Python）**: 約10,000行（60ファイル以上）
- **フロントエンド（TypeScript/TSX）**: 約8,000行（50ファイル以上）

### コミット履歴（最近10件）
```
4c58a60 - docs: Archive outdated markdown files to docs/archive (2025-11-15)
02f1d83 - feat: Add follower-only post filter and fix CI/CD tests (2025-11-15)
b615f74 - feat: Add mobile hamburger menu to Header component (2025-11-15)
25efeae - feat: Expand internationalization support and implement search page (2025-11-15)
e156d6f - feat: add i18n support to Header component (2025-11-13)
6a166ca - feat: add home link to header navigation (2025-11-13)
b2415e7 - feat: add header to profile pages (2025-11-13)
468161c - fix: correct user ID retrieval from Auth0 tokens in API endpoints (2025-11-13)
9eaffe6 - feat: display user nickname instead of email in header (2025-11-13)
daf9215 - feat: add header with notification bell to homepage (2025-11-13)
```

---

## リンク

- **GitHub Repository**: https://github.com/dev-mmiy/circles0
- **GitHub Actions**: https://github.com/dev-mmiy/circles0/actions
- **本番環境**:
  - Frontend: https://disease-community-frontend-508246122017.asia-northeast1.run.app
  - Backend API: https://disease-community-api-508246122017.asia-northeast1.run.app
  - API Docs: https://disease-community-api-508246122017.asia-northeast1.run.app/docs
- **Auth0 Dashboard**: https://manage.auth0.com
- **GCP Console**: https://console.cloud.google.com/run?project=circles-202510

---

**最終更新日**: 2025-11-15  
**最終更新者**: Claude Code  
**ステータス**: ✅ 基本機能実装完了、本番環境稼働中、投稿機能拡張（ハッシュタグ・メンション・疾患別フィード・画像添付）実装完了、多言語対応拡充中
