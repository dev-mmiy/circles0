# 管理画面 (work.lifry.com)

ユーザー管理・監査ログ・ダッシュボードを提供する管理用フロントエンドです。

## セットアップ

### Docker Compose（推奨）

```bash
# プロジェクトルートで
docker compose up -d frontend-admin
# → http://localhost:3002
```

`backend` が起動している必要があります。初回は `docker compose up -d` で一括起動してもよい。

### 手動

1. `cp .env.local.example .env.local` して環境変数を設定
2. `npm install`
3. `npm run dev` → http://localhost:3002

## 環境変数

- `NEXT_PUBLIC_API_URL`  
  - 開発: `http://localhost:8000`  
  - 本番: `https://api.lifry.com`
- `NEXT_PUBLIC_AUTH0_DOMAIN` / `NEXT_PUBLIC_AUTH0_CLIENT_ID` / `NEXT_PUBLIC_AUTH0_AUDIENCE`  
  - 既存Auth0テナントと同一。管理用に **別のAuth0 Application（SPA）** を作成し、  
    Allowed Callback URLs に `http://localhost:3002/callback` と `https://work.lifry.com/callback` を追加
- Auth0側で `admin:access` 権限を持つロールをAPIに紐付け、管理者ユーザーにそのロールを付与

## 開発時の管理者バイパス

バックエンドの `ENVIRONMENT=development` かつ `ADMIN_AUTH0_IDS` に Auth0 の `sub` をカンマ区切りで指定すると、`admin:access` がなくてもアクセス可能です。

```env
ADMIN_AUTH0_IDS=auth0|xxx,auth0|yyy
```
