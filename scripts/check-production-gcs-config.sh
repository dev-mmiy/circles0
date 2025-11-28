#!/bin/bash
# Check Production GCS Configuration
# This script checks GCS configuration in Cloud Run production environment

set -e

PROJECT_ID="circles-202510"
SERVICE_NAME="disease-community-api"
REGION="asia-northeast1"

echo "🔍 本番環境のGCS設定を確認中..."
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

echo "✅ gcloud認証確認完了"
echo ""

# Set project
gcloud config set project $PROJECT_ID

echo "=" | head -c 60
echo ""
echo "1. Cloud Run環境変数の確認"
echo "=" | head -c 60
echo ""

# Get environment variables from Cloud Run service
echo "📋 Cloud Runサービス: $SERVICE_NAME"
echo "📋 リージョン: $REGION"
echo ""

ENV_VARS=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format="value(spec.template.spec.containers[0].env)" 2>/dev/null || echo "")

if [ -z "$ENV_VARS" ]; then
    echo "⚠️  環境変数の取得に失敗しました"
    echo "   サービス名とリージョンを確認してください"
else
    # Check for GCS-related environment variables
    echo "環境変数の確認:"
    gcloud run services describe $SERVICE_NAME \
        --region=$REGION \
        --project=$PROJECT_ID \
        --format="table(spec.template.spec.containers[0].env.name,spec.template.spec.containers[0].env.value)" | \
        grep -E "GCS_|GOOGLE_APPLICATION" || echo "⚠️  GCS関連の環境変数が見つかりません"
fi

echo ""
echo "=" | head -c 60
echo ""
echo "2. Cloud Runログの確認（GCS関連エラー）"
echo "=" | head -c 60
echo ""

# Check recent logs for GCS-related errors
echo "📋 直近のGCS関連エラーログ:"
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME AND (textPayload:\"GCS\" OR textPayload:\"storage\" OR textPayload:\"bucket\" OR textPayload:\"503\" OR textPayload:\"Image upload service\")" \
    --limit=20 \
    --format="table(timestamp,severity,textPayload)" \
    --project=$PROJECT_ID 2>/dev/null || echo "⚠️  ログの取得に失敗しました"

echo ""
echo "=" | head -c 60
echo ""
echo "3. Storage Service初期化ログの確認"
echo "=" | head -c 60
echo ""

echo "📋 Storage Service初期化時のログ:"
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME AND (textPayload:\"GCS Storage service\" OR textPayload:\"GCS_BUCKET_NAME\" OR textPayload:\"Failed to initialize GCS\")" \
    --limit=10 \
    --format="table(timestamp,severity,textPayload)" \
    --project=$PROJECT_ID 2>/dev/null || echo "⚠️  ログの取得に失敗しました"

echo ""
echo "=" | head -c 60
echo ""
echo "4. 確認方法の説明"
echo "=" | head -c 60
echo ""
echo "以下のコマンドで詳細を確認できます:"
echo ""
echo "1. 環境変数を直接確認:"
echo "   gcloud run services describe $SERVICE_NAME --region=$REGION --format=yaml | grep -A 50 'env:'"
echo ""
echo "2. すべてのログを確認:"
echo "   gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME\" --limit=50 --project=$PROJECT_ID"
echo ""
echo "3. エラーログのみ確認:"
echo "   gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME AND severity>=ERROR\" --limit=20 --project=$PROJECT_ID"
echo ""
echo "4. リアルタイムログを監視:"
echo "   gcloud logging tail \"resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME\" --project=$PROJECT_ID"
echo ""


