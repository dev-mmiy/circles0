# 本番環境のGCS設定ガイド

## 問題

iPhoneから本番環境にアクセスして画像をアップロードしようとすると、「画像アップロードサービスが設定されていません」というエラーが表示されます。

## 原因

ログを確認した結果、以下の問題が確認されました：

1. **`GOOGLE_APPLICATION_CREDENTIALS`環境変数が設定されているが、ファイルが存在しない**
   - ログに「Failed to initialize GCS client: File {」というエラーが表示されています
   - Cloud Runでは、サービスアカウントキーファイルを使うのではなく、デフォルトサービスアカウントにIAM権限を付与する方法が推奨されます

2. **サービスアカウントにGCSへのアクセス権限が不足している可能性**

## 確認方法

### 1. 環境変数の確認

以下のスクリプトを実行して、本番環境のGCS設定を確認します：

```bash
./scripts/check-production-gcs-config.sh
```

または、直接gcloudコマンドで確認：

```bash
gcloud run services describe disease-community-api \
  --region=asia-northeast1 \
  --project=circles-202510 \
  --format="table(spec.template.spec.containers[0].env.name,spec.template.spec.containers[0].env.value)" | \
  grep -E "GCS_|GOOGLE_APPLICATION"
```

### 2. ログの確認

GCS関連のエラーログを確認：

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=disease-community-api AND (textPayload:\"GCS\" OR textPayload:\"storage\" OR textPayload:\"503\")" \
  --limit=20 \
  --format="table(timestamp,severity,textPayload)" \
  --project=circles-202510
```

## 解決方法

### 自動修正スクリプト（推奨）

以下のスクリプトを実行すると、すべての設定を自動的に修正します：

```bash
./scripts/fix-production-gcs.sh
```

このスクリプトは以下を実行します：
1. `GOOGLE_APPLICATION_CREDENTIALS`環境変数を削除
2. `GCS_BUCKET_NAME`と`GCS_PROJECT_ID`環境変数を設定
3. サービスアカウントにGCSへのアクセス権限を付与
4. バケットへのアクセス権限を確認

### 手動での修正方法

#### ステップ1: GOOGLE_APPLICATION_CREDENTIALS環境変数を削除

Cloud Runでは、サービスアカウントキーファイルを使わず、デフォルトサービスアカウントを使用します：

```bash
gcloud run services update disease-community-api \
  --region=asia-northeast1 \
  --project=circles-202510 \
  --remove-env-vars="GOOGLE_APPLICATION_CREDENTIALS"
```

#### ステップ2: GCS環境変数を設定

```bash
gcloud run services update disease-community-api \
  --region=asia-northeast1 \
  --project=circles-202510 \
  --update-env-vars="GCS_BUCKET_NAME=disease-community-images,GCS_PROJECT_ID=circles-202510"
```

### ステップ2: サービスアカウントの権限確認

Cloud RunのサービスアカウントにGCSへのアクセス権限が必要です。

#### 現在のサービスアカウントを確認

```bash
gcloud run services describe disease-community-api \
  --region=asia-northeast1 \
  --project=circles-202510 \
  --format="value(spec.template.spec.serviceAccountName)"
```

#### 権限を付与

```bash
# サービスアカウント名を取得
SERVICE_ACCOUNT=$(gcloud run services describe disease-community-api \
  --region=asia-northeast1 \
  --project=circles-202510 \
  --format="value(spec.template.spec.serviceAccountName)")

# デフォルトサービスアカウントを使用している場合
if [ -z "$SERVICE_ACCOUNT" ]; then
  SERVICE_ACCOUNT="${PROJECT_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
fi

# Storage Object Admin ロールを付与
gcloud projects add-iam-policy-binding circles-202510 \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.objectAdmin"
```

または、バケットレベルで権限を付与：

```bash
# バケットへのアクセス権限を付与
gsutil iam ch serviceAccount:${SERVICE_ACCOUNT}:roles/storage.objectAdmin \
  gs://disease-community-images
```

### ステップ3: 設定の確認

設定が正しく反映されているか確認：

```bash
./scripts/check-production-gcs-config.sh
```

### ステップ4: 動作確認

1. サービスが再起動するまで1-2分待つ
2. iPhoneから画像アップロードを試す
3. エラーが解消されているか確認

## トラブルシューティング

### エラー: "Image upload service is not configured"

**原因**: `storage_service.is_available()`が`False`を返している

**確認項目**:
1. `GCS_BUCKET_NAME`環境変数が設定されているか
2. `GCS_PROJECT_ID`環境変数が設定されているか
3. サービスアカウントにGCSへのアクセス権限があるか
4. バケットが存在するか

### エラー: "Failed to initialize GCS client"

**原因**: GCSクライアントの初期化に失敗

**確認項目**:
1. サービスアカウントの権限
2. プロジェクトIDが正しいか
3. バケット名が正しいか

### エラー: "Bucket does not exist"

**原因**: 指定されたバケットが存在しない

**確認方法**:
```bash
gsutil ls gs://disease-community-images
```

**解決方法**: バケットを作成するか、正しいバケット名を設定

## 参考情報

- [Cloud Run環境変数の設定](https://cloud.google.com/run/docs/configuring/environment-variables)
- [Cloud Runサービスアカウントの設定](https://cloud.google.com/run/docs/configuring/service-accounts)
- [GCS IAM権限](https://cloud.google.com/storage/docs/access-control/iam-roles)

