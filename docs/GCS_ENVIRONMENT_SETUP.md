# GCS環境変数設定ガイド

このドキュメントでは、Google Cloud Storage (GCS) 画像アップロード機能の環境変数設定方法を詳しく説明します。

## 必要な環境変数

以下の3つの環境変数が必要です：

1. **GCS_BUCKET_NAME** - GCSバケット名
2. **GCS_PROJECT_ID** - GCPプロジェクトID
3. **GOOGLE_APPLICATION_CREDENTIALS** - サービスアカウントキーのパス（または認証方法）

## 環境変数の設定方法

### 方法1: 開発環境（ローカル開発）

#### ローカル環境での画像保存方法の選択肢

ローカル開発環境では、以下の3つの方法から選択できます：

**方法A: 実際のGCSを使用する（推奨）**
- ✅ 本番環境と同じ動作でテスト可能
- ✅ 環境の違いによる問題を回避
- ⚠️ GCPアカウントとサービスアカウントキーが必要

**方法B: ローカルファイルシステムに保存する**
- ✅ GCPアカウント不要
- ✅ オフラインでも開発可能
- ⚠️ コードの変更が必要（現在未実装）
- ⚠️ 静的ファイルサーバーの設定が必要

**方法C: GCSエミュレータを使用する**
- ✅ GCSと互換性がある
- ⚠️ セットアップが複雑
- ⚠️ 本番環境とは異なる動作の可能性

**推奨:** 方法A（実際のGCSを使用）を推奨します。本番環境と同じ動作でテストできるため、デプロイ時の問題を最小限に抑えられます。

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

#### 1-3. ローカルファイルシステムに保存する場合（オプション）

GCPアカウントを使用せずにローカル開発を行いたい場合、画像をローカルファイルシステムに保存することも可能です。ただし、現在の実装ではGCSのみに対応しているため、以下の変更が必要です：

**推奨保存場所：**

1. **`backend/uploads/`** （推奨）
   ```
   backend/
   ├── uploads/
   │   ├── posts/
   │   │   ├── uuid1.jpg
   │   │   └── uuid2.jpg
   │   └── avatars/
   │       └── uuid3.jpg
   ```

2. **`backend/static/uploads/`** （静的ファイル配信用）
   ```
   backend/
   ├── static/
   │   └── uploads/
   │       └── posts/
   ```

**設定手順：**

1. **ディレクトリの作成**
   ```bash
   mkdir -p backend/uploads/posts
   mkdir -p backend/uploads/avatars
   ```

2. **`.gitignore`に追加**
   ```bash
   # backend/.gitignore に追加
   uploads/
   static/uploads/
   ```

3. **FastAPIで静的ファイルを配信**
   ```python
   # backend/app/main.py に追加
   from fastapi.staticfiles import StaticFiles
   
   app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
   ```

4. **環境変数で切り替え**
   ```env
   # backend/.env
   USE_LOCAL_STORAGE=true
   LOCAL_UPLOAD_DIR=./uploads
   ```

**注意点：**
- ローカルファイルシステムを使用する場合は、`StorageService`クラスにローカル保存機能を追加する必要があります
- 画像URLは `http://localhost:8000/uploads/posts/uuid.jpg` の形式になります
- Docker Composeを使用する場合は、ボリュームマウントが必要です

**現在の実装では、GCSを使用する方法（方法A）を推奨します。**

#### 1-4. 環境変数の確認

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

Docker Composeを使用して開発環境を構築する場合、以下の方法で環境変数を設定できます。

#### 3-1. 環境変数を直接指定する方法

`docker-compose.yml`に環境変数を直接記述：

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

**注意点：**
- 機密情報が`docker-compose.yml`に直接記述されるため、このファイルをGitにコミットしないでください
- または、`docker-compose.override.yml`を使用してローカル設定を管理（`.gitignore`に追加）

#### 3-2. `.env`ファイルを参照する方法（推奨）

`docker-compose.yml`で`.env`ファイルを参照：

```yaml
services:
  backend:
    build: ./backend
    env_file:
      - ./backend/.env
    volumes:
      - ./backend/secrets:/app/secrets:ro
```

この方法では、`backend/.env`ファイルに環境変数を記述します：

```env
# backend/.env
GCS_BUCKET_NAME=disease-community-images
GCS_PROJECT_ID=your-project-id-123456
GOOGLE_APPLICATION_CREDENTIALS=/app/secrets/service-account-key.json
```

#### 3-3. Docker Composeの環境変数ファイルを使用する方法

`docker-compose.yml`で環境変数ファイルを指定：

```yaml
services:
  backend:
    build: ./backend
    env_file:
      - ./backend/.env
      - ./backend/.env.docker  # Docker専用の環境変数
    volumes:
      - ./backend/secrets:/app/secrets:ro
```

#### 3-4. 完全なDocker Compose設定例

以下は、バックエンドとフロントエンドを含む完全な設定例です：

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env
    volumes:
      - ./backend:/app
      - ./backend/secrets:/app/secrets:ro
    environment:
      - PYTHONUNBUFFERED=1
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    env_file:
      - ./frontend/.env.local
    volumes:
      - ./frontend:/app
      - /app/node_modules

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=disease_community
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### 3-5. セキュリティベストプラクティス

**開発環境：**
- ✅ `.env`ファイルを使用（`.gitignore`に追加）
- ✅ サービスアカウントキーは読み取り専用でマウント（`:ro`）
- ✅ `docker-compose.override.yml`を使用してローカル設定を管理

**本番環境（Docker Compose使用時）：**
- ✅ 環境変数はDocker secretsまたは外部設定管理システムを使用
- ✅ サービスアカウントキーはSecret Managerから取得
- ❌ 機密情報を`docker-compose.yml`に直接記述しない

#### 3-6. Docker Composeでの動作確認

環境変数が正しく設定されているか確認：

```bash
# コンテナ内で環境変数を確認
docker-compose exec backend env | grep GCS

# または、Pythonスクリプトで確認
docker-compose exec backend python -c "
import os
print('GCS_BUCKET_NAME:', os.getenv('GCS_BUCKET_NAME'))
print('GCS_PROJECT_ID:', os.getenv('GCS_PROJECT_ID'))
print('GOOGLE_APPLICATION_CREDENTIALS:', os.getenv('GOOGLE_APPLICATION_CREDENTIALS'))
"

# GCS接続確認
docker-compose exec backend python scripts/check_gcs_config.py
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

### 3. 設定確認スクリプトの使用（推奨）

プロジェクトには、GCS設定を一括で確認するスクリプトが用意されています：

```bash
# バックエンドディレクトリで実行
cd backend
python scripts/check_gcs_config.py
```

このスクリプトは以下をチェックします：

1. **環境変数の設定確認**
   - `GCS_BUCKET_NAME` が設定されているか
   - `GCS_PROJECT_ID` が設定されているか
   - `GOOGLE_APPLICATION_CREDENTIALS` が設定されているか（オプション）

2. **サービスアカウントキーファイルの確認**
   - ファイルが存在するか
   - ファイルサイズが適切か

3. **GCS接続の確認**
   - Storage serviceが初期化できているか
   - バケットにアクセスできるか

**実行例：**
```bash
$ python scripts/check_gcs_config.py

============================================================
GCS環境変数チェック
============================================================
✅ GCS_BUCKET_NAME: disease-community-images
✅ GCS_PROJECT_ID: circles-202510
✅ GOOGLE_APPLICATION_CREDENTIALS: ../secrets/service-account-key.json

============================================================
サービスアカウントキーファイルチェック
============================================================
✅ ファイルが見つかりました: /path/to/service-account-key.json
   ファイルサイズ: 2345 bytes

============================================================
GCS接続チェック
============================================================
✅ GCS Storage service is available
   バケット名: disease-community-images
   プロジェクトID: circles-202510
✅ バケットにアクセスできました

============================================================
チェック結果
============================================================
✅ すべてのチェックが成功しました！
   GCS画像アップロード機能が使用可能です。
```

### 4. APIエンドポイントの確認

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

# バケット名を確認
gcloud storage buckets describe disease-community-images
```

### エラー: "ModuleNotFoundError: No module named 'google.cloud'"

**原因：** 必要なPythonパッケージがインストールされていない

**解決策：**
```bash
cd backend
pip install google-cloud-storage Pillow

# または requirements.txt からインストール
pip install -r requirements.txt
```

### エラー: "403 Forbidden" または "Permission denied"

**原因：** サービスアカウントに適切な権限がない

**解決策：**
```bash
# サービスアカウントのメールアドレスを確認
gcloud iam service-accounts list

# 権限を付与
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/storage.objectAdmin"
```

### エラー: 設定確認スクリプトで "GCS Storage service is not available"

**原因：** 環境変数が正しく読み込まれていない、またはGCSクライアントの初期化に失敗

**解決策：**
1. `.env`ファイルが`backend`ディレクトリに存在するか確認
2. 環境変数の値にタイポがないか確認
3. サービスアカウントキーファイルのパスが正しいか確認
4. アプリケーションを再起動

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

## CI/CD環境での設定

### GitHub Actionsでの設定

GitHub ActionsでCI/CDパイプラインを実行する場合、環境変数とシークレットを設定する必要があります。

#### 1. GitHub Secretsの設定

1. GitHubリポジトリの「Settings」→「Secrets and variables」→「Actions」に移動
2. 「New repository secret」をクリック
3. 以下のシークレットを追加：

| Secret名 | 説明 | 例 |
|---------|------|-----|
| `GCS_BUCKET_NAME` | GCSバケット名 | `disease-community-images` |
| `GCS_PROJECT_ID` | GCPプロジェクトID | `circles-202510` |
| `GCS_SERVICE_ACCOUNT_KEY` | サービスアカウントキーのJSON（Base64エンコードまたはそのまま） | `{"type":"service_account",...}` |
| `GCP_SA_KEY` | サービスアカウントキーのJSON（別名） | `{"type":"service_account",...}` |

#### 2. GitHub Actionsワークフローの例

```yaml
name: Test and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      
      - name: Set up GCS credentials
        env:
          GCS_SERVICE_ACCOUNT_KEY: ${{ secrets.GCS_SERVICE_ACCOUNT_KEY }}
        run: |
          mkdir -p backend/secrets
          echo "$GCS_SERVICE_ACCOUNT_KEY" > backend/secrets/service-account-key.json
          chmod 600 backend/secrets/service-account-key.json
      
      - name: Set environment variables
        run: |
          echo "GCS_BUCKET_NAME=${{ secrets.GCS_BUCKET_NAME }}" >> $GITHUB_ENV
          echo "GCS_PROJECT_ID=${{ secrets.GCS_PROJECT_ID }}" >> $GITHUB_ENV
          echo "GOOGLE_APPLICATION_CREDENTIALS=backend/secrets/service-account-key.json" >> $GITHUB_ENV
      
      - name: Run GCS config check
        run: |
          cd backend
          python scripts/check_gcs_config.py
      
      - name: Run tests
        run: |
          cd backend
          pytest tests/

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCS_PROJECT_ID }}
      
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy disease-community-api \
            --source ./backend \
            --region asia-northeast1 \
            --set-env-vars="GCS_BUCKET_NAME=${{ secrets.GCS_BUCKET_NAME }},GCS_PROJECT_ID=${{ secrets.GCS_PROJECT_ID }}"
```

#### 3. セキュリティのベストプラクティス

- ✅ サービスアカウントキーはGitHub Secretsに保存（リポジトリに直接記述しない）
- ✅ CI/CD環境では最小限の権限を持つサービスアカウントを使用
- ✅ テスト環境と本番環境で異なるサービスアカウントを使用
- ✅ 定期的にサービスアカウントキーをローテーション

### GitLab CI/CDでの設定

GitLab CI/CDを使用する場合：

```yaml
variables:
  GCS_BUCKET_NAME: "disease-community-images"
  GCS_PROJECT_ID: "circles-202510"

test:
  image: python:3.11
  before_script:
    - cd backend
    - pip install -r requirements.txt
    - |
      mkdir -p secrets
      echo "$GCS_SERVICE_ACCOUNT_KEY" > secrets/service-account-key.json
      chmod 600 secrets/service-account-key.json
      export GOOGLE_APPLICATION_CREDENTIALS=secrets/service-account-key.json
  script:
    - python scripts/check_gcs_config.py
    - pytest tests/
  only:
    - merge_requests
    - main
```

## テスト環境での設定

### 単体テストでのモック

GCS機能をテストする際は、実際のGCSに接続せずにモックを使用することを推奨します：

```python
# tests/test_storage_service.py
import pytest
from unittest.mock import Mock, patch
from app.services.storage_service import storage_service

@pytest.fixture
def mock_gcs_client():
    with patch('app.services.storage_service.storage') as mock_storage:
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_blob.public_url = "https://storage.googleapis.com/bucket/test.jpg"
        mock_bucket.blob.return_value = mock_blob
        mock_storage.Client.return_value.bucket.return_value = mock_bucket
        yield mock_storage

def test_upload_image(mock_gcs_client):
    # テストコード
    result = storage_service.upload_image(b"fake_image_data", "test.jpg")
    assert result is not None
```

### 統合テストでの設定

統合テストで実際のGCSを使用する場合：

```python
# tests/conftest.py
import pytest
import os
from dotenv import load_dotenv

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """テスト環境のセットアップ"""
    load_dotenv(".env.test")  # テスト用の.envファイル
    
    # テスト用のバケット名を設定
    os.environ["GCS_BUCKET_NAME"] = os.getenv("GCS_BUCKET_NAME_TEST", "test-bucket")
    os.environ["GCS_PROJECT_ID"] = os.getenv("GCS_PROJECT_ID")
    
    yield
    
    # クリーンアップ
    pass
```

### テスト用環境変数ファイル

`backend/.env.test`ファイルを作成：

```env
# テスト環境用の設定
GCS_BUCKET_NAME=test-disease-community-images
GCS_PROJECT_ID=your-project-id-123456
GOOGLE_APPLICATION_CREDENTIALS=../secrets/test-service-account-key.json
```

## 環境間の移行ガイド

### 開発環境からステージング環境へ

1. **環境変数の確認**
   ```bash
   # 開発環境の設定を確認
   cd backend
   python scripts/check_gcs_config.py
   ```

2. **ステージング環境の設定**
   - Cloud Runのステージングサービスに環境変数を設定
   - ステージング用のバケット名を設定（例: `disease-community-images-staging`）

3. **動作確認**
   ```bash
   # ステージング環境のAPIで確認
   curl https://staging-api.example.com/health
   ```

### ステージング環境から本番環境へ

1. **本番環境の準備**
   - 本番用のGCSバケットを作成
   - 本番用のサービスアカウントに権限を付与

2. **環境変数の設定**
   ```bash
   gcloud run services update disease-community-api \
     --set-env-vars="GCS_BUCKET_NAME=disease-community-images,GCS_PROJECT_ID=circles-202510" \
     --region=asia-northeast1
   ```

3. **ロールバック計画**
   - 以前のリビジョンにロールバックする方法を準備
   ```bash
   gcloud run services update-traffic disease-community-api \
     --to-revisions=REVISION_NAME=100 \
     --region=asia-northeast1
   ```

## よくある質問（FAQ）

### Q1: 開発環境と本番環境で異なる設定方法を使えますか？

**A:** はい、可能です。推奨される設定は以下の通りです：

- **開発環境**: サービスアカウントキーファイルを使用（`.env`ファイルで`GOOGLE_APPLICATION_CREDENTIALS`を設定）
- **本番環境**: Cloud Runのデフォルトサービスアカウントを使用（`GOOGLE_APPLICATION_CREDENTIALS`は設定しない）

### Q2: 複数の環境（開発、ステージング、本番）で異なるバケットを使いたい

**A:** 環境変数`GCS_BUCKET_NAME`を環境ごとに設定してください：

- 開発環境: `disease-community-images-dev`
- ステージング環境: `disease-community-images-staging`
- 本番環境: `disease-community-images`

### Q3: サービスアカウントキーファイルをGitにコミットしてしまった

**A:** すぐに対処してください：

1. **Git履歴から削除**:
   ```bash
   git rm --cached backend/secrets/service-account-key.json
   git commit -m "Remove service account key file"
   ```

2. **GCPコンソールでキーを無効化**:
   - IAMと管理 → サービスアカウント → 該当のサービスアカウント
   - 「キー」タブ → 該当キーを削除

3. **新しいキーを生成**して再設定

4. **`.gitignore`を確認**して、今後コミットされないようにする

### Q4: Cloud Runで環境変数を設定しても反映されない

**A:** 以下の点を確認してください：

1. **新しいリビジョンがデプロイされているか確認**
   - 環境変数の変更は新しいリビジョンのデプロイが必要です

2. **環境変数名のタイポがないか確認**
   - `GCS_BUCKET_NAME`（大文字小文字を正確に）

3. **Cloud Runのログを確認**
   ```bash
   gcloud run services logs read disease-community-api --region=asia-northeast1 --limit=50
   ```

### Q5: ローカル開発環境でCloud Runのデフォルトサービスアカウントを使えますか？

**A:** いいえ、できません。Cloud RunのデフォルトサービスアカウントはCloud Run環境内でのみ使用可能です。ローカル開発では、サービスアカウントキーファイルを使用してください。

### Q6: 画像アップロード機能が動作しない

**A:** 以下の順序で確認してください：

1. **設定確認スクリプトを実行**:
   ```bash
   cd backend
   python scripts/check_gcs_config.py
   ```

2. **環境変数が正しく設定されているか確認**:
   ```bash
   cd backend
   python -c "import os; from dotenv import load_dotenv; load_dotenv(); print(os.getenv('GCS_BUCKET_NAME'))"
   ```

3. **バックエンドのログを確認**:
   - `Image upload service is not configured` というエラーが出ていないか確認

4. **APIエンドポイントが正しく動作しているか確認**:
   ```bash
   curl http://localhost:8000/docs
   ```

### Q7: ローカル環境では画像をどこに保存するのがよいですか？

**A:** ローカル開発環境では、以下の選択肢があります：

**推奨: 実際のGCSを使用する**
- 本番環境と同じ動作でテスト可能
- 環境の違いによる問題を回避
- 保存場所: GCSバケット（例: `disease-community-images/posts/uuid.jpg`）

**代替案: ローカルファイルシステムに保存する**
- GCPアカウント不要
- 推奨保存場所: `backend/uploads/posts/` または `backend/static/uploads/posts/`
- ただし、現在の実装ではコードの変更が必要

**詳細は「方法1: 開発環境（ローカル開発）」セクションの「ローカル環境での画像保存方法の選択肢」を参照してください。**

## 画像アップロード機能との連携

この環境変数設定は、投稿機能の画像アップロード機能で使用されます。

### 機能概要

環境変数が正しく設定されていると、以下の機能が利用可能になります：

- **画像アップロード**: 投稿作成時に画像をアップロード
- **画像リサイズ**: 自動的に画像を最適化（最大1920x1920ピクセル）
- **画像削除**: 投稿削除時に画像も自動削除

### APIエンドポイント

環境変数設定後、以下のエンドポイントが利用可能になります：

- `POST /api/v1/images/upload` - 単一画像アップロード
- `POST /api/v1/images/upload-multiple` - 複数画像アップロード（最大5枚）
- `DELETE /api/v1/images/delete?image_url=<url>` - 画像削除

### 詳細なセットアップ手順

画像アップロード機能の詳細なセットアップ手順については、以下のドキュメントを参照してください：

- [GCS画像アップロードセットアップガイド](GCS_IMAGE_UPLOAD_SETUP.md) - バケット作成、API使用方法、トラブルシューティング

### 動作確認

環境変数設定後、以下のコマンドで画像アップロード機能が有効になっているか確認できます：

```bash
# バックエンドディレクトリで実行
cd backend
python -c "
from app.services.storage_service import storage_service
if storage_service.is_available():
    print('✅ 画像アップロード機能が有効です')
    print(f'   バケット名: {storage_service.bucket_name}')
    print(f'   プロジェクトID: {storage_service.project_id}')
else:
    print('❌ 画像アップロード機能が無効です')
    print('   環境変数を確認してください')
"
```

## クイックリファレンス

### 必須環境変数

| 環境変数名 | 説明 | 例 |
|-----------|------|-----|
| `GCS_BUCKET_NAME` | GCSバケット名 | `disease-community-images` |
| `GCS_PROJECT_ID` | GCPプロジェクトID | `circles-202510` |
| `GOOGLE_APPLICATION_CREDENTIALS` | サービスアカウントキーのパス（開発環境のみ） | `/path/to/key.json` |

### 環境別の推奨設定

#### 開発環境（ローカル）
```env
GCS_BUCKET_NAME=disease-community-images
GCS_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=../secrets/service-account-key.json
```

#### 本番環境（Cloud Run）
```bash
# 環境変数のみ設定（認証はデフォルトサービスアカウントを使用）
gcloud run services update disease-community-api \
  --set-env-vars="GCS_BUCKET_NAME=disease-community-images,GCS_PROJECT_ID=circles-202510" \
  --region=asia-northeast1
```

### よく使うコマンド

#### 設定確認
```bash
cd backend
python scripts/check_gcs_config.py
```

#### 環境変数の確認
```bash
cd backend
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print('GCS_BUCKET_NAME:', os.getenv('GCS_BUCKET_NAME'))"
```

#### GCS接続確認
```bash
cd backend
python -c "from app.services.storage_service import storage_service; print('Available:', storage_service.is_available())"
```

#### Cloud Run環境変数の確認
```bash
gcloud run services describe disease-community-api \
  --region=asia-northeast1 \
  --format="value(spec.template.spec.containers[0].env)"
```

#### サービスアカウント権限の確認
```bash
gcloud projects get-iam-policy $(gcloud config get-value project) \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:YOUR_SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com"
```

### ローカル環境での画像保存場所

**推奨: 実際のGCSを使用**
- 保存場所: GCSバケット（例: `disease-community-images/posts/uuid.jpg`）
- 本番環境と同じ動作でテスト可能

**代替案: ローカルファイルシステム**
- 推奨保存場所: `backend/uploads/posts/` または `backend/static/uploads/posts/`
- 注意: 現在の実装ではコードの変更が必要

詳細は「方法1: 開発環境（ローカル開発）」セクションを参照してください。

### トラブルシューティングのチェックリスト

1. ✅ 環境変数が設定されているか確認
2. ✅ サービスアカウントキーファイルが存在するか確認（開発環境）
3. ✅ サービスアカウントに適切な権限があるか確認
4. ✅ バケットが存在するか確認
5. ✅ バケット名とプロジェクトIDが正しいか確認
6. ✅ アプリケーションを再起動したか確認

### 関連ドキュメント

- [GCS画像アップロードセットアップガイド](GCS_IMAGE_UPLOAD_SETUP.md) - バケット作成、API使用方法
- [GCSセットアップ完了確認](GCS_SETUP_COMPLETE.md) - セットアップ完了チェックリスト
- [GCS検証チェックリスト](GCS_VERIFICATION_CHECKLIST.md) - 動作確認手順

## 参考リンク

- [Google Cloud Storage認証](https://cloud.google.com/storage/docs/authentication)
- [Cloud Run環境変数](https://cloud.google.com/run/docs/configuring/environment-variables)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)
- [サービスアカウントのベストプラクティス](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [GCS画像アップロードセットアップガイド](GCS_IMAGE_UPLOAD_SETUP.md) - 画像アップロード機能の詳細なセットアップ手順

