# Getting Started - 開発環境セットアップガイド

このガイドは、新しい開発者が Disease Community Platform の開発を始めるための手順を説明します。

## 📋 前提条件

開発を始める前に、以下のツールがインストールされている必要があります：

### 必須ツール

- **Git** (2.30+)
  ```bash
  git --version
  ```

- **Docker** (20.10+) と **Docker Compose** (2.0+)
  ```bash
  docker --version
  docker-compose --version
  ```

- **Node.js** (18.x) と **npm**
  ```bash
  node --version
  npm --version
  ```

- **Python** (3.11+) と **pip**
  ```bash
  python --version
  pip --version
  ```

### インストール方法

<details>
<summary>macOS</summary>

```bash
# Homebrew をインストール（まだの場合）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# ツールをインストール
brew install git
brew install --cask docker
brew install node
brew install python@3.11
```
</details>

<details>
<summary>Ubuntu/Debian Linux</summary>

```bash
# Git
sudo apt update
sudo apt install git

# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Compose
sudo apt install docker-compose-plugin

# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# Python 3.11
sudo apt install python3.11 python3.11-venv python3-pip
```
</details>

<details>
<summary>Windows (WSL2推奨)</summary>

1. WSL2をインストール
2. Ubuntu on WSL2をインストール
3. 上記のUbuntu手順に従う
</details>

---

## 🚀 クイックスタート

### 1. リポジトリのクローン

```bash
# HTTPSでクローン
git clone https://github.com/dev-mmiy/circles0.git
cd circles0

# または、SSHでクローン（推奨）
git clone git@github.com:dev-mmiy/circles0.git
cd circles0
```

### 2. 環境変数の設定

```bash
# バックエンド用環境変数
cp backend/.env.example backend/.env

# フロントエンド用環境変数（必要な場合）
cp frontend/.env.example frontend/.env
```

デフォルトの`.env`ファイルはローカル開発用に設定されています。

### 3. Docker Composeで起動

```bash
# すべてのサービスを起動（バックエンド、フロントエンド、データベース）
docker-compose up -d

# ログを確認
docker-compose logs -f
```

### 4. データベースのセットアップ

初回起動時、データベースマイグレーションは自動的に実行されます。
手動で実行する場合：

```bash
# データベースマイグレーション
docker-compose exec backend alembic upgrade head

# サンプルデータの投入（オプション）
docker-compose exec backend python -c "from app.database import SessionLocal; from app.models import *; print('Database is ready!')"
```

### 5. 動作確認

```bash
# バックエンドのヘルスチェック
curl http://localhost:8000/health

# フロントエンドにアクセス
open http://localhost:3000
# または
xdg-open http://localhost:3000  # Linux
```

### 6. 開発開始！

- **バックエンドAPI**: http://localhost:8000
- **API ドキュメント**: http://localhost:8000/docs
- **フロントエンド**: http://localhost:3000

---

## 📁 プロジェクト構造

```
circles0/
├── backend/                 # FastAPI バックエンド
│   ├── app/
│   │   ├── api/            # APIエンドポイント
│   │   ├── models/         # データベースモデル
│   │   ├── schemas/        # Pydanticスキーマ
│   │   ├── middleware/     # ミドルウェア
│   │   └── utils/          # ユーティリティ関数
│   ├── alembic/            # データベースマイグレーション
│   ├── config/             # 設定ファイル
│   ├── tests/              # テスト
│   ├── Dockerfile          # 本番用Dockerfile
│   └── requirements.txt    # Python依存関係
│
├── frontend/               # Next.js フロントエンド
│   ├── app/               # App Router（Next.js 14）
│   │   ├── api/           # APIルート（使用していない）
│   │   ├── register/      # 登録ページ
│   │   └── profile/       # プロフィールページ
│   ├── components/        # Reactコンポーネント
│   ├── contexts/          # React Context（DI）
│   ├── lib/               # ユーティリティライブラリ
│   ├── __tests__/         # テスト
│   ├── Dockerfile         # 本番用Dockerfile
│   └── package.json       # Node.js依存関係
│
├── .github/
│   └── workflows/         # GitHub Actions CI/CD
│       ├── ci.yml         # メインCI/CDパイプライン
│       └── pr-check.yml   # PRチェック
│
├── scripts/               # ユーティリティスクリプト
│   ├── local-test.sh      # ローカルテスト（シンプル）
│   ├── local-test-full.sh # 包括的ローカルテスト
│   └── local-test-backend.sh # バックエンドのみテスト
│
├── docker-compose.yml     # ローカル開発環境
├── Makefile              # 便利なMakeコマンド
└── README.md             # プロジェクト概要
```

---

## 🛠️ 開発ワークフロー

### 日常的な開発

```bash
# サービスを起動
docker-compose up -d

# ログを確認
docker-compose logs -f backend
docker-compose logs -f frontend

# コードを変更（ホットリロード有効）
# backend/app/ または frontend/app/ を編集

# サービスを停止
docker-compose down

# データベースを含めて完全にクリーンアップ
docker-compose down -v
```

### Make コマンド（便利）

```bash
# ヘルプを表示
make help

# 開発環境を起動
make dev

# ローカルテストを実行
make test-local

# バックエンドのみテスト
make test-backend

# フォーマット＆リンティング
make lint

# サービスを停止
make down

# データベースをリセット
make db-reset
```

### ブランチ戦略

```bash
# 新しい機能の開発
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# 開発、コミット
git add .
git commit -m "feat: add your feature"

# プッシュしてPRを作成
git push origin feature/your-feature-name
```

---

## 🧪 テスト

### ローカルでテストを実行

```bash
# すべてのテストを実行
./scripts/local-test-full.sh

# バックエンドテストのみ
./scripts/local-test-backend.sh

# シンプルなテスト（クイック）
./scripts/local-test.sh
```

### 個別のテスト

```bash
# バックエンド単体テスト
docker-compose exec backend pytest

# バックエンド統合テスト
docker-compose exec backend pytest tests/integration/

# フロントエンド単体テスト
docker-compose exec frontend npm test

# リンティング
docker-compose exec backend black --check .
docker-compose exec backend isort --check-only .
docker-compose exec backend flake8 .
docker-compose exec frontend npm run lint
```

---

## 🐛 トラブルシューティング

### よくある問題

<details>
<summary>1. ポートがすでに使用されている</summary>

```bash
# 使用中のポートを確認
lsof -i :8000  # バックエンド
lsof -i :3000  # フロントエンド
lsof -i :5432  # PostgreSQL

# プロセスを停止
kill -9 <PID>

# または、docker-composeを再起動
docker-compose down
docker-compose up -d
```
</details>

<details>
<summary>2. データベース接続エラー</summary>

```bash
# データベースコンテナが起動しているか確認
docker-compose ps

# データベースログを確認
docker-compose logs postgres

# データベースをリセット
docker-compose down -v
docker-compose up -d
```
</details>

<details>
<summary>3. Dockerイメージのビルドエラー</summary>

```bash
# キャッシュをクリアして再ビルド
docker-compose build --no-cache

# または、個別にビルド
docker-compose build backend
docker-compose build frontend
```
</details>

<details>
<summary>4. パッケージのインストールエラー</summary>

```bash
# バックエンド
docker-compose exec backend pip install -r requirements.txt

# フロントエンド
docker-compose exec frontend npm install

# または、コンテナを再ビルド
docker-compose up -d --build
```
</details>

<details>
<summary>5. フロントエンドが表示されない</summary>

```bash
# フロントエンドのログを確認
docker-compose logs frontend

# Next.jsのキャッシュをクリア
docker-compose exec frontend rm -rf .next
docker-compose restart frontend
```
</details>

---

## 🔧 開発ツール

### 推奨エディタ拡張機能（VS Code）

```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-azuretools.vscode-docker"
  ]
}
```

### エディタ設定

```json
{
  "editor.formatOnSave": true,
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": false,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## 📚 追加リソース

### ドキュメント

- **プロジェクト概要**: [README.md](./README.md)
- **デプロイメントガイド**: [DEPLOYMENT_STATUS.md](./DEPLOYMENT_STATUS.md)
- **実装サマリー**: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **データベースリスタート**: [README-DB-RESTART.md](./README-DB-RESTART.md)
- **成功サマリー**: [FINAL_SUCCESS_SUMMARY.md](./FINAL_SUCCESS_SUMMARY.md)

### API ドキュメント

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 技術スタック

- **バックエンド**: [FastAPI](https://fastapi.tiangolo.com/)
- **フロントエンド**: [Next.js](https://nextjs.org/)
- **データベース**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [SQLAlchemy](https://www.sqlalchemy.org/)
- **マイグレーション**: [Alembic](https://alembic.sqlalchemy.org/)

---

## 🤝 コントリビューション

### コーディング規約

- **Python**: Black, isort, flake8
- **JavaScript/TypeScript**: ESLint, Prettier
- **コミットメッセージ**: Conventional Commits

### コミットメッセージフォーマット

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: フォーマット
- `refactor`: リファクタリング
- `test`: テスト追加
- `chore`: 雑務

**例:**
```bash
git commit -m "feat(auth): add JWT authentication"
git commit -m "fix(api): resolve CORS issue"
git commit -m "docs: update setup guide"
```

---

## 🆘 ヘルプが必要な場合

1. **ドキュメントを確認**: 上記のリンクを参照
2. **ログを確認**: `docker-compose logs`
3. **既存のIssueを検索**: GitHub Issues
4. **新しいIssueを作成**: 詳細な情報を含める
5. **チームに質問**: Slack/Discordなど

---

## ✅ セットアップチェックリスト

開発環境が正しくセットアップされたか確認：

- [ ] Gitがインストールされている
- [ ] Dockerがインストールされている
- [ ] Node.js 18がインストールされている
- [ ] Python 3.11がインストールされている
- [ ] リポジトリがクローンされている
- [ ] 環境変数が設定されている
- [ ] `docker-compose up -d` が成功する
- [ ] http://localhost:8000/health にアクセスできる
- [ ] http://localhost:3000 にアクセスできる
- [ ] テストが実行できる
- [ ] エディタが設定されている

---

**開発を楽しんでください！** 🚀

何か問題があれば、遠慮なくチームに相談してください。

