# カスタムドメイン設定ガイド

本番環境のドメインを`http://lifry.com/`に変更する手順です。

## 前提条件

- Google Cloudプロジェクト: `circles-202510`
- Cloud Runサービス:
  - Frontend: `disease-community-frontend`
  - Backend: `disease-community-api`
- リージョン: `asia-northeast1`

## 手順

### 1. DNS設定（ドメイン管理側）

`lifry.com`のDNS設定で、以下のレコードを追加：

#### フロントエンド用
```
Type: CNAME
Name: @ (または lifry.com)
Value: ghs.googlehosted.com
```

または、Aレコードを使用する場合：
```
Type: A
Name: @ (または lifry.com)
Value: [Google Cloud Runが提供するIPアドレス]
```

**注意**: Cloud Runのカスタムドメインマッピングを設定すると、Googleが提供するIPアドレスが表示されます。

### 2. Google Cloud Consoleでカスタムドメインマッピングを設定

#### 2.1 フロントエンドの設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. **Cloud Run** → **サービス** → **`disease-community-frontend`** を選択
3. **「カスタムドメイン」タブ**をクリック
4. **「ドメインをマッピング」**をクリック
5. 以下の情報を入力：
   - **ドメイン**: `lifry.com`
   - **パス**: `/`（デフォルト）
6. **「続行」**をクリック
7. DNS設定の指示に従って、DNSレコードを追加
8. 検証が完了するまで待つ（数分〜数時間）

#### 2.2 バックエンドの設定（API用サブドメイン）

バックエンドAPI用にサブドメインを設定する場合：

1. **Cloud Run** → **サービス** → **`disease-community-api`** を選択
2. **「カスタムドメイン」タブ**をクリック
3. **「ドメインをマッピング」**をクリック
4. 以下の情報を入力：
   - **ドメイン**: `api.lifry.com`（推奨）または`lifry.com`
   - **パス**: `/api`（サブドメインを使用しない場合）
5. DNS設定を完了

### 3. Auth0の設定を更新

1. [Auth0 Dashboard](https://manage.auth0.com/)にアクセス
2. **Applications** → 該当アプリケーションを選択
3. **Settings**タブで以下を更新：

   - **Allowed Callback URLs**:
     ```
     http://lifry.com/callback,https://lifry.com/callback
     ```

   - **Allowed Logout URLs**:
     ```
     http://lifry.com,https://lifry.com
     ```

   - **Allowed Web Origins**:
     ```
     http://lifry.com,https://lifry.com
     ```

4. **Save Changes**をクリック

### 4. 環境変数の更新

#### 4.1 フロントエンドの環境変数

Cloud Runの環境変数を更新：

```bash
gcloud run services update disease-community-frontend \
  --region=asia-northeast1 \
  --project=circles-202510 \
  --update-env-vars="NEXT_PUBLIC_AUTH0_DOMAIN=dev-2mqgvitlgxdwl5ea.us.auth0.com,NEXT_PUBLIC_AUTH0_CLIENT_ID=YGlRudHFYDfkcMZSgamI9PIrhPsFsLmD,NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.disease-community.com,NEXT_PUBLIC_AUTH0_REDIRECT_URI=http://lifry.com/callback,NEXT_PUBLIC_API_URL=http://api.lifry.com"
```

**注意**: バックエンドもカスタムドメインを設定した場合は、`NEXT_PUBLIC_API_URL`を更新してください。

#### 4.2 バックエンドの環境変数

CORS設定を更新：

```bash
gcloud run services update disease-community-api \
  --region=asia-northeast1 \
  --project=circles-202510 \
  --update-env-vars="CORS_ALLOWED_ORIGINS=http://lifry.com,https://lifry.com"
```

### 5. GitHub Actionsワークフローの更新

`.github/workflows/ci.yml`を更新して、新しいドメインを使用するようにします。

### 6. 設定ファイルの更新

以下のファイルを更新：

- `scripts/deploy-cloud-run-env.sh`
- `cloudbuild.yaml`
- `.github/workflows/ci.yml`

## 検証手順

1. DNS設定の反映を確認（`nslookup lifry.com`または`dig lifry.com`）
2. カスタムドメインマッピングの検証完了を確認
3. フロントエンドにアクセス: `http://lifry.com`
4. バックエンドAPIのヘルスチェック: `http://api.lifry.com/health`
5. Auth0ログインが正常に動作することを確認

## トラブルシューティング

### DNS設定が反映されない

- DNSのTTL設定を確認
- 複数のDNSプロバイダーを使用している場合は、すべて更新
- `dig`コマンドでDNSレコードを確認

### CORSエラーが発生する

- バックエンドの`CORS_ALLOWED_ORIGINS`環境変数を確認
- ブラウザの開発者ツールでエラーメッセージを確認
- バックエンドのログを確認

### Auth0リダイレクトエラー

- Auth0 Dashboardで設定したURLが正確か確認
- `http://`と`https://`の両方を設定
- ブラウザのコンソールでエラーメッセージを確認

## セキュリティに関する注意事項

- **HTTPSの使用を強く推奨**: `http://lifry.com/`ではなく`https://lifry.com/`を使用してください
- Cloud Runは自動的にHTTPS証明書を提供します
- HTTPからHTTPSへのリダイレクトを設定することを推奨します






