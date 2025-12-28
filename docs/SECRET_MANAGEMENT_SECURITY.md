# シークレット管理のセキュリティガイド

このドキュメントでは、サービスアカウントキーなどのシークレットを安全に管理する方法について説明します。

## ⚠️ 重要な注意事項

**シークレットをファイルとして配置することは、適切な対策を講じれば開発環境では許容されますが、本番環境では推奨されません。**

## 環境別の推奨方法

### ✅ 開発環境（ローカル開発）

**ファイル配置は許容されますが、以下の対策が必須です：**

#### 必須の対策

1. **`.gitignore`に追加**
   ```bash
   # 既に設定済み
   secrets/
   *service-account*.json
   *.key.json
   .env
   ```

2. **ファイル権限の設定**
   ```bash
   # 所有者のみ読み取り可能にする
   chmod 600 backend/secrets/service-account-key.json
   
   # ディレクトリも保護
   chmod 700 backend/secrets
   ```

3. **安全な場所に配置**
   - ✅ `backend/secrets/`（プロジェクト外）
   - ✅ `~/.config/gcloud/`（ユーザーディレクトリ）
   - ❌ プロジェクトルート直下
   - ❌ 公開リポジトリにコミット

4. **定期的なローテーション**
   - サービスアカウントキーは定期的に再生成
   - 古いキーは無効化

#### 開発環境でのファイル配置のリスク

- ✅ **低リスク**：個人のローカルマシン、適切に保護された場合
- ⚠️ **中リスク**：共有マシン、リモート開発環境
- ❌ **高リスク**：Gitリポジトリにコミット、公開サーバー

### ❌ 本番環境（Cloud Run、本番サーバー）

**ファイル配置は推奨されません。以下の方法を使用してください：**

#### 推奨方法1: Cloud Runのデフォルトサービスアカウント（最推奨）

**メリット：**
- キーファイルの管理が不要
- Cloud Runが自動的に認証を処理
- セキュリティベストプラクティスに準拠
- キーの漏洩リスクがゼロ

**設定方法：**
```bash
# サービスアカウントに権限を付与（一度だけ実行）
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.objectAdmin"
```

**環境変数：**
- `GCS_BUCKET_NAME` のみ設定
- `GCS_PROJECT_ID` のみ設定
- `GOOGLE_APPLICATION_CREDENTIALS` は**設定しない**

#### 推奨方法2: Secret Manager（高度な要件がある場合）

**メリット：**
- キーの暗号化保存
- アクセスログの記録
- バージョン管理
- 自動ローテーション対応

**設定方法：**
```bash
# 1. Secret Managerにシークレットを作成
gcloud secrets create gcs-service-account-key \
  --data-file=/path/to/service-account-key.json \
  --replication-policy="automatic"

# 2. Cloud Runサービスにシークレットをマウント
gcloud run services update disease-community-api \
  --set-secrets="GOOGLE_APPLICATION_CREDENTIALS=gcs-service-account-key:latest" \
  --region=asia-northeast1
```

## セキュリティチェックリスト

### 開発環境

- [ ] `.gitignore`にシークレットファイルが含まれている
- [ ] ファイル権限が600（所有者のみ読み取り可能）に設定されている
- [ ] ディレクトリ権限が700に設定されている
- [ ] Gitリポジトリにコミットされていない（`git status`で確認）
- [ ] 安全な場所に配置されている（プロジェクト外、ユーザーディレクトリなど）
- [ ] チームメンバーと安全に共有する方法を確立している

### 本番環境

- [ ] ファイルとして配置していない
- [ ] Cloud Runのデフォルトサービスアカウントを使用している、または
- [ ] Secret Managerを使用している
- [ ] 環境変数に直接キーの内容を設定していない
- [ ] アクセスログを監視している

## よくある間違いと対策

### ❌ 間違い1: Gitにコミットしてしまう

**問題：**
```bash
# うっかりコミットしてしまう
git add backend/secrets/service-account-key.json
git commit -m "Add service account key"
git push
```

**対策：**
```bash
# .gitignoreを確認
cat .gitignore | grep -E "(secrets|service-account|\.json)"

# 既にコミットしてしまった場合
git rm --cached backend/secrets/service-account-key.json
git commit -m "Remove service account key from git"
# キーを再生成して無効化
```

### ❌ 間違い2: ファイル権限を設定しない

**問題：**
```bash
# デフォルト権限（644）で配置
chmod 644 backend/secrets/service-account-key.json  # 誰でも読み取り可能
```

**対策：**
```bash
# 所有者のみ読み取り可能にする
chmod 600 backend/secrets/service-account-key.json
chmod 700 backend/secrets
```

### ❌ 間違い3: 本番環境でファイルを配置

**問題：**
```bash
# Dockerイメージにキーファイルを含める
COPY secrets/service-account-key.json /app/secrets/
```

**対策：**
- Cloud Runのデフォルトサービスアカウントを使用
- またはSecret Managerを使用
- Dockerイメージには含めない

### ❌ 間違い4: 環境変数に直接JSONを設定

**問題：**
```env
# .envファイルに直接JSONを設定（非推奨）
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}'
```

**対策：**
- ファイルパスを使用（開発環境）
- Secret Managerを使用（本番環境）

## セキュリティベストプラクティス

### 1. 最小権限の原則

サービスアカウントには必要な権限のみを付与：

```bash
# ✅ 推奨：Storage Object Admin（読み書き）
--role="roles/storage.objectAdmin"

# ❌ 非推奨：Storage Admin（過剰な権限）
--role="roles/storage.admin"
```

### 2. キーのローテーション

定期的にキーを再生成：

```bash
# 1. 新しいキーを生成
gcloud iam service-accounts keys create new-key.json \
  --iam-account=service-account@project.iam.gserviceaccount.com

# 2. 新しいキーをデプロイ
# 3. 動作確認
# 4. 古いキーを削除
gcloud iam service-accounts keys delete KEY_ID \
  --iam-account=service-account@project.iam.gserviceaccount.com
```

### 3. アクセス監視

GCPの監査ログを確認：

```bash
# Cloud Storageへのアクセスログを確認
gcloud logging read "resource.type=gcs_bucket" --limit=50
```

### 4. キーの無効化手順

漏洩が疑われる場合の緊急対応：

```bash
# 1. サービスアカウントキーを一覧表示
gcloud iam service-accounts keys list \
  --iam-account=service-account@project.iam.gserviceaccount.com

# 2. 漏洩したキーを削除
gcloud iam service-accounts keys delete KEY_ID \
  --iam-account=service-account@project.iam.gserviceaccount.com

# 3. 新しいキーを生成してデプロイ
```

## ファイル配置の安全性チェック

以下のスクリプトで安全性を確認できます：

```bash
#!/bin/bash
# check_secret_security.sh

echo "=== シークレットファイルのセキュリティチェック ==="

# 1. .gitignoreの確認
if grep -q "secrets/" .gitignore && grep -q "*service-account*.json" .gitignore; then
    echo "✅ .gitignoreにシークレットファイルが含まれています"
else
    echo "❌ .gitignoreにシークレットファイルが含まれていません"
fi

# 2. Gitにコミットされていないか確認
if git ls-files | grep -q "service-account.*\.json"; then
    echo "❌ シークレットファイルがGitにコミットされています！"
    echo "   以下のコマンドで削除してください："
    echo "   git rm --cached backend/secrets/service-account-key.json"
else
    echo "✅ シークレットファイルはGitにコミットされていません"
fi

# 3. ファイル権限の確認
if [ -f "backend/secrets/service-account-key.json" ]; then
    PERM=$(stat -c "%a" backend/secrets/service-account-key.json)
    if [ "$PERM" = "600" ]; then
        echo "✅ ファイル権限が適切です (600)"
    else
        echo "⚠️  ファイル権限が不適切です (現在: $PERM, 推奨: 600)"
        echo "   以下のコマンドで修正してください："
        echo "   chmod 600 backend/secrets/service-account-key.json"
    fi
else
    echo "ℹ️  シークレットファイルが見つかりません（開発環境で未設定の場合）"
fi

echo ""
echo "=== チェック完了 ==="
```

## まとめ

### 開発環境
- ✅ ファイル配置は**許容**（適切な対策を講じた場合）
- ✅ `.gitignore`に追加
- ✅ ファイル権限を600に設定
- ✅ 安全な場所に配置

### 本番環境
- ❌ ファイル配置は**非推奨**
- ✅ Cloud Runのデフォルトサービスアカウントを使用（最推奨）
- ✅ またはSecret Managerを使用

### 緊急時
- 漏洩が疑われる場合は即座にキーを無効化
- 新しいキーを生成してデプロイ
- アクセスログを確認

## 参考リンク

- [Google Cloud セキュリティベストプラクティス](https://cloud.google.com/security/best-practices)
- [Secret Manager ドキュメント](https://cloud.google.com/secret-manager/docs)
- [サービスアカウントのベストプラクティス](https://cloud.google.com/iam/docs/best-practices-service-accounts)

