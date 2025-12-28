# データベース設定ガイド

このドキュメントでは、GCP上でのデータベース設定手順を説明します。

## 📋 前提条件

- Google Cloud Platform アカウント
- gcloud CLI がインストール済み
- プロジェクトID: `circles-202510`

## 🗄️ Cloud SQL PostgreSQL インスタンスの作成

### 1. Cloud SQL インスタンスの作成

```bash
# Cloud Shellで実行
gcloud sql instances create disease-community-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=asia-northeast1 \
    --root-password=your-secure-password \
    --storage-type=SSD \
    --storage-size=10GB \
    --storage-auto-increase
```

### 2. データベースの作成

```bash
# 開発環境用データベース
gcloud sql databases create disease_community_dev \
    --instance=disease-community-db

# 本番環境用データベース
gcloud sql databases create disease_community_prod \
    --instance=disease-community-db
```

### 3. データベースユーザーの作成

```bash
# 開発環境用ユーザー
gcloud sql users create dev_user \
    --instance=disease-community-db \
    --password=dev-secure-password

# 本番環境用ユーザー
gcloud sql users create prod_user \
    --instance=disease-community-db \
    --password=prod-secure-password
```

### 4. 接続情報の取得

```bash
# インスタンスの接続名を取得
gcloud sql instances describe disease-community-db \
    --format="value(connectionName)"

# 出力例: circles-202510:asia-northeast1:disease-community-db
```

## 🔐 GitHub Secrets の設定

### 必要なSecrets

| Secret名 | 説明 | 値の例 |
|---------|------|--------|
| `GCP_SA_KEY` | Google Cloud Service Account Key (JSON) | 既に設定済み |
| `GCP_PROJECT_ID` | Google Cloud Project ID | `circles-202510` |
| `DATABASE_URL_DEV` | 開発環境データベースURL | 下記参照 |
| `DATABASE_URL_PROD` | 本番環境データベースURL | 下記参照 |

### データベースURLの形式

#### 開発環境用
```
postgresql://dev_user:dev-secure-password@/disease_community_dev?host=/cloudsql/circles-202510:asia-northeast1:disease-community-db
```

#### 本番環境用
```
postgresql://prod_user:prod-secure-password@/disease_community_prod?host=/cloudsql/circles-202510:asia-northeast1:disease-community-db
```

### GitHub Secrets設定手順

1. GitHub Repository → Settings → Secrets and variables → Actions
2. 以下のSecretsを追加/更新：

```
DATABASE_URL_DEV=postgresql://dev_user:dev-secure-password@/disease_community_dev?host=/cloudsql/circles-202510:asia-northeast1:disease-community-db

DATABASE_URL_PROD=postgresql://prod_user:prod-secure-password@/disease_community_prod?host=/cloudsql/circles-202510:asia-northeast1:disease-community-db
```

## 🚀 設定完了後の確認

### 1. データベース接続テスト

```bash
# ローカルからデータベースに接続テスト
gcloud sql connect disease-community-db --user=dev_user --database=disease_community_dev
```

### 2. CI/CDパイプラインの再実行

1. GitHub Actions → CI/CD Pipeline
2. "Re-run all jobs" をクリック
3. データベース接続エラーが解決されることを確認

## 🔧 トラブルシューティング

### よくある問題

#### 1. 接続エラー
- **原因**: データベースURLの形式が間違っている
- **解決**: 接続名とパスワードを再確認

#### 2. 権限エラー
- **原因**: ユーザーに適切な権限が付与されていない
- **解決**: データベースユーザーの権限を確認

#### 3. ネットワークエラー
- **原因**: Cloud SQL インスタンスのネットワーク設定
- **解決**: ファイアウォールルールを確認

### ログの確認

```bash
# Cloud SQL インスタンスのログを確認
gcloud sql operations list --instance=disease-community-db

# 特定の操作の詳細を確認
gcloud sql operations describe OPERATION_ID --instance=disease-community-db
```

## 📊 コスト最適化

### 開発環境用の設定

```bash
# 開発環境用（コスト削減）
gcloud sql instances create disease-community-db-dev \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=asia-northeast1 \
    --root-password=dev-password \
    --storage-type=SSD \
    --storage-size=10GB
```

### 本番環境用の設定

```bash
# 本番環境用（高可用性）
gcloud sql instances create disease-community-db-prod \
    --database-version=POSTGRES_15 \
    --tier=db-n1-standard-1 \
    --region=asia-northeast1 \
    --root-password=prod-password \
    --storage-type=SSD \
    --storage-size=20GB \
    --availability-type=REGIONAL
```

## 🔒 セキュリティ設定

### 1. パスワードの強度

- 最低12文字以上
- 大文字、小文字、数字、記号を含む
- 辞書に載っている単語は避ける

### 2. ネットワークアクセス制御

```bash
# 特定のIPアドレスのみアクセス許可
gcloud sql instances patch disease-community-db \
    --authorized-networks=YOUR_IP_ADDRESS
```

### 3. SSL接続の強制

```bash
# SSL接続を強制
gcloud sql instances patch disease-community-db \
    --require-ssl
```

## 📝 次のステップ

1. データベースの初期化スクリプトの作成
2. マイグレーションスクリプトの設定
3. バックアップ戦略の策定
4. 監視とアラートの設定

## 📚 参考資料

- [Cloud SQL PostgreSQL ドキュメント](https://cloud.google.com/sql/docs/postgres)
- [Cloud SQL 接続方法](https://cloud.google.com/sql/docs/postgres/connect-overview)
- [Cloud SQL セキュリティ](https://cloud.google.com/sql/docs/postgres/security)
