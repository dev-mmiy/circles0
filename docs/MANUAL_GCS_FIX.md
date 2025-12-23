# 本番環境GCS設定の手動修正手順

## 問題の詳細

`GOOGLE_APPLICATION_CREDENTIALS`が環境変数ではなく、**Secret Manager**から参照されています：

```
'valueFrom': {'secretKeyRef': {'key': 'latest', 'name': 'gcs-service-account-key'}}
```

このSecret参照を削除する必要があります。

## 手動修正手順

### ステップ1: Secret参照を削除

以下のコマンドで、Secret参照を削除します：

```bash
gcloud run services update disease-community-api \
  --region=asia-northeast1 \
  --project=circles-202510 \
  --remove-secrets="GOOGLE_APPLICATION_CREDENTIALS"
```

### ステップ2: GCS環境変数を確認

以下のコマンドで、GCS環境変数が正しく設定されているか確認：

```bash
gcloud run services describe disease-community-api \
  --region=asia-northeast1 \
  --project=circles-202510 \
  --format="table(spec.template.spec.containers[0].env.name,spec.template.spec.containers[0].env.value)" | \
  grep -E "GCS_"
```

以下のように表示されればOK：
```
GCS_BUCKET_NAME  disease-community-images
GCS_PROJECT_ID   circles-202510
```

### ステップ3: サービスアカウントの権限を確認

サービスアカウントにGCSへのアクセス権限があるか確認：

```bash
# サービスアカウント名を取得
SERVICE_ACCOUNT=$(gcloud run services describe disease-community-api \
  --region=asia-northeast1 \
  --project=circles-202510 \
  --format="value(spec.template.spec.serviceAccountName)")

# デフォルトサービスアカウントを使用している場合
if [ -z "$SERVICE_ACCOUNT" ]; then
  SERVICE_ACCOUNT="508246122017-compute@developer.gserviceaccount.com"
fi

echo "サービスアカウント: $SERVICE_ACCOUNT"

# 権限を確認
gcloud projects get-iam-policy circles-202510 \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${SERVICE_ACCOUNT}" \
  --format="table(bindings.role)"
```

`roles/storage.objectAdmin` または `roles/storage.admin` が表示されればOKです。

### ステップ4: 権限を付与（必要に応じて）

権限が不足している場合は、以下のコマンドで付与：

```bash
gcloud projects add-iam-policy-binding circles-202510 \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.objectAdmin"
```

### ステップ5: 設定の確認

1. サービスが再起動するまで1-2分待つ
2. ログを確認：

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=disease-community-api AND textPayload:\"GCS Storage service initialized\"" \
  --limit=5 \
  --format="table(timestamp,severity,textPayload)" \
  --project=circles-202510 \
  --freshness=5m
```

「GCS Storage service initialized with bucket: disease-community-images」というメッセージが表示されれば成功です。

### ステップ6: 動作確認

iPhoneから画像アップロードを試して、エラーが解消されているか確認してください。

## トラブルシューティング

### Secretが存在しない場合

Secret Managerに `gcs-service-account-key` が存在しない場合、エラーが発生します。この場合は、Secret参照を削除するだけで問題ありません。

### 権限エラーが発生する場合

サービスアカウントに適切な権限が付与されているか確認してください。上記のステップ3と4を実行してください。

### まだエラーが発生する場合

最新のログを確認：

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=disease-community-api AND severity>=ERROR" \
  --limit=20 \
  --format="table(timestamp,severity,textPayload)" \
  --project=circles-202510 \
  --freshness=10m
```





