# Disease Community Platform

疾患を持つユーザー同士のコミュニティサイト

## プロジェクト構成

```
disease-community/
├── backend/                 # FastAPI バックエンド
├── frontend/               # Next.js フロントエンド
├── infrastructure/         # インフラストラクチャ設定
├── .github/               # GitHub Actions CI/CD
├── docker-compose.yml     # ローカル開発用
└── README.md
```

## 技術スタック

### バックエンド
- **Framework**: FastAPI
- **Language**: Python 3.11
- **Database**: PostgreSQL
- **Deployment**: GCP Cloud Run

### フロントエンド
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

### CI/CD
- **CI/CD**: GitHub Actions
- **Container Registry**: Google Container Registry
- **Cloud Provider**: Google Cloud Platform

## 開発環境セットアップ

### 前提条件
- Node.js 18+
- Python 3.11+
- Docker
- Git
- Google Cloud CLI (本番デプロイ用)

### ローカル開発

1. **リポジトリクローン**
```bash
git clone <repository-url>
cd disease-community
```

2. **Docker Compose起動（推奨）**
```bash
# Docker Compose V2 (推奨)
docker compose up -d

# Docker Compose V1
docker-compose up -d

# 本番環境（ローカル）
docker compose -f docker-compose.prod.yml up -d
```

3. **Docker Composeが利用できない場合**
```bash
# 代替スクリプト使用
./scripts/start-dev.sh

# 停止
./scripts/stop-dev.sh
```

4. **個別起動**
```bash
# バックエンド
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# フロントエンド
cd frontend
npm install
npm run dev
```

### アクセスURL
- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8000
- **API ドキュメント**: http://localhost:8000/docs (開発環境のみ)

## デプロイメント

### 環境
- **開発環境**: `https://disease-community-api-dev-asia-northeast1-disease-community-platform.a.run.app`
- **本番環境**: `https://disease-community-api-asia-northeast1-disease-community-platform.a.run.app`

### 自動デプロイ（GitHub Actions）
- **develop ブランチ**: 開発環境に自動デプロイ
- **main ブランチ**: 本番環境に自動デプロイ

### 手動デプロイ
```bash
# 開発環境
./scripts/deploy.sh dev all

# 本番環境
./scripts/deploy.sh prod all

# 個別サービス
./scripts/deploy.sh dev backend
./scripts/deploy.sh prod frontend
```

### 必要な環境変数
GitHub Secretsに以下を設定：
- `GCP_SA_KEY`: Google Cloud サービスアカウントキー
- `DATABASE_URL_DEV`: 開発環境データベースURL
- `DATABASE_URL_PROD`: 本番環境データベースURL

## ライセンス

MIT License
