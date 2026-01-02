# Disease Community Platform

疾患を持つユーザー同士のコミュニティサイト

## 概要

Disease Community Platformは、同じ疾患を持つユーザー同士が情報を共有し、コミュニティを形成できるプラットフォームです。投稿・コメント、メッセージング、グループチャットなどの機能を提供し、ユーザー同士のつながりを支援します。

## 主な機能

- ✅ **認証・ユーザー管理**: Auth0によるOAuth2.0認証、ユーザープロフィール管理、新規会員登録フロー
- ✅ **投稿・フィード**: テキスト投稿、画像添付（最大5枚）、ハッシュタグ、メンション機能
- ✅ **コメント・リアクション**: 投稿へのコメント、返信、いいね機能
- ✅ **フォロー・フォロワー**: ユーザー間のフォロー関係、相互フォロー表示
- ✅ **通知システム**: リアルタイム通知（SSE）、Web Push通知
- ✅ **メッセージング**: 1対1のダイレクトメッセージ、グループチャット
- ✅ **検索機能**: ユーザー検索、疾患検索、ハッシュタグ検索
- ✅ **健康記録機能**: 
  - バイタル記録（血圧・心拍数、体温、体重・体脂肪率、血糖値、血中酸素濃度）
  - 食事記録（食べ物、栄養情報、メモ）
  - 日々の記録ページ（リスト表示、カレンダー表示、チャート表示）
  - チャート機能（1週間、1か月、半年、1年の期間選択、スクロール機能）
- ✅ **国際化対応**: 日本語・英語の多言語対応（next-intl）
- ✅ **プロフィール公開範囲制御**: 詳細なプライバシー設定

## プロジェクト構成

```
circles0/
├── backend/                 # FastAPI バックエンド
├── frontend/               # Next.js 14 フロントエンド
├── infrastructure/         # インフラストラクチャ設定
├── .github/               # GitHub Actions CI/CD
├── docker-compose.yml     # ローカル開発用
├── Progress.md            # 開発進捗記録
└── README.md
```

## 技術スタック

### フロントエンド
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **認証**: Auth0 React SDK
- **状態管理**: React Context API
- **国際化**: next-intl v3.x
- **HTTP クライアント**: Axios
- **チャートライブラリ**: Recharts 2.x
- **日付処理**: date-fns
- **Deployment**: GCP Cloud Run

### バックエンド
- **Framework**: FastAPI
- **Language**: Python 3.11
- **ORM**: SQLAlchemy
- **Database**: PostgreSQL 15
- **マイグレーション**: Alembic
- **認証**: Auth0 (JWT検証)
- **リアルタイム**: Server-Sent Events (SSE)
- **Deployment**: GCP Cloud Run

### インフラ
- **コンテナ**: Docker / Docker Compose
- **CI/CD**: GitHub Actions
- **Container Registry**: Google Container Registry
- **Cloud Provider**: Google Cloud Platform
- **Storage**: Google Cloud Storage (画像アップロード)

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
- **API ドキュメント**: http://localhost:8000/docs

**注意**: フロントエンドは多言語対応のため、URLにロケールプレフィックスが含まれます。
- 日本語: http://localhost:3000/ja
- 英語: http://localhost:3000/en
- ルートアクセス: http://localhost:3000/ → `/ja`に自動リダイレクト

## デプロイメント

### 本番環境
- **Frontend**: https://disease-community-frontend-508246122017.asia-northeast1.run.app
- **Backend API**: https://disease-community-api-508246122017.asia-northeast1.run.app
- **API Docs**: https://disease-community-api-508246122017.asia-northeast1.run.app/docs

### 自動デプロイ（GitHub Actions）
- **main ブランチ**: 本番環境に自動デプロイ
- CI/CDパイプラインで自動テスト、ビルド、デプロイを実行

### 手動デプロイ
```bash
# 本番環境
./scripts/deploy.sh prod all

# 個別サービス
./scripts/deploy.sh prod backend
./scripts/deploy.sh prod frontend
```

### 必要な環境変数
GitHub Secretsに以下を設定：
- `GCP_SA_KEY`: Google Cloud サービスアカウントキー
- `DATABASE_URL_PROD`: 本番環境データベースURL
- `AUTH0_DOMAIN`: Auth0ドメイン
- `AUTH0_CLIENT_ID`: Auth0クライアントID
- `AUTH0_CLIENT_SECRET`: Auth0クライアントシークレット
- `GCS_BUCKET_NAME`: Google Cloud Storageバケット名
- `VAPID_PRIVATE_KEY`: Web Push通知用VAPID秘密鍵
- `VAPID_PUBLIC_KEY`: Web Push通知用VAPID公開鍵

## 開発ドキュメント

- [Progress.md](Progress.md) - 詳細な開発進捗記録
- [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md) - 国際化実装ガイド

## リンク

- **GitHub Repository**: https://github.com/dev-mmiy/circles0
- **GitHub Actions**: https://github.com/dev-mmiy/circles0/actions
- **Auth0 Dashboard**: https://manage.auth0.com
- **GCP Console**: https://console.cloud.google.com/run?project=circles-202510

## ライセンス

MIT License
