# トラブルシューティングガイド

## データベース接続エラー

### エラー: `could not translate host name "postgres" to address`

**原因**: バックエンドがDocker Compose内の`postgres`ホスト名を参照しようとしているが、ローカル環境では`localhost`を使用する必要がある。

**解決策**:

1. `backend/.env`ファイルを作成して、`DATABASE_URL`を`localhost`に設定：

```bash
cat > backend/.env << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/disease_community
ENVIRONMENT=development
LOG_LEVEL=DEBUG
AUTH0_DOMAIN=dev-2mqgvitlgxdwl5ea.us.auth0.com
AUTH0_AUDIENCE=https://api.disease-community.com
GCS_BUCKET_NAME=disease-community-images
GCS_PROJECT_ID=circles-202510
EOF
```

2. PostgreSQLコンテナが起動しているか確認：

```bash
# Colimaが起動しているか確認
colima status

# PostgreSQLコンテナを起動
cd /Users/mmiy/Development/circles0
docker-compose up -d postgres

# コンテナの状態確認
docker-compose ps
```

3. バックエンドを再起動：

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### エラー: `500 Internal Server Error`

**原因**: データベース接続エラーまたはその他のサーバーエラー。

**解決策**:

1. バックエンドのログを確認：

```bash
# バックエンドのターミナルでエラーメッセージを確認
# または、ログファイルを確認
```

2. データベース接続を確認：

```bash
# PostgreSQLに接続できるか確認
docker-compose exec postgres psql -U postgres -d disease_community -c "SELECT version();"
```

3. マイグレーションを実行：

```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

## Docker接続エラー

### エラー: `permission denied while trying to connect to the docker API`

**原因**: Dockerソケットへのアクセス権限がない。

**解決策**:

1. Colimaが起動しているか確認：

```bash
colima status
```

2. Colimaを再起動：

```bash
colima stop
colima start
```

3. Dockerグループに追加（必要に応じて）：

```bash
# macOSでは通常不要ですが、権限問題が続く場合
sudo dscl . -append /Groups/docker GroupMembership $(whoami)
```

## 環境変数の確認

### バックエンドの環境変数

```bash
cd backend
cat .env
```

必要な環境変数：
- `DATABASE_URL`: `postgresql://postgres:postgres@localhost:5432/disease_community`
- `ENVIRONMENT`: `development`
- `LOG_LEVEL`: `DEBUG`
- `AUTH0_DOMAIN`: Auth0ドメイン
- `AUTH0_AUDIENCE`: Auth0 API識別子

### フロントエンドの環境変数

```bash
cd frontend
cat .env.local
```

必要な環境変数：
- `NEXT_PUBLIC_API_URL`: `http://localhost:8000`
- `NEXT_PUBLIC_AUTH0_DOMAIN`: Auth0ドメイン
- `NEXT_PUBLIC_AUTH0_CLIENT_ID`: Auth0クライアントID
- `NEXT_PUBLIC_AUTH0_AUDIENCE`: Auth0 API識別子
- `NEXT_PUBLIC_AUTH0_REDIRECT_URI`: `http://localhost:3000/callback`

## ポート競合

### エラー: `Address already in use`

**原因**: ポートが既に使用されている。

**解決策**:

1. 使用中のポートを確認：

```bash
# ポート5432（PostgreSQL）
lsof -i :5432

# ポート8000（Backend）
lsof -i :8000

# ポート3000（Frontend）
lsof -i :3000
```

2. プロセスを終了：

```bash
# プロセスIDを確認して終了
kill -9 <PID>
```

## その他の問題

### 仮想環境が有効化されていない

```bash
cd backend
source venv/bin/activate
# プロンプトに (venv) が表示されることを確認
```

### 依存関係がインストールされていない

```bash
# バックエンド
cd backend
source venv/bin/activate
pip install -r requirements.txt

# フロントエンド
cd frontend
npm install
```

### マイグレーションが実行されていない

```bash
cd backend
source venv/bin/activate
alembic upgrade head
```
