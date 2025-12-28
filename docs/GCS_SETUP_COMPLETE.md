# GCS画像アップロード機能のセットアップ完了確認

## ✅ 完了した設定

### 1. Secret Manager設定
- ✅ シークレット名: `gcs-service-account-key`
- ✅ Cloud Runサービスにマウント済み
- ✅ サービスアカウント: `image-upload-service@circles-202510.iam.gserviceaccount.com`

### 2. 環境変数設定
- ✅ `GCS_BUCKET_NAME`: `disease-community-images`
- ✅ `GCS_PROJECT_ID`: `circles-202510`
- ✅ `GOOGLE_APPLICATION_CREDENTIALS`: Secret Managerから取得

### 3. 権限設定
- ✅ Cloud Runデフォルトサービスアカウント (`508246122017-compute@developer.gserviceaccount.com`)
  - `roles/secretmanager.secretAccessor` - Secret Managerアクセス
  - `roles/storage.objectAdmin` - GCS読み書き
- ✅ 画像アップロードサービスアカウント (`image-upload-service@circles-202510.iam.gserviceaccount.com`)
  - `roles/storage.objectAdmin` - GCS読み書き
  - `roles/storage.objectViewer` - GCS読み取り

### 4. GCSバケット
- ✅ バケット名: `disease-community-images`
- ✅ プロジェクト: `circles-202510`
- ✅ 存在確認済み

## 📋 動作確認手順

### 1. APIヘルスチェック

```bash
curl https://disease-community-api-508246122017.asia-northeast1.run.app/health
```

期待されるレスポンス:
```json
{"status":"healthy","environment":"production","service":"disease-community-api",...}
```

### 2. 画像アップロードAPIエンドポイントの確認

APIドキュメントを確認:
```
https://disease-community-api-508246122017.asia-northeast1.run.app/docs
```

`POST /api/v1/images/upload` エンドポイントが表示されていることを確認。

### 3. フロントエンドからのテスト

1. フロントエンドにログイン
2. フィードページまたは投稿作成ページに移動
3. 「画像をアップロード」ボタンをクリック
4. 画像ファイルを選択（JPEG、PNG、GIF、WebP、最大10MB）
5. アップロードが成功し、プレビューが表示されることを確認
6. 投稿を作成し、画像が表示されることを確認

### 4. ログの確認

```bash
# 最新のログを確認
gcloud run services logs read disease-community-api \
  --region=asia-northeast1 \
  --limit=50

# GCS関連のログをフィルタ
gcloud run services logs read disease-community-api \
  --region=asia-northeast1 \
  --limit=100 \
  --format="value(textPayload)" \
  | grep -i "gcs\|storage\|image"
```

期待されるログ:
- `GCS Storage service initialized with bucket: disease-community-images`
- `Image uploaded successfully: https://storage.googleapis.com/...`

## 🔍 トラブルシューティング

### エラー: "Image upload service is not configured"

**確認事項:**
1. 環境変数が設定されているか:
   ```bash
   gcloud run services describe disease-community-api \
     --region=asia-northeast1 \
     --format="value(spec.template.spec.containers[0].env)"
   ```

2. Secret Managerのシークレットがマウントされているか:
   ```bash
   gcloud run services describe disease-community-api \
     --region=asia-northeast1 \
     --format="value(spec.template.spec.containers[0].env[6].valueFrom.secretKeyRef.name)"
   ```
   期待値: `gcs-service-account-key`

### エラー: "Failed to initialize GCS client"

**確認事項:**
1. Secret Managerのシークレットが正しく設定されているか
2. サービスアカウントに権限があるか
3. バケット名が正しいか

### エラー: "Permission denied"

**解決策:**
```bash
# サービスアカウントに権限を付与
gcloud projects add-iam-policy-binding 508246122017 \
  --member="serviceAccount:508246122017-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

## 📝 次のステップ

1. ✅ **設定完了** - すべての設定が完了しました
2. ⏳ **動作確認** - フロントエンドから画像アップロードをテスト
3. ⏳ **監視設定** - エラーログの監視とアラート設定（オプション）
4. ⏳ **パフォーマンス最適化** - 必要に応じて画像リサイズ設定の調整

## 🔗 関連ドキュメント

- `docs/GCS_IMAGE_UPLOAD_SETUP.md` - セットアップガイド
- `docs/GCS_ENVIRONMENT_SETUP.md` - 環境変数設定ガイド
- `docs/SECRET_MANAGEMENT_SECURITY.md` - セキュリティガイド

## 📊 現在の設定サマリー

| 項目 | 値 |
|------|-----|
| バケット名 | `disease-community-images` |
| プロジェクトID | `circles-202510` |
| 認証方法 | Secret Manager |
| シークレット名 | `gcs-service-account-key` |
| サービスアカウント | `image-upload-service@circles-202510.iam.gserviceaccount.com` |
| Cloud Runサービス | `disease-community-api` |
| リージョン | `asia-northeast1` |

