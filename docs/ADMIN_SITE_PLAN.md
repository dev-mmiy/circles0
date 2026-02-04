# 管理サイト実装プラン

## 概要

現在のDisease Community Platformとは別のサブドメインで運用する管理用サイトの実装プランです。このサイトでは、ユーザー管理と将来的なマスターデータ管理（食材マスターなど）を提供します。

## 1. アーキテクチャ概要

### 1.1 システム構成

```
┌─────────────────────────────────────────────────────────┐
│                   管理サイト (work.lifry.com)           │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Next.js Frontend (Admin UI)                    │  │
│  │  - User Management                              │  │
│  │  - Master Data Management (Future)              │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          │ API Calls
                          ▼
┌─────────────────────────────────────────────────────────┐
│             既存バックエンド (api.lifry.com)           │
│  ┌──────────────────────────────────────────────────┐  │
│  │  FastAPI Backend                                 │  │
│  │  - /api/v1/admin/* (新規エンドポイント)          │  │
│  │  - 既存APIの再利用                               │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL Database                        │
│  - users テーブル (既存)                                │
│  - admin_users テーブル (新規)                          │
│  - admin_permissions テーブル (新規)                    │
│  - food_master テーブル (将来拡張)                      │
└─────────────────────────────────────────────────────────┘
```

### 1.2 ドメイン構成

- **メインサイト**: `lifry.com` (既存)
- **管理サイト**: `work.lifry.com` (新規)
- **API**: `api.lifry.com` (既存)

### 1.3 技術スタック

#### フロントエンド（管理サイト）
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **認証**: Auth0 React SDK（既存のAuth0テナントを共有して使用）
- **UIコンポーネント**: 
  - テーブル: `@tanstack/react-table` (推奨)
  - フォーム: React Hook Form
  - モーダル/ダイアログ: Headless UI または Radix UI

#### バックエンド
- **既存APIの拡張**: FastAPI
- **新規エンドポイント**: `/api/v1/admin/*`
- **認証**: Auth0 JWT (既存と同一)
- **認可**: カスタムロールベースアクセス制御 (RBAC)

## 2. 認証・認可設計

### 2.1 管理者権限の管理方法

#### オプションA: Auth0 Roles & Permissions (推奨)
- Auth0のロール・権限機能を活用
- 管理者ユーザーに `admin` ロールを付与
- JWTトークンに `permissions` クレームを含める
- バックエンドで権限を検証

**メリット**:
- 既存のAuth0インフラを活用
- セキュリティが高い
- 管理が容易

**実装**:
```python
# backend/app/auth/admin_dependencies.py
def require_admin_permission(
    current_user: dict = Depends(verify_token)
) -> dict:
    """Require admin permission to access admin endpoints."""
    permissions = current_user.get("permissions", [])
    if "admin:access" not in permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
```

#### オプションB: データベースベースの管理者管理
- `admin_users` テーブルを作成
- `users` テーブルと関連付け
- バックエンドで管理者チェック

**メリット**:
- より柔軟な権限管理
- アプリケーション内で完全に制御可能

**デメリット**:
- 追加のデータベーステーブルが必要
- Auth0と同期が必要

### 2.2 推奨アプローチ

**ハイブリッドアプローチ**:
1. Auth0で `admin` ロールを定義
2. 管理者ユーザーにロールを付与
3. バックエンドでJWTの `permissions` を検証
4. 将来的に細かい権限が必要になったら、データベーステーブルを追加

### 2.3 権限レベル

```
admin:access          # 管理サイトへのアクセス権
admin:users:read     # ユーザー一覧・詳細閲覧
admin:users:update   # ユーザー情報更新
admin:users:delete   # ユーザー削除
admin:users:status   # ユーザーステータス変更
admin:master:read    # マスターデータ閲覧（将来）
admin:master:create  # マスターデータ作成（将来）
admin:master:update  # マスターデータ更新（将来）
admin:master:delete  # マスターデータ削除（将来）
```

## 3. データベース設計

### 3.1 新規テーブル

#### `admin_users` テーブル（オプションBの場合）

```sql
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    permissions TEXT[], -- Array of permission strings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_admin_users_role ON admin_users(role);
```

#### `admin_audit_log` テーブル（監査ログ）

次の3種の操作を記録する:
- **アクセス（ログイン）**: 管理サイトへのログイン
- **変更**: ユーザー情報の更新、ステータス変更
- **削除**: ユーザーの論理削除

```sql
CREATE TABLE admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'login', 'user_update', 'user_status', 'user_delete'
    resource_type VARCHAR(50),   -- 'user', 'food_master' など（login 時は NULL 可）
    resource_id UUID,
    details JSONB,               -- 変更内容の差分、削除理由、IP/UA など
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_audit_log_admin_user_id ON admin_audit_log(admin_user_id);
CREATE INDEX idx_admin_audit_log_resource ON admin_audit_log(resource_type, resource_id);
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at);
CREATE INDEX idx_admin_audit_log_action ON admin_audit_log(action);
```

**action の例**:
| action        | 説明                 |
|---------------|----------------------|
| `login`       | アクセス（ログイン） |
| `user_update` | ユーザー情報の変更   |
| `user_status` | ステータス変更       |
| `user_delete` | ユーザーの論理削除   |

### 3.2 既存テーブルの拡張

`users` テーブルは既に以下のフィールドを持っているため、追加の変更は不要:
- `is_active`: アカウントの有効/無効
- `created_at`, `updated_at`: 作成・更新日時
- `last_login_at`: 最終ログイン日時

## 4. バックエンドAPI設計

### 4.1 エンドポイント構造

```
/api/v1/admin/
├── users/
│   ├── GET    /                    # ユーザー一覧（ページネーション、検索、フィルタ）
│   ├── GET    /{user_id}           # ユーザー詳細
│   ├── PUT    /{user_id}           # ユーザー情報更新
│   ├── PATCH  /{user_id}/status    # ステータス変更（is_active）
│   └── DELETE /{user_id}           # ユーザー削除（論理削除のみ）
├── audit/
│   ├── POST   /access              # アクセス（ログイン）の記録
│   └── GET    /logs                # 監査ログ一覧
└── stats/
    └── GET    /dashboard           # ダッシュボード統計情報
```

### 4.2 リクエスト/レスポンス例

#### GET /api/v1/admin/users

**Query Parameters**:
- `page`: ページ番号 (default: 1)
- `per_page`: 1ページあたりの件数 (default: 20, max: 100)
- `search`: 検索キーワード (email, nickname, member_id)
- `is_active`: フィルタ (true/false)
- `sort`: ソート項目 (created_at, updated_at, last_login_at)
- `order`: ソート順 (asc, desc)

**Response**:
```json
{
  "items": [
    {
      "id": "uuid",
      "member_id": "123456789012",
      "email": "user@example.com",
      "nickname": "ユーザー名",
      "first_name": "名",
      "last_name": "姓",
      "is_active": true,
      "email_verified": true,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z",
      "last_login_at": "2025-01-20T10:00:00Z",
      "stats": {
        "posts_count": 10,
        "followers_count": 5,
        "following_count": 3
      }
    }
  ],
  "total": 100,
  "page": 1,
  "per_page": 20,
  "total_pages": 5
}
```

#### GET /api/v1/admin/users/{user_id}

**Response**:
```json
{
  "id": "uuid",
  "member_id": "123456789012",
  "email": "user@example.com",
  "nickname": "ユーザー名",
  "first_name": "名",
  "last_name": "姓",
  "phone": "090-1234-5678",
  "bio": "自己紹介",
  "avatar_url": "https://...",
  "date_of_birth": "1990-01-01",
  "gender": "male",
  "is_active": true,
  "email_verified": true,
  "profile_visibility": "limited",
  "preferred_language": "ja",
  "timezone": "Asia/Tokyo",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z",
  "last_login_at": "2025-01-20T10:00:00Z",
  "stats": {
    "posts_count": 10,
    "comments_count": 25,
    "followers_count": 5,
    "following_count": 3,
    "vital_records_count": 50,
    "meal_records_count": 30
  }
}
```

#### PUT /api/v1/admin/users/{user_id}

**Request Body**:
```json
{
  "email": "newemail@example.com",
  "nickname": "新しいニックネーム",
  "first_name": "新しい名",
  "last_name": "新しい姓",
  "phone": "090-9876-5432",
  "bio": "更新された自己紹介",
  "is_active": true,
  "email_verified": true
}
```

#### PATCH /api/v1/admin/users/{user_id}/status

**Request Body**:
```json
{
  "is_active": false,
  "reason": "Terms of service violation"
}
```

#### DELETE /api/v1/admin/users/{user_id}

論理削除のみ。物理削除は行わない。

**Request Body**（任意）:
```json
{
  "reason": "削除理由（監査ログに記録）"
}
```

**Response**:
```json
{
  "message": "User deleted successfully",
  "user_id": "uuid"
}
```

### 4.3 実装ファイル構造

```
backend/app/
├── api/
│   └── admin/
│       ├── __init__.py
│       ├── users.py          # ユーザー管理API
│       ├── audit.py           # 監査ログAPI
│       └── stats.py           # 統計情報API
├── auth/
│   └── admin_dependencies.py  # 管理者認証・認可依存関係
├── services/
│   └── admin/
│       ├── __init__.py
│       ├── user_service.py    # ユーザー管理サービス
│       └── audit_service.py   # 監査ログサービス
└── schemas/
    └── admin/
        ├── __init__.py
        ├── user.py            # ユーザー管理スキーマ
        └── audit.py           # 監査ログスキーマ
```

## 5. フロントエンド設計

### 5.1 ページ構成

```
work.lifry.com/
├── /                          # ダッシュボード
├── /users                     # ユーザー一覧
│   ├── /                      # 一覧ページ
│   └── /[id]                  # ユーザー詳細・編集ページ
├── /audit                     # 監査ログ
└── /settings                  # 管理設定（将来）
```

### 5.2 コンポーネント構造

```
frontend-admin/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx          # レイアウト（サイドバー、ヘッダー）
│   │   ├── page.tsx            # ダッシュボード
│   │   ├── users/
│   │   │   ├── page.tsx        # ユーザー一覧
│   │   │   └── [id]/
│   │   │       └── page.tsx    # ユーザー詳細・編集
│   │   └── audit/
│   │       └── page.tsx        # 監査ログ
│   └── layout.tsx              # ルートレイアウト
├── components/
│   ├── admin/
│   │   ├── Sidebar.tsx         # サイドバーナビゲーション
│   │   ├── Header.tsx          # ヘッダー
│   │   ├── UserTable.tsx       # ユーザー一覧テーブル
│   │   ├── UserDetail.tsx     # ユーザー詳細表示
│   │   ├── UserEditForm.tsx   # ユーザー編集フォーム
│   │   └── StatusBadge.tsx     # ステータスバッジ
│   └── common/                 # 共通コンポーネント
└── lib/
    ├── api/
    │   └── admin.ts            # 管理APIクライアント
    └── hooks/
        └── useAdminUsers.ts   # ユーザー管理フック
```

### 5.3 UI/UX設計

#### ダッシュボード
- 統計カード（総ユーザー数、アクティブユーザー数、新規登録数など）
- 最近のアクティビティ
- クイックアクション

#### ユーザー一覧
- 検索バー（email, nickname, member_id）
- フィルタ（is_active, 登録日など）
- ソート機能
- ページネーション
- 一括操作（ステータス変更など）

#### ユーザー詳細・編集
- タブ構成:
  - 基本情報
  - 統計情報
  - アクティビティ履歴
- 編集モード/閲覧モード切り替え
- 変更履歴表示

## 6. デプロイメント戦略

### 6.1 プロジェクト構成オプション

#### オプションA: モノレポ内に追加（推奨）
```
circles0/
├── backend/              # 既存（拡張）
├── frontend/             # 既存
└── frontend-admin/       # 新規（管理サイト）
```

**メリット**:
- コードベースを統一
- 既存のCI/CDパイプラインを活用
- バックエンドAPIを共有

#### オプションB: 別リポジトリ
- 完全に独立したリポジトリ

**メリット**:
- セキュリティ分離
- 独立したデプロイメント

### 6.2 推奨: モノレポ構成

既存のプロジェクト構造に `frontend-admin` を追加し、バックエンドは既存の `backend` を拡張。

### 6.3 デプロイメント設定

#### Cloud Run設定

**管理サイトフロントエンド**:
- Service名: `work-frontend` または `admin-frontend`
- URL: `work.lifry.com`
- 環境変数:
  - `NEXT_PUBLIC_API_URL=https://api.lifry.com`
  - `NEXT_PUBLIC_AUTH0_DOMAIN=<Auth0 Domain>`
  - `NEXT_PUBLIC_AUTH0_CLIENT_ID=<Admin Client ID>`
  - `NEXT_PUBLIC_AUTH0_AUDIENCE=<Auth0 Audience>`

**バックエンド**:
- 既存の `disease-community-api` に `/api/v1/admin/*` エンドポイントを追加
- CORS設定に `work.lifry.com` を追加

### 6.4 CI/CDパイプライン

既存のGitHub Actionsワークフローを拡張:

```yaml
# .github/workflows/ci.yml に追加
- name: Build Admin Frontend
  run: |
    cd frontend-admin
    npm ci
    npm run build

- name: Deploy Admin Frontend
  run: |
    # Cloud Runへのデプロイ
```

## 7. セキュリティ考慮事項

### 7.1 認証・認可
- ✅ Auth0 JWT検証（既存と同一）
- ✅ 管理者ロール・権限チェック
- ✅ APIエンドポイントへのアクセス制御
- ✅ フロントエンドでの権限チェック（UX向上のため）

### 7.2 データ保護
- ✅ 個人情報の暗号化（必要に応じて）
- ✅ 監査ログの記録
- ✅ 削除操作の確認ダイアログ
- ✅ 論理削除のみ実装（物理削除は行わない）

### 7.3 レート制限
- 管理APIへのレート制限（通常のAPIより緩和）
- IPアドレスベースの制限（必要に応じて）

### 7.4 監査・ログ
以下の操作を記録する:
- **アクセス（ログイン）**: 管理者が管理サイトにログインしたとき（admin_user_id, action=login, ip_address, user_agent, created_at）
- **変更**: ユーザー情報の更新・ステータス変更（action=user_update / user_status, resource_type, resource_id, details に変更内容, ip_address, user_agent）
- **削除**: ユーザーの論理削除（action=user_delete, resource_type=user, resource_id, details に理由, ip_address, user_agent）

いずれも操作者（admin_user_id）、タイムスタンプ（created_at）、IPアドレス、User-Agent を記録する。ログの保持期間は別途運用で設定。

## 8. 実装フェーズ

### Phase 1: 基盤構築（Week 1-2）
1. ✅ プロジェクト構造の作成
   - `frontend-admin` ディレクトリ作成
   - Next.jsプロジェクト初期化
2. ✅ 認証・認可の実装
   - Auth0設定（管理者用クライアント）
   - バックエンド認証依存関係の実装
3. ✅ データベース設計・マイグレーション
   - `admin_audit_log` テーブル作成
   - Alembicマイグレーション

### Phase 2: ユーザー管理機能（Week 3-4）
1. ✅ バックエンドAPI実装
   - `/api/v1/admin/users/*` エンドポイント
   - サービス層の実装
2. ✅ フロントエンド実装
   - ユーザー一覧ページ
   - ユーザー詳細・編集ページ
   - 検索・フィルタ・ソート機能

### Phase 3: 監査ログ・統計（Week 5）
1. ✅ 監査ログ機能
   - ログ記録の実装
   - ログ閲覧ページ
2. ✅ ダッシュボード
   - 統計情報の表示

### Phase 4: テスト・デプロイ（Week 6）
1. ✅ テスト実装
   - バックエンドAPIテスト
   - フロントエンドコンポーネントテスト
2. ✅ デプロイメント
   - 本番環境へのデプロイ
   - DNS設定（work.lifry.com）

### Phase 5: 将来拡張（将来）
1. 食材マスターデータ管理
2. その他のマスターデータ管理
3. 高度な権限管理

## 9. 技術的決定事項

### 9.1 認証方法
**決定**: Auth0 Roles & Permissionsを使用（オプションA）

### 9.2 プロジェクト構成
**決定**: モノレポ内に `frontend-admin` を追加

### 9.3 削除方法
**決定**: 論理削除のみ。物理削除は行わない。

### 9.4 ページネーション
**決定**: オフセットベース（既存APIと統一）

## 10. リスクと対策

### 10.1 セキュリティリスク
- **リスク**: 管理者権限の悪用
- **対策**: 
  - 厳格な認証・認可チェック
  - 監査ログの記録
  - 定期的な権限レビュー

### 10.2 パフォーマンスリスク
- **リスク**: 大量ユーザーでの一覧表示が遅い
- **対策**:
  - ページネーション実装
  - インデックス最適化
  - キャッシュの活用（必要に応じて）

### 10.3 データ整合性リスク
- **リスク**: 管理者による誤操作
- **対策**:
  - 確認ダイアログ
- 論理削除のみ（物理削除は行わない）
- 操作の取り消し機能（可能な範囲で）

## 11. 次のステップ

このプランが承認されたら、以下の順序で実装を開始します:

1. **Phase 1: 基盤構築**から開始
2. 各フェーズ完了時に動作確認
3. フィードバックに基づいて調整

## 12. 確認済み事項

1. **ドメイン**: `work.lifry.com` で決定
2. **認証**: Auth0の既存テナントを使用
3. **削除方法**: 論理削除のみ（物理削除は行わない）
4. **権限管理**: 初期は全管理者に同じ権限
5. **監査ログ**: 次の3種を記録
   - **アクセス（ログイン）**
   - **変更**（ユーザー情報の更新、ステータス変更）
   - **削除**（ユーザーの論理削除）

---

**作成日**: 2025-01-24  
**更新日**: 2025-01-24  
**バージョン**: 1.1  
**ステータス**: 確認済み・実装待ち
