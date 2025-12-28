# Cloud Run デバッグガイド

## 現在の問題

```
ERROR: (gcloud.run.deploy) Revision 'disease-community-api-00006-5pb' is not ready and cannot serve traffic. 
The user-provided container failed to start and listen on the port defined provided by the PORT=8080 environment variable within the allocated timeout.
```

## ローカルテスト結果

✅ **ローカルでは正常に動作**
- Dockerイメージのビルド成功
- コンテナがポート8080で正常に起動
- ヘルスチェックエンドポイントが正常に応答

## 問題の原因候補

### 1. データベース接続エラー（最も可能性が高い）

Cloud Runでアプリケーションが起動時にデータベースに接続しようとして失敗している可能性があります。

#### 確認方法：
1. Google Cloud Console → Cloud Run → disease-community-api
2. 「ログ」タブをクリック
3. 以下のようなエラーメッセージを確認：
   - `connection refused`
   - `database "xxx" does not exist`
   - `authentication failed`
   - `timeout`

#### 解決策：
- **DATABASE_URL** 環境変数が正しく設定されているか確認
- Cloud SQLプロキシの設定を確認
- ネットワーク設定（VPCコネクタ）を確認

### 2. 環境変数の不足

アプリケーションが起動時に必要な環境変数が設定されていない可能性があります。

#### 確認すべき環境変数：
- `DATABASE_URL`: データベース接続文字列
- `ENVIRONMENT`: production/development
- `SECRET_KEY`: アプリケーションのシークレットキー（必要な場合）

### 3. 起動時間が長すぎる

アプリケーションの起動に時間がかかりすぎて、Cloud Runのタイムアウト（現在600秒）を超えている可能性があります。

#### 確認方法：
ログで起動時間を確認：
- `Starting server on port 8080`
- `INFO: Started server process`
- `INFO: Application startup complete.`

### 4. ヘルスチェックの失敗

Cloud Runがヘルスチェックエンドポイント（`/health`）にアクセスできない可能性があります。

## デバッグ手順

### 手順1: Google Cloud Consoleでログを確認

1. **Google Cloud Console** にアクセス
   - https://console.cloud.google.com/run?project=circles-202510

2. **disease-community-api** サービスをクリック

3. **ログ** タブをクリック

4. 最新のリビジョンのログを確認
   - エラーメッセージを探す
   - 起動時間を確認
   - データベース接続のエラーを確認

### 手順2: 環境変数を確認

1. **disease-community-api** サービスページ
2. **変数とシークレット** タブをクリック
3. 以下の環境変数が設定されているか確認：
   - `DATABASE_URL`
   - `ENVIRONMENT`
   - その他必要な変数

### 手順3: データベース接続を確認

1. **Cloud SQL** → インスタンスを選択
2. **接続** タブで以下を確認：
   - パブリックIPアドレス
   - プライベートIPアドレス
   - 承認されたネットワーク
   - Cloud SQLプロキシ設定

### 手順4: ネットワーク設定を確認

Cloud Runからデータベースへの接続方法：

#### オプションA: Cloud SQL Connector（推奨）
```yaml
--add-cloudsql-instances=PROJECT_ID:REGION:INSTANCE_NAME
```

#### オプションB: VPC Connector
```yaml
--vpc-connector=VPC_CONNECTOR_NAME
```

#### オプションC: パブリックIP（本番環境では非推奨）
- データベースのパブリックIPを使用
- Cloud RunのIPアドレスを承認されたネットワークに追加

## 最も可能性の高い問題と解決策

### 問題: データベース接続エラー

現在のデプロイメントコマンドを確認すると、**Cloud SQL接続の設定がない**ことがわかります。

#### 現在のデプロイメントコマンド：
```bash
gcloud run deploy disease-community-api \
  --image gcr.io/circles-202510/disease-community-api:xxx \
  --platform managed \
  --region asia-northeast1 \
  --port 8080 \
  --timeout 600 \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10 \
  --allow-unauthenticated \
  --set-env-vars="ENVIRONMENT=production,DATABASE_URL=${{ secrets.DATABASE_URL }}"
```

#### 必要な修正：
```bash
gcloud run deploy disease-community-api \
  --image gcr.io/circles-202510/disease-community-api:xxx \
  --platform managed \
  --region asia-northeast1 \
  --port 8080 \
  --timeout 600 \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10 \
  --allow-unauthenticated \
  --set-env-vars="ENVIRONMENT=production,DATABASE_URL=${{ secrets.DATABASE_URL }}" \
  --add-cloudsql-instances=circles-202510:asia-northeast1:YOUR_INSTANCE_NAME  # 追加
```

## 次のステップ

1. **Google Cloud Consoleでログを確認**して、具体的なエラーメッセージを特定
2. **データベース接続設定**を追加
3. **環境変数**を確認
4. 再デプロイして結果を確認

## 参考リンク

- [Cloud Run - Cloud SQL接続](https://cloud.google.com/run/docs/configuring/connect-cloudsql)
- [Cloud Run - トラブルシューティング](https://cloud.google.com/run/docs/troubleshooting)
- [Cloud Run - ログの表示](https://cloud.google.com/run/docs/logging)

