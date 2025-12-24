#!/bin/bash
# Set Production GCS Environment Variables
# This script sets GCS-related environment variables in Cloud Run production environment

set -e

PROJECT_ID="circles-202510"
SERVICE_NAME="disease-community-api"
REGION="asia-northeast1"
GCS_BUCKET_NAME="disease-community-images"
GCS_PROJECT_ID="circles-202510"

echo "🔧 本番環境のGCS環境変数を設定中..."
echo ""

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed"
    echo "Please install: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check authentication
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 &> /dev/null; then
    echo "❌ No active gcloud account found"
    echo "Please run: gcloud auth login"
    exit 1
fi

# Set project
gcloud config set project $PROJECT_ID

echo "📋 設定内容:"
echo "   サービス名: $SERVICE_NAME"
echo "   リージョン: $REGION"
echo "   GCSバケット名: $GCS_BUCKET_NAME"
echo "   GCSプロジェクトID: $GCS_PROJECT_ID"
echo ""

# Get current environment variables
echo "📋 現在の環境変数を確認中..."
CURRENT_ENV=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format="value(spec.template.spec.containers[0].env)" 2>/dev/null || echo "")

# Check if GCS variables are already set
if echo "$CURRENT_ENV" | grep -q "GCS_BUCKET_NAME"; then
    echo "⚠️  GCS_BUCKET_NAME は既に設定されています"
    read -p "上書きしますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "キャンセルしました"
        exit 0
    fi
fi

echo ""
echo "🔧 環境変数を更新中..."

# Update environment variables
# Note: Cloud Runでは、GOOGLE_APPLICATION_CREDENTIALSは設定しない
# Cloud Runのデフォルトサービスアカウントを使用します
gcloud run services update $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --update-env-vars="GCS_BUCKET_NAME=$GCS_BUCKET_NAME,GCS_PROJECT_ID=$GCS_PROJECT_ID" \
    --quiet

echo ""
echo "✅ 環境変数の設定が完了しました"
echo ""
echo "📋 設定された環境変数:"
echo "   GCS_BUCKET_NAME=$GCS_BUCKET_NAME"
echo "   GCS_PROJECT_ID=$GCS_PROJECT_ID"
echo ""
echo "⚠️  注意: Cloud Runでは、GOOGLE_APPLICATION_CREDENTIALSは設定しません"
echo "   Cloud RunのデフォルトサービスアカウントがGCSにアクセスできる権限を持っている必要があります"
echo ""
echo "次のステップ:"
echo "1. Cloud RunのサービスアカウントにGCSへのアクセス権限を付与:"
echo "   gcloud projects add-iam-policy-binding $PROJECT_ID \\"
echo "     --member=\"serviceAccount:\$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(spec.template.spec.serviceAccountName)')\" \\"
echo "     --role=\"roles/storage.objectAdmin\""
echo ""
echo "2. 設定を確認:"
echo "   ./scripts/check-production-gcs-config.sh"
echo ""
echo "3. サービスが再起動するまで 1-2 分待つ"
echo ""







