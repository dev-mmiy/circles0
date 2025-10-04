# Cloud SQL インスタンス再起動手順

Cloud SQLインスタンスが停止している場合の再起動とデータベース作成手順です。

## 🔄 インスタンスの状態確認と再起動

### 1. インスタンスの状態確認

```bash
# インスタンスの状態を確認
gcloud sql instances describe disease-community-db \
    --format="value(state)"

# 出力例: RUNNABLE, STOPPED, SUSPENDED など
```

### 2. インスタンスの再起動

```bash
# インスタンスを再起動
gcloud sql instances patch disease-community-db \
    --activation-policy=ALWAYS

# または、停止している場合は開始
gcloud sql instances start disease-community-db
```

### 3. 再起動の確認

```bash
# インスタンスの状態を再確認
gcloud sql instances describe disease-community-db \
    --format="value(state)"

# RUNNABLE になるまで待機（通常1-2分）
```

## 🗄️ データベースの作成

### 1. 開発環境用データベースの作成

```bash
# 開発環境用データベース
gcloud sql databases create disease_community_dev \
    --instance=disease-community-db
```

### 2. 本番環境用データベースの作成

```bash
# 本番環境用データベース
gcloud sql databases create disease_community_prod \
    --instance=disease-community-db
```

### 3. データベースの確認

```bash
# 作成されたデータベースの一覧を確認
gcloud sql databases list --instance=disease-community-db
```

## 👤 データベースユーザーの作成

### 1. 開発環境用ユーザー

```bash
# 開発環境用ユーザー
gcloud sql users create dev_user \
    --instance=disease-community-db \
    --password=dev-secure-password
```

### 2. 本番環境用ユーザー

```bash
# 本番環境用ユーザー
gcloud sql users create prod_user \
    --instance=disease-community-db \
    --password=prod-secure-password
```

### 3. ユーザーの確認

```bash
# 作成されたユーザーの一覧を確認
gcloud sql users list --instance=disease-community-db
```

## 🔐 接続情報の取得

### 1. 接続名の取得

```bash
# インスタンスの接続名を取得
gcloud sql instances describe disease-community-db \
    --format="value(connectionName)"

# 出力例: circles-202510:asia-northeast1:disease-community-db
```

### 2. 接続テスト

```bash
# 開発環境データベースに接続テスト
gcloud sql connect disease-community-db \
    --user=dev_user \
    --database=disease_community_dev
```

## 📝 GitHub Secrets の更新

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

## 🚀 設定完了後の確認

### 1. データベース接続テスト

```bash
# 開発環境データベースに接続
gcloud sql connect disease-community-db \
    --user=dev_user \
    --database=disease_community_dev

# 接続後、以下のSQLで確認
\dt  # テーブル一覧
\q   # 終了
```

### 2. CI/CDパイプラインの再実行

1. GitHub Actions → CI/CD Pipeline
2. "Re-run all jobs" をクリック
3. データベース接続エラーが解決されることを確認

## 🔧 トラブルシューティング

### よくある問題

#### 1. インスタンスが起動しない
```bash
# インスタンスの詳細情報を確認
gcloud sql instances describe disease-community-db

# エラーメッセージを確認
gcloud sql operations list --instance=disease-community-db
```

#### 2. データベース作成エラー
```bash
# 既存のデータベースを確認
gcloud sql databases list --instance=disease-community-db

# 既存のデータベースを削除（必要に応じて）
gcloud sql databases delete disease_community_dev \
    --instance=disease-community-db
```

#### 3. ユーザー作成エラー
```bash
# 既存のユーザーを確認
gcloud sql users list --instance=disease-community-db

# 既存のユーザーを削除（必要に応じて）
gcloud sql users delete dev_user \
    --instance=disease-community-db
```

## 📊 コスト最適化

### 開発環境用の設定（コスト削減）

```bash
# 開発環境用インスタンス（停止可能）
gcloud sql instances patch disease-community-db \
    --activation-policy=NEVER

# 必要時に手動で開始
gcloud sql instances start disease-community-db
```

### 本番環境用の設定（高可用性）

```bash
# 本番環境用インスタンス（常時稼働）
gcloud sql instances patch disease-community-db \
    --activation-policy=ALWAYS
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

## 📚 参考資料

- [Cloud SQL PostgreSQL ドキュメント](https://cloud.google.com/sql/docs/postgres)
- [Cloud SQL 接続方法](https://cloud.google.com/sql/docs/postgres/connect-overview)
- [Cloud SQL セキュリティ](https://cloud.google.com/sql/docs/postgres/security)
