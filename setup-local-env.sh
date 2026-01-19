#!/bin/bash
# Disease Community Platform - ローカル開発環境セットアップスクリプト
# mac-env-config + Colima + asdf + brew 前提

set -e

echo "=========================================="
echo "ローカル開発環境セットアップ"
echo "=========================================="
echo ""

# カラー出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# プロジェクトルートに移動
cd "$(dirname "$0")"
PROJECT_ROOT=$(pwd)

echo "📁 プロジェクトルート: $PROJECT_ROOT"
echo ""

# 1. direnvの設定確認
echo "🔍 direnvの設定確認..."
if ! grep -q "direnv hook zsh" ~/.zshrc 2>/dev/null; then
    echo -e "${YELLOW}⚠️  direnvが~/.zshrcに設定されていません${NC}"
    echo "以下のコマンドを実行してください:"
    echo "  echo 'eval \"\$(direnv hook zsh)\"' >> ~/.zshrc"
    echo "  source ~/.zshrc"
    echo ""
else
    echo -e "${GREEN}✅ direnvは設定済み${NC}"
fi

# 2. .envrcの許可
echo ""
echo "🔍 .envrcの許可確認..."
if [ -f .envrc ]; then
    direnv allow 2>/dev/null || echo -e "${YELLOW}⚠️  direnv allowを手動で実行してください${NC}"
    echo -e "${GREEN}✅ .envrcファイルは存在します${NC}"
else
    echo -e "${YELLOW}⚠️  .envrcファイルが見つかりません${NC}"
fi

# 3. Colimaの起動確認
echo ""
echo "🔍 Colimaの状態確認..."
if colima status >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Colimaは起動中${NC}"
else
    echo -e "${YELLOW}⚠️  Colimaが起動していません${NC}"
    echo "以下のコマンドで起動してください:"
    echo "  colima start"
    echo ""
fi

# 4. Dockerの確認
echo ""
echo "🔍 Dockerの確認..."
if docker ps >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Dockerは動作中${NC}"
else
    echo -e "${YELLOW}⚠️  Dockerが動作していません${NC}"
    echo "Colimaを起動してから再度実行してください"
    echo ""
fi

# 5. バックエンド環境のセットアップ
echo ""
echo "📦 バックエンド環境のセットアップ..."
cd "$PROJECT_ROOT/backend"

# 仮想環境の作成
if [ ! -d "venv" ]; then
    echo "仮想環境を作成中..."
    python -m venv venv
    echo -e "${GREEN}✅ 仮想環境を作成しました${NC}"
else
    echo -e "${GREEN}✅ 仮想環境は既に存在します${NC}"
fi

# 仮想環境の有効化と依存関係のインストール
echo "依存関係をインストール中..."
source venv/bin/activate
pip install --upgrade pip >/dev/null 2>&1
pip install -r requirements.txt
echo -e "${GREEN}✅ バックエンドの依存関係をインストールしました${NC}"

# 環境変数ファイルの確認
if [ ! -f ".env" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  backend/.envファイルが存在しません${NC}"
    echo "以下の内容で作成してください:"
    echo ""
    cat << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/disease_community
ENVIRONMENT=development
LOG_LEVEL=DEBUG
AUTH0_DOMAIN=dev-2mqgvitlgxdwl5ea.us.auth0.com
AUTH0_AUDIENCE=https://api.disease-community.com
GCS_BUCKET_NAME=disease-community-images
GCS_PROJECT_ID=circles-202510
EOF
    echo ""
fi

# 6. フロントエンド環境のセットアップ
echo ""
echo "📦 フロントエンド環境のセットアップ..."
cd "$PROJECT_ROOT/frontend"

if [ ! -d "node_modules" ]; then
    echo "依存関係をインストール中..."
    npm install
    echo -e "${GREEN}✅ フロントエンドの依存関係をインストールしました${NC}"
else
    echo -e "${GREEN}✅ node_modulesは既に存在します${NC}"
fi

# 環境変数ファイルの確認
if [ ! -f ".env.local" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  frontend/.env.localファイルが存在しません${NC}"
    echo "以下の内容で作成してください:"
    echo ""
    cat << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AUTH0_DOMAIN=dev-2mqgvitlgxdwl5ea.us.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=YGlRudHFYDfkcMZSgamI9PIrhPsFsLmD
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.disease-community.com
NEXT_PUBLIC_AUTH0_REDIRECT_URI=http://localhost:3000/callback
EOF
    echo ""
fi

# 7. PostgreSQLの起動
echo ""
echo "🗄️  PostgreSQLの起動..."
cd "$PROJECT_ROOT"

if docker-compose ps 2>/dev/null | grep -q "disease-community-db"; then
    echo -e "${GREEN}✅ PostgreSQLは既に起動中${NC}"
else
    echo "PostgreSQLを起動中..."
    docker-compose up -d postgres
    echo "データベースの起動を待機中..."
    sleep 5
    echo -e "${GREEN}✅ PostgreSQLを起動しました${NC}"
fi

# 8. データベースマイグレーション
echo ""
echo "🔄 データベースマイグレーション..."
cd "$PROJECT_ROOT/backend"
source venv/bin/activate

if command -v alembic >/dev/null 2>&1; then
    echo "マイグレーションを実行中..."
    alembic upgrade head
    echo -e "${GREEN}✅ マイグレーションを完了しました${NC}"
else
    echo -e "${YELLOW}⚠️  alembicが見つかりません${NC}"
    echo "仮想環境が正しく有効化されているか確認してください"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ セットアップが完了しました！${NC}"
echo "=========================================="
echo ""
echo "次のステップ:"
echo ""
echo "1. バックエンドを起動:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "2. フロントエンドを起動（別ターミナル）:"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "3. アクセス:"
echo "   - フロントエンド: http://localhost:3000"
echo "   - バックエンドAPI: http://localhost:8000"
echo "   - API ドキュメント: http://localhost:8000/docs"
echo ""
