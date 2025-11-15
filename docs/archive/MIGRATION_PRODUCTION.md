# 本番環境データベースマイグレーション手順

このドキュメントでは、本番環境のデータベースマイグレーションを実行する手順を説明します。

## 前提条件

- gcloud CLIがインストールされていること
- GCPプロジェクト `circles-202510` への管理者アクセス権があること
- 本番データベースのURLが設定されていること

## マイグレーション手順

### 1. gcloud認証

```bash
gcloud auth login
gcloud config set project circles-202510
```

### 2. データベースURLの取得

GCP Cloud Runのシークレットまたは環境変数から本番データベースURLを取得します：

```bash
# Cloud Runサービスの環境変数を確認
gcloud run services describe disease-community-api \
  --region asia-northeast1 \
  --format="value(spec.template.spec.containers[0].env)"
```

### 3. Cloud Run Jobsでマイグレーション実行

#### オプションA: 既存のジョブを使用（推奨）

既存のマイグレーションジョブがある場合：

```bash
# ジョブ一覧を確認
gcloud run jobs list --region asia-northeast1

# マイグレーションジョブを実行
gcloud run jobs execute db-migration-job --region asia-northeast1 --wait
```

#### オプションB: 新しいジョブを作成

```bash
# 環境変数を設定（実際のDATABASE_URLに置き換えてください）
export DATABASE_URL="postgresql://user:password@/database?host=/cloudsql/circles-202510:asia-northeast1:disease-community-db"

# Cloud Run Jobを作成
gcloud run jobs create post-migration-job \
  --image gcr.io/circles-202510/disease-community-api:latest \
  --region asia-northeast1 \
  --set-env-vars="ENVIRONMENT=production,DATABASE_URL=$DATABASE_URL" \
  --add-cloudsql-instances=circles-202510:asia-northeast1:disease-community-db \
  --command="alembic,upgrade,head" \
  --max-retries=0 \
  --task-timeout=600 \
  --memory=1Gi \
  --cpu=1

# ジョブを実行
gcloud run jobs execute post-migration-job --region asia-northeast1 --wait
```

### 4. マイグレーション結果の確認

```bash
# ジョブの実行ログを確認
gcloud run jobs executions describe [EXECUTION_NAME] \
  --region asia-northeast1 \
  --format="value(status.logUri)"

# または、Cloud Loggingで確認
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=post-migration-job" \
  --limit 50 \
  --format json
```

### 5. マイグレーション状態の確認

Cloud Runサービスのコンテナに接続して確認：

```bash
# 一時的なCloud Runジョブで確認
gcloud run jobs create check-migration \
  --image gcr.io/circles-202510/disease-community-api:latest \
  --region asia-northeast1 \
  --set-env-vars="ENVIRONMENT=production,DATABASE_URL=$DATABASE_URL" \
  --add-cloudsql-instances=circles-202510:asia-northeast1:disease-community-db \
  --command="alembic,current" \
  --max-retries=0 \
  --task-timeout=60

gcloud run jobs execute check-migration --region asia-northeast1 --wait
```

## トラブルシューティング

### エラー: "Cloud SQL connection failed"

1. Cloud SQLインスタンスが起動しているか確認
2. Cloud Run Jobsに適切なCloud SQL接続設定があるか確認
3. サービスアカウントにCloud SQL Client権限があるか確認

### エラー: "Alembic version mismatch"

1. バックエンドイメージが最新版であることを確認
2. ローカル環境とのAlembicバージョンの差異を確認

### ロールバックが必要な場合

```bash
# 特定のマイグレーションバージョンにダウングレード
gcloud run jobs create rollback-migration \
  --image gcr.io/circles-202510/disease-community-api:latest \
  --region asia-northeast1 \
  --set-env-vars="ENVIRONMENT=production,DATABASE_URL=$DATABASE_URL" \
  --add-cloudsql-instances=circles-202510:asia-northeast1:disease-community-db \
  --command="alembic,downgrade,[REVISION_ID]" \
  --max-retries=0 \
  --task-timeout=600

gcloud run jobs execute rollback-migration --region asia-northeast1 --wait
```

## 2025-11-09: 投稿機能マイグレーション

### マイグレーション内容

- `add_post_tables_20251109`: 投稿、いいね、コメント機能のテーブル作成
  - `posts` テーブル
  - `post_likes` テーブル
  - `post_comments` テーブル

### 実行コマンド

```bash
# 上記の手順でマイグレーションを実行
# マイグレーションファイル: backend/alembic/versions/add_post_tables_20251109.py
```

### 検証

マイグレーション後、以下のテーブルが存在することを確認：

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('posts', 'post_likes', 'post_comments');
```

## 参考リンク

- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [Cloud Run Jobs Documentation](https://cloud.google.com/run/docs/create-jobs)
- [Cloud SQL Proxy Connection](https://cloud.google.com/sql/docs/postgres/connect-instance-cloud-run)
