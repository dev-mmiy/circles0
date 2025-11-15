# GCS環境変数設定ガイド

このドキュメントでは、Google Cloud Storage (GCS) 画像アップロード機能の環境変数設定方法を詳しく説明します。

## 必要な環境変数

以下の3つの環境変数が必要です：

1. **GCS_BUCKET_NAME** - GCSバケット名
2. **GCS_PROJECT_ID** - GCPプロジェクトID
3. **GOOGLE_APPLICATION_CREDENTIALS** - サービスアカウントキーのパス（または認証方法）

## 環境変数の設定方法

### 方法1: 開発環境（ローカル開発）

#### 1-1. `.env`ファイルを使用する方法（推奨）

バックエンドの`backend/.env`ファイルを作成または編集します：

```bash
cd backend
nano .env  # またはお好みのエディタ
```

以下の内容を追加：

```env
# Google Cloud Storage設定
GCS_BUCKET_NAME=disease-community-images
GCS_PROJECT_ID=your-project-id-123456

# サービスアカウントキーのパス（絶対パスまたは相対パス）
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

**注意点：**
- `.env`ファイルは`.gitignore`に含まれていることを確認してください
- パスは絶対パスまたは`backend`ディレクトリからの相対パスで指定できます
- 例: `GOOGLE_APPLICATION_CREDENTIALS=../secrets/service-account-key.json`

#### 1-2. サービスアカウントキーの配置

1. GCPコンソールからダウンロードしたJSONキーファイルを安全な場所に配置
2. 推奨場所：
   - `backend/secrets/service-account-key.json`（`.gitignore`に追加）
   - または `~/.config/gcloud/service-account-key.json`

**`.gitignore`の確認：**
```bash
# backend/.gitignore に以下が含まれていることを確認
secrets/
*.json
.env
```

#### 1-3. 環境変数の確認

アプリケーション起動前に環境変数が正しく読み込まれているか確認：

```bash
cd backend
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print('GCS_BUCKET_NAME:', os.getenv('GCS_BUCKET_NAME')); print('GCS_PROJECT_ID:', os.getenv('GCS_PROJECT_ID')); print('GOOGLE_APPLICATION_CREDENTIALS:', os.getenv('GOOGLE_APPLICATION_CREDENTIALS'))"
```

### 方法2: 本番環境（Google Cloud Run）

Cloud Runでは、環境変数を以下の方法で設定できます。

#### 2-1. Google Cloud Consoleを使用する方法

1. [Google Cloud Console](https://console.cloud.google.com/) にログイン
2. 「Cloud Run」→「サービス」に移動
3. 対象のサービス（例: `disease-community-api`）をクリック
4. 「編集と新しいリビジョンをデプロイ」をクリック
5. 「変数とシークレット」タブを開く
6. 「変数を追加」をクリックして以下を追加：

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `GCS_BUCKET_NAME` | `disease-community-images` | GCSバケット名 |
| `GCS_PROJECT_ID` | `your-project-id-123456` | GCPプロジェクトID |

7. 「デプロイ」をクリック

#### 2-2. gcloud CLIを使用する方法

```bash
# 環境変数を設定してデプロイ
gcloud run services update disease-community-api \
  --set-env-vars="GCS_BUCKET_NAME=disease-community-images,GCS_PROJECT_ID=your-project-id-123456" \
  --region=asia-northeast1
```

#### 2-3. Cloud Runのデフォルトサービスアカウントを使用する方法（推奨）

`GOOGLE_APPLICATION_CREDENTIALS`を設定せず、Cloud Runのデフォルトサービスアカウントに権限を付与する方法：

1. Cloud Runサービスの「セキュリティ」タブを開く
2. 「サービスアカウント」で使用するサービスアカウントを確認
   - デフォルト: `PROJECT_NUMBER-compute@developer.gserviceaccount.com`
3. IAMでサービスアカウントに権限を付与：

```bash
# サービスアカウントのメールアドレスを取得
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Storage Object Adminロールを付与
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.objectAdmin"
```

この方法では、`GOOGLE_APPLICATION_CREDENTIALS`環境変数は不要です。Cloud Runが自動的に認証を行います。

#### 2-4. Secret Managerを使用する方法（高度）

機密情報をSecret Managerに保存する方法：

1. Secret Managerにシークレットを作成：

```bash
# サービスアカウントキーをシークレットとして保存
gcloud secrets create gcs-service-account-key \
  --data-file=/path/to/service-account-key.json \
  --replication-policy="automatic"
```

2. Cloud Runサービスにシークレットをマウント：

```bash
gcloud run services update disease-community-api \
  --set-secrets="GOOGLE_APPLICATION_CREDENTIALS=gcs-service-account-key:latest" \
  --region=asia-northeast1
```

### 方法3: Docker Composeを使用する場合

`docker-compose.yml`に環境変数を追加：

```yaml
services:
  backend:
    build: ./backend
    environment:
      - GCS_BUCKET_NAME=disease-community-images
      - GCS_PROJECT_ID=your-project-id-123456
      - GOOGLE_APPLICATION_CREDENTIALS=/app/secrets/service-account-key.json
    volumes:
      - ./backend/secrets:/app/secrets:ro  # 読み取り専用でマウント
```

または、`.env`ファイルを参照：

```yaml
services:
  backend:
    build: ./backend
    env_file:
      - ./backend/.env
```

## 認証方法の比較

### 方法A: サービスアカウントキーファイル（開発環境向け）

**メリット：**
- ローカル開発で簡単に設定可能
- 特定のサービスアカウントに権限を限定できる

**デメリット：**
- キーファイルの管理が必要
- 本番環境では推奨されない

**設定：**
```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### 方法B: Cloud Runのデフォルトサービスアカウント（本番環境向け・推奨）

**メリット：**
- キーファイルの管理が不要
- Cloud Runが自動的に認証を処理
- セキュリティベストプラクティスに準拠

**デメリット：**
- ローカル開発では使用できない

**設定：**
- `GOOGLE_APPLICATION_CREDENTIALS`は設定しない
- サービスアカウントに適切な権限を付与

### 方法C: 環境変数にJSONを直接設定（非推奨）

**注意：** セキュリティ上の理由から、本番環境では推奨されません。

```env
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account","project_id":"..."}'
```

## 設定の確認方法

### 1. 環境変数の確認

```bash
# バックエンドディレクトリで実行
cd backend
python -c "
import os
from dotenv import load_dotenv
load_dotenv()

print('=== GCS環境変数確認 ===')
print(f'GCS_BUCKET_NAME: {os.getenv(\"GCS_BUCKET_NAME\", \"未設定\")}')
print(f'GCS_PROJECT_ID: {os.getenv(\"GCS_PROJECT_ID\", \"未設定\")}')
print(f'GOOGLE_APPLICATION_CREDENTIALS: {os.getenv(\"GOOGLE_APPLICATION_CREDENTIALS\", \"未設定\")}')
"
```

### 2. GCS接続の確認

```bash
# Pythonで直接確認
cd backend
python -c "
from app.services.storage_service import storage_service
print('=== GCS接続確認 ===')
print(f'Storage service available: {storage_service.is_available()}')
if storage_service.is_available():
    print(f'Bucket name: {storage_service.bucket_name}')
    print(f'Project ID: {storage_service.project_id}')
else:
    print('GCS is not configured. Check environment variables.')
"
```

### 3. APIエンドポイントの確認

アプリケーション起動後、以下のエンドポイントで確認：

```bash
# ヘルスチェック
curl http://localhost:8000/health

# APIドキュメントで画像アップロードエンドポイントを確認
# http://localhost:8000/docs
```

## トラブルシューティング

### エラー: "Image upload service is not configured"

**原因：** 環境変数が設定されていない

**解決策：**
1. `.env`ファイルが正しい場所にあるか確認
2. 環境変数名のタイポがないか確認
3. アプリケーション再起動

### エラー: "Failed to initialize GCS client"

**原因：** 認証情報が無効または権限不足

**解決策：**
1. `GOOGLE_APPLICATION_CREDENTIALS`のパスが正しいか確認
2. サービスアカウントキーファイルが存在するか確認
3. サービスアカウントに適切な権限があるか確認

### エラー: "Permission denied" または "Access denied"

**原因：** サービスアカウントに権限がない

**解決策：**
```bash
# 必要な権限を確認
gcloud projects get-iam-policy $(gcloud config get-value project) \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:YOUR_SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com"

# 権限を付与
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

### エラー: "Bucket not found"

**原因：** バケット名が間違っている、またはバケットが存在しない

**解決策：**
```bash
# バケット一覧を確認
gsutil ls

# または
gcloud storage buckets list
```

## セキュリティベストプラクティス

### ⚠️ シークレットファイルの配置について

**開発環境：**
- ✅ ファイル配置は**許容**されますが、以下の対策が**必須**です：
  - `.gitignore`に追加（既に設定済み）
  - ファイル権限を600に設定：`chmod 600 backend/secrets/service-account-key.json`
  - ディレクトリ権限を700に設定：`chmod 700 backend/secrets`
  - Gitにコミットしない（`git status`で確認）

**本番環境：**
- ❌ ファイル配置は**推奨されません**
- ✅ Cloud Runのデフォルトサービスアカウントを使用（最推奨）
- ✅ またはSecret Managerを使用

**詳細は `docs/SECRET_MANAGEMENT_SECURITY.md` を参照してください。**

### その他のベストプラクティス

1. **`.env`ファイルをGitにコミットしない**
   - `.gitignore`に追加されていることを確認
   - 機密情報は環境変数やSecret Managerを使用

2. **サービスアカウントキーの最小権限原則**
   - 必要な権限のみを付与
   - `Storage Object Admin`で十分（`Storage Admin`は不要）

3. **本番環境ではデフォルトサービスアカウントを使用**
   - キーファイルの管理が不要
   - Cloud Runが自動的に認証を処理

4. **定期的な権限の見直し**
   - 不要な権限を削除
   - 使用していないサービスアカウントを無効化

## 参考リンク

- [Google Cloud Storage認証](https://cloud.google.com/storage/docs/authentication)
- [Cloud Run環境変数](https://cloud.google.com/run/docs/configuring/environment-variables)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)
- [サービスアカウントのベストプラクティス](https://cloud.google.com/iam/docs/best-practices-service-accounts)

