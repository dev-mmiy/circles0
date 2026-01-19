# ローカル開発環境セットアップガイド

mac-env-config + Colima + asdf + brew を前提としたローカル開発環境の構築手順です。

## 前提条件

- macOS
- Homebrew がインストール済み
- [mac-env-config](https://github.com/dev-mmiy/mac-env-config) リポジトリが `~/Development/mac-env-config` にクローン済み

## セットアップ手順

### 1. 基盤環境の確認

```bash
# Homebrewの確認
brew --version

# asdfの確認
asdf --version

# direnvの確認
direnv --version
```

### 2. direnvの設定（未設定の場合）

```bash
# direnvをインストール（未インストールの場合）
brew install direnv

# ~/.zshrcに追加
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc
source ~/.zshrc
```

### 3. Colimaの起動

```bash
# Colimaがインストールされているか確認
colima --version

# Colimaを起動
colima start

# または、リソースを指定して起動
colima start --cpu 4 --memory 8

# Dockerが動作するか確認
docker ps
docker compose version
```

### 4. プロジェクトのセットアップ

プロジェクトルートで以下を実行：

```bash
cd /Users/mmiy/Development/circles0

# direnvを許可（.envrcファイルが既に作成済み）
direnv allow

# バージョン確認（Python 3.12.1, Node.js 20.11.0が有効化されているか）
python --version
node --version
```

### 5. 環境変数ファイルの作成

#### バックエンド用（`backend/.env`）

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

#### フロントエンド用（`frontend/.env.local`）

```bash
cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AUTH0_DOMAIN=dev-2mqgvitlgxdwl5ea.us.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=YGlRudHFYDfkcMZSgamI9PIrhPsFsLmD
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.disease-community.com
NEXT_PUBLIC_AUTH0_REDIRECT_URI=http://localhost:3000/callback
EOF
```

### 6. セットアップスクリプトの実行

```bash
# セットアップスクリプトに実行権限を付与
chmod +x setup-local-env.sh

# セットアップスクリプトを実行
./setup-local-env.sh
```

このスクリプトは以下を自動実行します：
- バックエンド仮想環境の作成
- 依存関係のインストール
- PostgreSQLの起動
- データベースマイグレーション

### 7. 手動セットアップ（スクリプトを使わない場合）

#### バックエンド環境のセットアップ

```bash
cd backend

# 仮想環境の作成
python -m venv venv

# 仮想環境の有効化
source venv/bin/activate

# 依存関係のインストール
pip install --upgrade pip
pip install -r requirements.txt
```

#### フロントエンド環境のセットアップ

```bash
cd frontend

# 依存関係のインストール
npm install
```

#### PostgreSQLの起動

```bash
# プロジェクトルートに戻る
cd /Users/mmiy/Development/circles0

# PostgreSQLのみ起動
docker-compose up -d postgres

# データベース接続確認
docker-compose exec postgres psql -U postgres -d disease_community -c "SELECT version();"
```

#### データベースマイグレーション

```bash
cd backend
source venv/bin/activate

# マイグレーションの実行
alembic upgrade head

# マスターデータの投入（オプション）
python scripts/seed_master_data.py
```

## アプリケーションの起動

### バックエンドの起動

```bash
# ターミナル1
cd /Users/mmiy/Development/circles0/backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### フロントエンドの起動

```bash
# ターミナル2
cd /Users/mmiy/Development/circles0/frontend
npm run dev
```

## アクセス

- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8000
- **API ドキュメント**: http://localhost:8000/docs

## 便利なコマンド

### Colimaの管理

```bash
# Colimaの起動
colima start

# Colimaの停止
colima stop

# Colimaの状態確認
colima status
```

### データベースの管理

```bash
# PostgreSQLのログ確認
docker-compose logs -f postgres

# PostgreSQLの停止
docker-compose stop postgres

# PostgreSQLの再起動
docker-compose restart postgres
```

### マイグレーション

```bash
cd backend
source venv/bin/activate

# マイグレーションの実行
alembic upgrade head

# 新しいマイグレーションの作成
alembic revision -m "migration message"

# マイグレーション履歴の確認
alembic history
```

## トラブルシューティング

### direnvが動作しない場合

```bash
# direnvが有効化されているか確認
direnv version

# .envrcが許可されているか確認
direnv allow

# zshの設定を確認
cat ~/.zshrc | grep direnv
```

### asdfでバージョンが見つからない場合

```bash
# プラグインが正しくインストールされているか確認
asdf plugin list

# 利用可能なバージョンを確認
asdf list all python
asdf list all nodejs

# バージョンをインストール
asdf install python 3.12.1
asdf install nodejs 20.11.0
```

### Dockerが動作しない場合

```bash
# Colimaが起動しているか確認
colima status

# Colimaを再起動
colima stop
colima start

# Dockerの状態確認
docker ps
```

### ポートが既に使用されている場合

```bash
# ポート5432（PostgreSQL）の使用状況確認
lsof -i :5432

# ポート8000（Backend）の使用状況確認
lsof -i :8000

# ポート3000（Frontend）の使用状況確認
lsof -i :3000
```

## 注意事項

1. **環境変数ファイル**: `.env` と `.env.local` は `.gitignore` に含まれているため、手動で作成する必要があります。

2. **direnvの自動環境切替**: プロジェクトディレクトリに `cd` すると、`.tool-versions` に記載されたバージョンが自動的に有効化されます。

3. **仮想環境**: バックエンドの仮想環境は `backend/venv` に作成されます。このディレクトリは `.gitignore` に含まれています。

4. **GCS（Google Cloud Storage）**: ローカル開発では画像アップロード機能は動作しない可能性があります（認証情報が必要）。

## 参考リンク

- [mac-env-config](https://github.com/dev-mmiy/mac-env-config)
- [asdf](https://asdf-vm.com/)
- [direnv](https://direnv.net/)
- [Colima](https://github.com/abiosoft/colima)
