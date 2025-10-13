# Cloud Runログ確認手順

## 最も早い方法：Google Cloud Consoleで直接確認

### 手順

1. **Cloud Runサービスページにアクセス**
   ```
   https://console.cloud.google.com/run?project=circles-202510
   ```

2. **disease-community-api** サービスをクリック

3. **ログ** タブをクリック

4. 以下のフィルターを使用してエラーを探す：
   - 重大度: ERROR
   - 時間範囲: 過去1時間

### 確認すべきエラーメッセージ

以下のようなエラーメッセージを探してください：

#### データベース接続エラー（最も可能性が高い）
```
connection refused
could not connect to server
timeout
authentication failed
FATAL: database "xxx" does not exist
```

#### 環境変数エラー
```
KeyError: 'DATABASE_URL'
environment variable not set
```

#### ポート関連エラー
```
failed to start and listen on port
Port 8080 is already in use
```

## 代替方法：GitHub Actionsの実行結果を確認

最新のCI/CDワークフロー実行結果からもログを確認できます：

1. https://github.com/dev-mmiy/circles0/actions にアクセス
2. 最新の失敗した「Continuous Integration & Deployment」をクリック
3. 「Deploy to Cloud Run」ステップを開く
4. エラーメッセージを確認

## 次のステップ

エラーメッセージがわかったら、以下のいずれかの対応が必要です：

### 1. Cloud SQL接続の追加
```yaml
--add-cloudsql-instances=circles-202510:asia-northeast1:INSTANCE_NAME
```

### 2. 環境変数の追加・修正
```yaml
--set-env-vars="ENVIRONMENT=production,DATABASE_URL=xxx,OTHER_VAR=yyy"
```

### 3. ネットワーク設定の調整
```yaml
--vpc-connector=VPC_CONNECTOR_NAME
```

