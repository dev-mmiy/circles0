#!/bin/bash
# Fix Production GCS Configuration
# This script fixes GCS configuration issues in Cloud Run production environment

set -e

PROJECT_ID="circles-202510"
SERVICE_NAME="disease-community-api"
REGION="asia-northeast1"
GCS_BUCKET_NAME="disease-community-images"
GCS_PROJECT_ID="circles-202510"

echo "🔧 本番環境のGCS設定を修正中..."
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

echo "📋 現在の設定を確認中..."
echo ""

# Get current service account
CURRENT_SERVICE_ACCOUNT=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format="value(spec.template.spec.serviceAccountName)" 2>/dev/null || echo "")

if [ -z "$CURRENT_SERVICE_ACCOUNT" ]; then
    # Use default compute service account
    CURRENT_SERVICE_ACCOUNT="${PROJECT_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
    echo "ℹ️  デフォルトサービスアカウントを使用: $CURRENT_SERVICE_ACCOUNT"
else
    echo "ℹ️  現在のサービスアカウント: $CURRENT_SERVICE_ACCOUNT"
fi

echo ""
echo "=" | head -c 60
echo ""
echo "ステップ1: GOOGLE_APPLICATION_CREDENTIALS環境変数を削除"
echo "=" | head -c 60
echo ""

# Remove GOOGLE_APPLICATION_CREDENTIALS if it exists
echo "🔧 GOOGLE_APPLICATION_CREDENTIALS環境変数を削除中..."
gcloud run services update $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --remove-env-vars="GOOGLE_APPLICATION_CREDENTIALS" \
    --quiet 2>/dev/null || echo "⚠️  GOOGLE_APPLICATION_CREDENTIALSは設定されていません（問題ありません）"

echo "✅ 完了"
echo ""

echo "=" | head -c 60
echo ""
echo "ステップ2: GCS環境変数を設定"
echo "=" | head -c 60
echo ""

# Set GCS environment variables
echo "🔧 GCS環境変数を設定中..."
gcloud run services update $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --update-env-vars="GCS_BUCKET_NAME=$GCS_BUCKET_NAME,GCS_PROJECT_ID=$GCS_PROJECT_ID" \
    --quiet

echo "✅ 完了"
echo ""

echo "=" | head -c 60
echo ""
echo "ステップ3: サービスアカウントにGCS権限を付与"
echo "=" | head -c 60
echo ""

# Grant Storage Object Admin role to service account
echo "🔧 サービスアカウントにStorage Object Admin権限を付与中..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${CURRENT_SERVICE_ACCOUNT}" \
    --role="roles/storage.objectAdmin" \
    --condition=None \
    --quiet || echo "⚠️  権限の付与に失敗しました（既に設定されている可能性があります）"

echo "✅ 完了"
echo ""

echo "=" | head -c 60
echo ""
echo "ステップ4: バケットへのアクセス権限を確認"
echo "=" | head -c 60
echo ""

# Check if bucket exists
if gsutil ls gs://$GCS_BUCKET_NAME &> /dev/null; then
    echo "✅ バケットが存在します: gs://$GCS_BUCKET_NAME"
    
    # Grant bucket-level permissions
    echo "🔧 バケットレベルで権限を付与中..."
    gsutil iam ch serviceAccount:${CURRENT_SERVICE_ACCOUNT}:roles/storage.objectAdmin \
        gs://$GCS_BUCKET_NAME 2>/dev/null || echo "⚠️  バケットレベルの権限設定に失敗しました（プロジェクトレベルの権限で動作する可能性があります）"
else
    echo "⚠️  バケットが見つかりません: gs://$GCS_BUCKET_NAME"
    echo "   バケットを作成するか、正しいバケット名を確認してください"
fi

echo ""
echo "=" | head -c 60
echo ""
echo "✅ 設定の修正が完了しました"
echo "=" | head -c 60
echo ""
echo "📋 設定内容:"
echo "   サービス名: $SERVICE_NAME"
echo "   リージョン: $REGION"
echo "   GCSバケット名: $GCS_BUCKET_NAME"
echo "   GCSプロジェクトID: $GCS_PROJECT_ID"
echo "   サービスアカウント: $CURRENT_SERVICE_ACCOUNT"
echo ""
echo "⏳ 次のステップ:"
echo "1. Cloud Runサービスが再起動するまで 1-2 分待つ"
echo "2. 設定を確認: ./scripts/check-production-gcs-config.sh"
echo "3. iPhoneから画像アップロードを試す"
echo ""
echo "📝 トラブルシューティング:"
echo "   - ログを確認: gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME\" --limit=20 --project=$PROJECT_ID"
echo "   - 詳細は docs/PRODUCTION_GCS_SETUP.md を参照してください"
echo ""

