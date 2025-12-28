# Google Cloud Storage 画像アップロード機能のセットアップガイド

このドキュメントでは、Google Cloud Storage (GCS) を使用した画像アップロード機能のセットアップ方法を説明します。

## 概要

画像アップロード機能により、ユーザーは投稿に画像を直接アップロードできます。画像は自動的にリサイズ・最適化され、GCSに保存されます。

## 前提条件

- Google Cloud Platform (GCP) アカウント
- GCPプロジェクトの作成済み
- Google Cloud Storage の使用可能

## セットアップ手順

### 1. GCSバケットの作成

1. [Google Cloud Console](https://console.cloud.google.com/) にログイン
2. プロジェクトを選択
3. 「Cloud Storage」→「バケット」に移動
4. 「バケットを作成」をクリック
5. バケット名を入力（例: `disease-community-images`）
6. リージョンを選択（例: `asia-northeast1`）
7. ストレージクラスを選択（例: `Standard`）
8. アクセス制御を「均一」に設定
9. 「作成」をクリック

### 2. バケットの公開設定

1. 作成したバケットをクリック
2. 「権限」タブを開く
3. 「一般公開アクセスを許可」を有効化（画像を公開する場合）
   - または、認証済みユーザーのみアクセス可能にする設定も可能

### 3. サービスアカウントの作成と認証情報の取得

1. 「IAMと管理」→「サービスアカウント」に移動
2. 「サービスアカウントを作成」をクリック
3. サービスアカウント名を入力（例: `image-upload-service`）
4. 「作成して続行」をクリック
5. ロールを追加:
   - `Storage Object Admin` (画像のアップロード・削除)
   - `Storage Object Viewer` (画像の読み取り)
6. 「完了」をクリック
7. 作成したサービスアカウントをクリック
8. 「キー」タブを開く
9. 「キーを追加」→「新しいキーを作成」を選択
10. キーのタイプを「JSON」に選択
11. 「作成」をクリック（JSONファイルがダウンロードされます）

### 4. 環境変数の設定

#### 開発環境（`.env`）

バックエンドの`.env`ファイルに以下を追加:

```env
# Google Cloud Storage
GCS_BUCKET_NAME=disease-community-images
GCS_PROJECT_ID=your-project-id

# サービスアカウント認証情報（JSONファイルのパス）
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

または、サービスアカウントキーの内容を環境変数として設定:

```env
GCS_BUCKET_NAME=disease-community-images
GCS_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}
```

#### 本番環境（Cloud Run）

Google Cloud Consoleで環境変数を設定:

1. Cloud Runサービスのページに移動
2. 「編集と新しいリビジョンをデプロイ」をクリック
3. 「変数とシークレット」タブを開く
4. 以下の環境変数を追加:
   - `GCS_BUCKET_NAME`: バケット名
   - `GCS_PROJECT_ID`: プロジェクトID
   - `GOOGLE_APPLICATION_CREDENTIALS`: サービスアカウントキーのJSONファイルのパス

または、Cloud Runのデフォルトサービスアカウントに権限を付与:

1. Cloud Runサービスの「セキュリティ」タブを開く
2. サービスアカウントに `Storage Object Admin` ロールを付与

### 5. 依存関係のインストール

バックエンドの依存関係をインストール:

```bash
cd backend
pip install -r requirements.txt
```

必要なパッケージ:
- `google-cloud-storage==2.14.0`
- `Pillow==10.4.0`

## APIエンドポイント

### 単一画像アップロード

```
POST /api/v1/images/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- file: <image file>
```

**レスポンス:**
```json
{
  "url": "https://storage.googleapis.com/bucket-name/posts/uuid.jpg",
  "message": "Image uploaded successfully"
}
```

### 複数画像アップロード（最大5枚）

```
POST /api/v1/images/upload-multiple
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- files: <image file 1>
- files: <image file 2>
- ...
```

**レスポンス:**
```json
{
  "urls": [
    "https://storage.googleapis.com/bucket-name/posts/uuid1.jpg",
    "https://storage.googleapis.com/bucket-name/posts/uuid2.jpg"
  ],
  "errors": null,
  "message": "Successfully uploaded 2 image(s)"
}
```

### 画像削除

```
DELETE /api/v1/images/delete?image_url=<image_url>
Authorization: Bearer <token>
```

## 画像の仕様

### 対応形式
- JPEG/JPG
- PNG
- GIF
- WebP

### サイズ制限
- 最大ファイルサイズ: 10MB
- アップロード後の最大サイズ: 1920x1920ピクセル（自動リサイズ）
- 品質: 85%（JPEG）

### 保存場所
- フォルダ: `posts/`
- ファイル名: UUID形式（例: `550e8400-e29b-41d4-a716-446655440000.jpg`）

## トラブルシューティング

### エラー: "Image upload service is not configured"

**原因**: 環境変数が設定されていない

**解決策**:
1. `GCS_BUCKET_NAME` と `GCS_PROJECT_ID` が設定されているか確認
2. サービスアカウントの認証情報が正しく設定されているか確認

### エラー: "Failed to upload image to storage"

**原因**: GCSへのアクセス権限がない

**解決策**:
1. サービスアカウントに適切なロールが付与されているか確認
2. バケットのアクセス制御設定を確認

### エラー: "Invalid file type"

**原因**: サポートされていない画像形式

**解決策**: JPEG、PNG、GIF、WebP形式の画像を使用

### エラー: "File size exceeds maximum allowed size"

**原因**: ファイルサイズが10MBを超えている

**解決策**: 画像を圧縮するか、サイズを小さくする

## セキュリティ考慮事項

1. **認証**: すべてのアップロードエンドポイントは認証が必要
2. **ファイル検証**: ファイルタイプとサイズの検証を実装
3. **公開設定**: バケットの公開設定を適切に管理
4. **CORS**: 必要に応じてCORS設定を追加

## コスト最適化

1. **画像リサイズ**: 自動リサイズによりストレージ使用量を削減
2. **ライフサイクル管理**: 古い画像の自動削除ポリシーを設定可能
3. **ストレージクラス**: 使用頻度に応じてストレージクラスを選択

## 参考リンク

- [Google Cloud Storage ドキュメント](https://cloud.google.com/storage/docs)
- [Python Client Library](https://cloud.google.com/storage/docs/reference/libraries#client-libraries)
- [Pillow ドキュメント](https://pillow.readthedocs.io/)

