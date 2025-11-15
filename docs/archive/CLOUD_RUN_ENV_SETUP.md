# Cloud Run 環境変数設定ガイド

本番環境（Cloud Run）で必要な環境変数の設定方法をまとめています。

---

## 🔧 Backend Service: `disease-community-api`

### 必須環境変数

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `ENVIRONMENT` | `production` | 環境識別子（CORS設定に影響） |
| `AUTH0_DOMAIN` | `dev-2mqgvitlgxdwl5ea.us.auth0.com` | Auth0 テナントドメイン |
| `AUTH0_AUDIENCE` | `https://api.disease-community.com` | Auth0 API識別子 |
| `DATABASE_URL` | `postgresql+asyncpg://appuser:PASSWORD@/disease_community?host=/cloudsql/circles-202510:asia-northeast1:disease-community-db` | データベース接続文字列 |

### Cloud SQL 接続設定

- **Cloud SQL インスタンス**: `circles-202510:asia-northeast1:disease-community-db`

### DATABASE_URL フォーマット

```
postgresql+asyncpg://[USER]:[PASSWORD]@/[DATABASE]?host=/cloudsql/[PROJECT_ID]:[REGION]:[INSTANCE_NAME]
```

**実際の値:**
```
postgresql+asyncpg://appuser:k*fJO8UyVONO_uS)@/disease_community?host=/cloudsql/circles-202510:asia-northeast1:disease-community-db
```

---

## 🎨 Frontend Service: `disease-community-frontend`

### 必須環境変数

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `NEXT_PUBLIC_AUTH0_DOMAIN` | `dev-2mqgvitlgxdwl5ea.us.auth0.com` | Auth0 テナントドメイン |
| `NEXT_PUBLIC_AUTH0_CLIENT_ID` | `YGlRudHFYDfkcMZSgamI9PIrhPsFsLmD` | Auth0 アプリケーションID |
| `NEXT_PUBLIC_AUTH0_AUDIENCE` | `https://api.disease-community.com` | Auth0 API識別子 |
| `NEXT_PUBLIC_AUTH0_REDIRECT_URI` | `https://disease-community-frontend-508246122017.asia-northeast1.run.app/callback` | Auth0 コールバックURL |
| `NEXT_PUBLIC_API_URL` | `https://disease-community-api-508246122017.asia-northeast1.run.app` | Backend API URL |

---

## 🖥️ Google Cloud Console での設定手順

### Backend の設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. **Cloud Run** → **`disease-community-api`** を選択
3. **「新しいリビジョンの編集とデプロイ」** をクリック

#### 接続設定
4. **「接続」** タブを選択
5. **「Cloud SQL 接続を追加」** をクリック
6. **`disease-community-db`** を選択

#### 環境変数設定
7. **「変数とシークレット」** タブを選択
8. 以下の環境変数を追加：
   - `ENVIRONMENT` = `production`
   - `AUTH0_DOMAIN` = `dev-2mqgvitlgxdwl5ea.us.auth0.com`
   - `AUTH0_AUDIENCE` = `https://api.disease-community.com`
   - `DATABASE_URL` = `postgresql+asyncpg://appuser:PASSWORD@/disease_community?host=/cloudsql/circles-202510:asia-northeast1:disease-community-db`

9. **「デプロイ」** をクリック

---

### Frontend の設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. **Cloud Run** → **`disease-community-frontend`** を選択
3. **「新しいリビジョンの編集とデプロイ」** をクリック
4. **「変数とシークレット」** タブを選択
5. 以下の環境変数を追加：
   - `NEXT_PUBLIC_AUTH0_DOMAIN` = `dev-2mqgvitlgxdwl5ea.us.auth0.com`
   - `NEXT_PUBLIC_AUTH0_CLIENT_ID` = `YGlRudHFYDfkcMZSgamI9PIrhPsFsLmD`
   - `NEXT_PUBLIC_AUTH0_AUDIENCE` = `https://api.disease-community.com`
   - `NEXT_PUBLIC_AUTH0_REDIRECT_URI` = `https://disease-community-frontend-508246122017.asia-northeast1.run.app/callback`
   - `NEXT_PUBLIC_API_URL` = `https://disease-community-api-508246122017.asia-northeast1.run.app`

6. **「デプロイ」** をクリック

---

## 💻 gcloud CLI での設定方法

自動設定スクリプトを使用：

```bash
# リポジトリのルートディレクトリで実行
./scripts/deploy-cloud-run-env.sh
```

または、手動で設定：

### Backend

```bash
gcloud run services update disease-community-api \
  --region=asia-northeast1 \
  --add-cloudsql-instances=circles-202510:asia-northeast1:disease-community-db \
  --update-env-vars="ENVIRONMENT=production,AUTH0_DOMAIN=dev-2mqgvitlgxdwl5ea.us.auth0.com,AUTH0_AUDIENCE=https://api.disease-community.com,DATABASE_URL=postgresql+asyncpg://appuser:PASSWORD@/disease_community?host=/cloudsql/circles-202510:asia-northeast1:disease-community-db"
```

### Frontend

```bash
gcloud run services update disease-community-frontend \
  --region=asia-northeast1 \
  --update-env-vars="NEXT_PUBLIC_AUTH0_DOMAIN=dev-2mqgvitlgxdwl5ea.us.auth0.com,NEXT_PUBLIC_AUTH0_CLIENT_ID=YGlRudHFYDfkcMZSgamI9PIrhPsFsLmD,NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.disease-community.com,NEXT_PUBLIC_AUTH0_REDIRECT_URI=https://disease-community-frontend-508246122017.asia-northeast1.run.app/callback,NEXT_PUBLIC_API_URL=https://disease-community-api-508246122017.asia-northeast1.run.app"
```

---

## 🔐 Auth0 Dashboard 設定

環境変数の設定後、Auth0 Dashboard でも本番環境の URL を追加してください。

### 設定箇所

1. [Auth0 Dashboard](https://manage.auth0.com/) にログイン
2. **Applications** → あなたのアプリケーションを選択
3. **Settings** タブで以下を設定：

#### Allowed Callback URLs
```
http://localhost:3000/callback,
https://disease-community-frontend-508246122017.asia-northeast1.run.app/callback
```

#### Allowed Logout URLs
```
http://localhost:3000,
https://disease-community-frontend-508246122017.asia-northeast1.run.app
```

#### Allowed Web Origins
```
http://localhost:3000,
https://disease-community-frontend-508246122017.asia-northeast1.run.app
```

4. **Save Changes** をクリック

### API 設定

1. **APIs** → **`disease-community-api`** を選択
2. **Identifier** が `https://api.disease-community.com` であることを確認

---

## ✅ 設定確認チェックリスト

### Backend
- [ ] `ENVIRONMENT` = `production`
- [ ] `AUTH0_DOMAIN` = `dev-2mqgvitlgxdwl5ea.us.auth0.com`
- [ ] `AUTH0_AUDIENCE` = `https://api.disease-community.com`
- [ ] `DATABASE_URL` = 正しい接続文字列
- [ ] Cloud SQL 接続が追加されている

### Frontend
- [ ] `NEXT_PUBLIC_AUTH0_DOMAIN` = `dev-2mqgvitlgxdwl5ea.us.auth0.com`
- [ ] `NEXT_PUBLIC_AUTH0_CLIENT_ID` = `YGlRudHFYDfkcMZSgamI9PIrhPsFsLmD`
- [ ] `NEXT_PUBLIC_AUTH0_AUDIENCE` = `https://api.disease-community.com`
- [ ] `NEXT_PUBLIC_AUTH0_REDIRECT_URI` = 本番 URL
- [ ] `NEXT_PUBLIC_API_URL` = Backend の本番 URL

### Auth0
- [ ] Allowed Callback URLs に本番 URL を追加
- [ ] Allowed Logout URLs に本番 URL を追加
- [ ] Allowed Web Origins に本番 URL を追加
- [ ] API Identifier が正しい

---

## 🧪 設定後のテスト

### 1. Backend ヘルスチェック
```
https://disease-community-api-508246122017.asia-northeast1.run.app/health
```

**期待される応答:**
```json
{
  "status": "healthy",
  "environment": "production",
  "service": "disease-community-api",
  "market": "en-us",
  "timestamp": "2025-10-30T12:00:00.000000"
}
```

### 2. Frontend アクセス
```
https://disease-community-frontend-508246122017.asia-northeast1.run.app/
```

**確認事項:**
- [ ] "Login" ボタンが表示される
- [ ] "Loading..." で止まらない
- [ ] Console にエラーが出ない

### 3. ログイン機能
1. "Login" ボタンをクリック
2. Auth0 ログイン画面が表示される
3. ログイン後、トップページにリダイレクトされる
4. ユーザー名とアバターが表示される

---

## 🐛 トラブルシューティング

### CORS エラーが出る
- Backend の `ENVIRONMENT` が `production` に設定されているか確認
- デプロイが完了しているか確認（2-3分待つ）
- ブラウザのキャッシュをクリア（Ctrl + Shift + R）

### Auth0 エラーが出る
- Frontend の環境変数がすべて設定されているか確認
- Auth0 Dashboard の Allowed URLs が正しいか確認

### データベース接続エラー
- `DATABASE_URL` の形式が正しいか確認
- Cloud SQL 接続が追加されているか確認
- Cloud SQL インスタンスが起動しているか確認

---

## 📞 サポート

問題が解決しない場合は、以下の情報を提供してください：

1. エラーメッセージ（ブラウザの Console）
2. Cloud Run のログ（Google Cloud Console → Cloud Run → ログ）
3. GitHub Actions のログ（失敗している場合）

