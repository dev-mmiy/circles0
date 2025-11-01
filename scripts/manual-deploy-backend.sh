#!/bin/bash

# Backend を手動でデプロイ
# Usage: ./scripts/manual-deploy-backend.sh

set -e

PROJECT_ID="circles-202510"
REGION="asia-northeast1"
SERVICE_NAME="disease-community-api"
CLOUD_SQL_CONNECTION="circles-202510:asia-northeast1:disease-community-db"

echo "=========================================="
echo "Backend 手動デプロイ"
echo "=========================================="
echo ""
echo "プロジェクト: ${PROJECT_ID}"
echo "リージョン: ${REGION}"
echo "サービス: ${SERVICE_NAME}"
echo ""

# Backend ディレクトリに移動
cd "$(dirname "$0")/../backend"

echo "🚀 Cloud Run にデプロイ中..."
echo ""

gcloud run deploy "${SERVICE_NAME}" \
  --source=. \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --platform=managed \
  --allow-unauthenticated \
  --add-cloudsql-instances="${CLOUD_SQL_CONNECTION}" \
  --set-env-vars="ENVIRONMENT=production,AUTH0_DOMAIN=dev-2mqgvitlgxdwl5ea.us.auth0.com,AUTH0_AUDIENCE=https://api.disease-community.com,DATABASE_URL=postgresql+asyncpg://appuser:k*fJO8UyVONO_uS)@/disease_community?host=/cloudsql/${CLOUD_SQL_CONNECTION}"

echo ""
echo "=========================================="
echo "✅ デプロイ完了"
echo "=========================================="
echo ""
echo "次のステップ:"
echo "1. デプロイが完了するまで 2-3 分待つ"
echo "2. Backend ヘルスチェック: https://disease-community-api-508246122017.asia-northeast1.run.app/health"
echo "3. Frontend: https://disease-community-frontend-508246122017.asia-northeast1.run.app/"
echo ""

