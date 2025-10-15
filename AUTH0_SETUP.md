# Auth0 設定ガイド

## 📝 概要

このドキュメントは、Disease Community PlatformにAuth0認証を統合するための設定手順を説明します。

---

## 🔧 Auth0アカウント・アプリケーション設定

### 1. Auth0アカウント作成

1. [Auth0](https://auth0.com)にアクセス
2. 「Sign Up」をクリックして無料アカウント作成
3. テナント名を設定（例: `disease-community`）
4. リージョンを選択（日本の場合: `Japan`）

### 2. アプリケーション作成

#### 2.1 フロントエンド用アプリケーション（Single Page Application）

1. Auth0ダッシュボードで「Applications」→「Create Application」
2. 設定:
   - **Name**: `Disease Community Frontend`
   - **Type**: `Single Page Applications`
   - **Technology**: `React`

3. 「Settings」タブで以下を設定:

   **Allowed Callback URLs**:
   ```
   http://localhost:3000/api/auth/callback,
   https://disease-community-frontend-508246122017.asia-northeast1.run.app/api/auth/callback
   ```

   **Allowed Logout URLs**:
   ```
   http://localhost:3000,
   https://disease-community-frontend-508246122017.asia-northeast1.run.app
   ```

   **Allowed Web Origins**:
   ```
   http://localhost:3000,
   https://disease-community-frontend-508246122017.asia-northeast1.run.app
   ```

   **Allowed Origins (CORS)**:
   ```
   http://localhost:3000,
   https://disease-community-frontend-508246122017.asia-northeast1.run.app
   ```

4. 「Save Changes」をクリック

5. 以下の情報をメモ:
   - **Domain** (例: `disease-community.us.auth0.com`)
   - **Client ID** (例: `abc123xyz...`)

#### 2.2 バックエンド用API設定

1. Auth0ダッシュボードで「Applications」→「APIs」→「Create API」
2. 設定:
   - **Name**: `Disease Community API`
   - **Identifier**: `https://api.disease-community.com`（任意のURI形式）
   - **Signing Algorithm**: `RS256`

3. 「Settings」タブで以下をメモ:
   - **Identifier (Audience)**: `https://api.disease-community.com`

4. 「Permissions」タブで権限を定義（オプション）:
   ```
   read:profile
   write:profile
   read:topics
   write:topics
   read:diseases
   write:diseases
   ```

### 3. Rules / Actions設定（オプション）

ユーザー登録時にカスタムクレームを追加する場合:

1. 「Actions」→「Library」→「Build Custom」
2. 以下のようなActionを作成:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://disease-community.com';
  
  if (event.authorization) {
    // カスタムクレームを追加
    api.idToken.setCustomClaim(`${namespace}/email`, event.user.email);
    api.idToken.setCustomClaim(`${namespace}/user_id`, event.user.user_id);
    api.accessToken.setCustomClaim(`${namespace}/email`, event.user.email);
  }
};
```

3. 「Deploy」をクリック
4. 「Actions」→「Flows」→「Login」でActionを追加

---

## 🔑 環境変数設定

### ローカル開発環境

#### フロントエンド (`frontend/.env.local`)

```bash
# Auth0 Configuration
NEXT_PUBLIC_AUTH0_DOMAIN=your-tenant.us.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.disease-community.com
AUTH0_SECRET=use-openssl-rand-hex-32-to-generate
NEXT_PUBLIC_AUTH0_CALLBACK_URL=http://localhost:3000/api/auth/callback
```

#### バックエンド (`backend/.env`)

```bash
# Auth0 Configuration
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://api.disease-community.com
AUTH0_ALGORITHMS=RS256
```

### GitHub Secrets設定

以下のシークレットをGitHub Repositoryに追加:

1. リポジトリの「Settings」→「Secrets and variables」→「Actions」
2. 「New repository secret」で以下を追加:

#### フロントエンド用
- `AUTH0_DOMAIN`: Auth0ドメイン
- `AUTH0_CLIENT_ID`: フロントエンド用クライアントID
- `AUTH0_CLIENT_SECRET`: フロントエンド用クライアントシークレット
- `AUTH0_SECRET`: ランダム生成した32文字の文字列
- `AUTH0_AUDIENCE`: API識別子

#### バックエンド用
- `AUTH0_DOMAIN`: Auth0ドメイン（フロントエンドと同じ）
- `AUTH0_AUDIENCE`: API識別子（フロントエンドと同じ）

### シークレット生成コマンド

```bash
# AUTH0_SECRET用のランダム文字列生成
openssl rand -hex 32
```

---

## 🧪 テスト用ユーザー作成

1. Auth0ダッシュボードで「User Management」→「Users」→「Create User」
2. テストユーザー情報:
   - **Email**: `test@example.com`
   - **Password**: 強力なパスワードを設定
   - **Connection**: `Username-Password-Authentication`

---

## 📊 認証フロー

### 1. ユーザーログイン
```
User → Frontend → Auth0 Login → Auth0 Callback → Frontend
                                                      ↓
                                            Access Token取得
```

### 2. API呼び出し
```
Frontend → Backend API (with Access Token in Header)
              ↓
        JWT検証 (Auth0公開鍵)
              ↓
        保護されたリソースへアクセス
```

---

## 🔍 トラブルシューティング

### エラー: `Invalid state`
- **原因**: Callback URLが正しく設定されていない
- **解決**: Auth0ダッシュボードで「Allowed Callback URLs」を確認

### エラー: `Audience is invalid`
- **原因**: API識別子が一致していない
- **解決**: フロントエンド・バックエンドの`AUTH0_AUDIENCE`を確認

### エラー: `CORS error`
- **原因**: Auth0で許可されたオリジンが設定されていない
- **解決**: 「Allowed Origins (CORS)」にフロントエンドURLを追加

---

## 📚 参考リンク

- [Auth0 Documentation](https://auth0.com/docs)
- [Auth0 React SDK](https://auth0.com/docs/quickstart/spa/react)
- [Auth0 FastAPI Integration](https://auth0.com/docs/quickstart/backend/python)
- [JWT.io](https://jwt.io) - JWTトークンデコーダー

---

## ✅ 設定完了チェックリスト

- [ ] Auth0アカウント作成
- [ ] フロントエンド用SPAアプリケーション作成
- [ ] バックエンド用API作成
- [ ] Callback URLs設定
- [ ] ローカル環境変数設定（`.env.local`, `.env`）
- [ ] GitHub Secrets設定
- [ ] テストユーザー作成
- [ ] 認証フロー動作確認

---

**次のステップ**: バックエンドとフロントエンドのコード実装に進みます。

