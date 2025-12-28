# 本番環境のデータベースタイムアウト問題の修正

## 問題

本番環境でタイムラインのフィードが読めず、タイムアウトエラーが発生しています。

## 原因

ログから以下の問題が確認されました：

1. **データベース接続プールのタイムアウト**
   - SQLAlchemyの接続プールから接続を取得する際にタイムアウトが発生
   - `database.py`に接続プールのタイムアウト設定が不足していた

2. **Cloud SQL接続の問題**
   - Cloud SQLインスタンスへの接続が遅い、または接続プールが枯渇している可能性

## 修正内容

### 1. データベース接続プール設定の追加

`backend/app/database.py`に以下の設定を追加しました：

```python
engine = create_engine(
    DATABASE_URL,
    pool_size=5,  # プール内の接続数
    max_overflow=10,  # pool_sizeを超える最大接続数
    pool_timeout=30,  # プールから接続を取得する際のタイムアウト（秒）
    pool_recycle=3600,  # 接続を1時間後にリサイクル（古い接続を防ぐ）
    pool_pre_ping=True,  # 使用前に接続を検証（古い接続を検出）
    connect_args={
        "connect_timeout": 10,  # PostgreSQL接続タイムアウト（秒）
    },
)
```

### 2. デプロイ

変更をデプロイする必要があります：

```bash
# バックエンドを再デプロイ
./scripts/deploy.sh prod backend
```

または、GitHub Actionsで自動デプロイされる場合は、変更をコミット・プッシュ：

```bash
git add backend/app/database.py
git commit -m "fix: Add database connection pool settings to prevent timeout errors"
git push origin main
```

## 確認方法

### 1. デプロイ後のログ確認

```bash
# データベース接続エラーがないか確認
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=disease-community-api AND (textPayload:\"TimeoutError\" OR textPayload:\"connection\" OR severity>=ERROR)" \
  --limit=20 \
  --format="table(timestamp,severity,textPayload)" \
  --project=circles-202510 \
  --freshness=10m
```

### 2. フィード取得APIのパフォーマンス確認

```bash
# フィード取得の成功ログを確認
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=disease-community-api AND textPayload:\"get_feed\"" \
  --limit=10 \
  --format="table(timestamp,severity,textPayload)" \
  --project=circles-202510 \
  --freshness=10m
```

### 3. 動作確認

iPhoneからタイムラインのフィードを読み込んで、エラーが解消されているか確認してください。

## 追加の最適化（必要に応じて）

### Cloud SQL接続数の確認

```bash
# Cloud SQLインスタンスの接続数を確認
gcloud sql instances describe disease-community-db \
  --project=circles-202510 \
  --format="get(settings.databaseFlags)"
```

### 接続プール設定の調整

もし問題が続く場合は、以下の設定を調整できます：

- `pool_size`: プール内の接続数を増やす（デフォルト: 5）
- `max_overflow`: オーバーフロー接続数を増やす（デフォルト: 10）
- `pool_timeout`: タイムアウト時間を増やす（デフォルト: 30秒）

ただし、Cloud SQLの最大接続数制限に注意してください。

## トラブルシューティング

### まだタイムアウトが発生する場合

1. **Cloud SQLインスタンスの状態を確認**
   ```bash
   gcloud sql instances describe disease-community-db --project=circles-202510
   ```

2. **接続数を確認**
   ```bash
   gcloud sql operations list --instance=disease-community-db --project=circles-202510
   ```

3. **Cloud Runのリソース制限を確認**
   ```bash
   gcloud run services describe disease-community-api \
     --region=asia-northeast1 \
     --project=circles-202510 \
     --format="get(spec.template.spec.containers[0].resources)"
   ```

### パフォーマンスが遅い場合

1. **データベースクエリの最適化**
   - インデックスの確認
   - N+1クエリ問題の確認（既に最適化済み）

2. **Cloud SQLインスタンスのサイズを確認**
   - 必要に応じてインスタンスサイズを増やす

