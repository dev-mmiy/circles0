# Infrastructure

このディレクトリには、インフラストラクチャの設定ファイルが含まれています。

## 構成

- `terraform/` - Terraform設定ファイル
- `k8s/` - Kubernetes設定ファイル（将来の拡張用）

## セットアップ

### 前提条件
- Google Cloud SDK
- Terraform
- kubectl（Kubernetes使用時）

### GCP環境のセットアップ

1. **プロジェクトの作成**
```bash
gcloud projects create your-project-id
gcloud config set project your-project-id
```

2. **必要なAPIの有効化**
```bash
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable container.googleapis.com
```

3. **サービスアカウントの作成**
```bash
gcloud iam service-accounts create github-actions \
    --display-name="GitHub Actions" \
    --description="Service account for GitHub Actions"
```

4. **権限の付与**
```bash
gcloud projects add-iam-policy-binding your-project-id \
    --member="serviceAccount:github-actions@your-project-id.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding your-project-id \
    --member="serviceAccount:github-actions@your-project-id.iam.gserviceaccount.com" \
    --role="roles/storage.admin"
```

5. **キーの生成**
```bash
gcloud iam service-accounts keys create key.json \
    --iam-account=github-actions@your-project-id.iam.gserviceaccount.com
```

## 環境変数の設定

GitHubリポジトリのSecretsに以下を設定：

- `GCP_PROJECT_ID`: GCPプロジェクトID
- `GCP_SA_KEY`: サービスアカウントキー（JSON）
- `VERCEL_TOKEN`: Vercelトークン
- `VERCEL_ORG_ID`: Vercel組織ID
- `VERCEL_PROJECT_ID`: VercelプロジェクトID
