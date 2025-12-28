# GCS画像アップロード機能 - 動作確認チェックリスト

## ✅ 設定確認（完了済み）

- [x] Secret Managerシークレット作成済み (`gcs-service-account-key`)
- [x] Cloud Runサービスにシークレットマウント済み
- [x] 環境変数設定済み (`GCS_BUCKET_NAME`, `GCS_PROJECT_ID`)
- [x] サービスアカウント権限設定済み
- [x] GCSバケット存在確認済み (`disease-community-images`)

## 🧪 動作確認手順

### 1. APIエンドポイントの確認

```bash
# APIドキュメントを開く
open https://disease-community-api-508246122017.asia-northeast1.run.app/docs

# または curlで確認
curl https://disease-community-api-508246122017.asia-northeast1.run.app/docs
```

**確認項目:**
- [ ] `POST /api/v1/images/upload` エンドポイントが表示されている
- [ ] `POST /api/v1/images/upload-multiple` エンドポイントが表示されている
- [ ] `DELETE /api/v1/images/delete` エンドポイントが表示されている

### 2. フロントエンドからの画像アップロードテスト

1. **フロントエンドにアクセス**
   ```
   https://disease-community-frontend-508246122017.asia-northeast1.run.app
   ```

2. **ログイン**
   - Auth0でログイン

3. **フィードページに移動**
   - ナビゲーションから「フィード」をクリック

4. **画像アップロードをテスト**
   - [ ] 「画像をアップロード」ボタンが表示される
   - [ ] ファイル選択ダイアログが開く
   - [ ] JPEG/PNG/GIF/WebPファイルを選択できる
   - [ ] 画像プレビューが表示される
   - [ ] アップロード進捗が表示される（「アップロード中...」）
   - [ ] アップロード完了後、プレビューが更新される
   - [ ] 最大5枚までアップロードできる
   - [ ] 10MB以上のファイルでエラーが表示される
   - [ ] サポートされていない形式でエラーが表示される

5. **投稿作成をテスト**
   - [ ] 画像付きで投稿を作成できる
   - [ ] 投稿一覧で画像が表示される
   - [ ] 画像をクリックすると新しいタブで開く
   - [ ] 複数画像がグリッドレイアウトで表示される

### 3. GCSバケットの確認

```bash
# アップロードされた画像を確認
gsutil ls gs://disease-community-images/posts/

# 画像の詳細を確認
gsutil ls -lh gs://disease-community-images/posts/ | head -10
```

**確認項目:**
- [ ] `posts/`フォルダに画像がアップロードされている
- [ ] ファイル名がUUID形式になっている
- [ ] ファイルサイズが適切（リサイズされている）

### 4. ログの確認

```bash
# 最新のログを確認
gcloud run services logs read disease-community-api \
  --region=asia-northeast1 \
  --limit=50

# GCS関連のログを確認
gcloud run services logs read disease-community-api \
  --region=asia-northeast1 \
  --limit=100 \
  --format="value(textPayload)" \
  | grep -i "gcs\|storage\|image\|upload"
```

**期待されるログ:**
- `GCS Storage service initialized with bucket: disease-community-images`
- `Image uploaded successfully: https://storage.googleapis.com/...`
- `Push notification sent successfully...` (通知機能が動作している場合)

### 5. エラーハンドリングの確認

**テストケース:**
- [ ] 10MBを超えるファイルでエラーメッセージが表示される
- [ ] サポートされていない形式（例: PDF）でエラーメッセージが表示される
- [ ] ネットワークエラー時に適切なエラーメッセージが表示される
- [ ] 認証エラー時に適切なエラーメッセージが表示される

## 🔧 トラブルシューティング

### 問題: 画像がアップロードされない

**確認事項:**
1. ブラウザのコンソールでエラーを確認
2. ネットワークタブでAPIリクエストを確認
3. Cloud Runのログでエラーを確認

**よくある原因:**
- CORS設定の問題
- 認証トークンの問題
- GCS権限の問題

### 問題: 画像が表示されない

**確認事項:**
1. GCSバケットの公開設定
2. 画像URLが正しく生成されているか
3. ブラウザのコンソールでエラーを確認

## 📊 パフォーマンス確認

- [ ] 画像アップロード時間が適切（10MB未満で5秒以内）
- [ ] 画像リサイズが正しく動作している（1920x1920以下）
- [ ] 複数画像の同時アップロードが動作している

## ✅ 完了基準

すべてのチェック項目が完了したら、GCS画像アップロード機能は正常に動作しています。

## 📝 次のステップ

1. ✅ **設定完了** - 完了
2. ⏳ **動作確認** - 上記チェックリストを実行
3. ⏳ **監視設定** - エラーログの監視とアラート設定（オプション）
4. ⏳ **パフォーマンス最適化** - 必要に応じて調整

