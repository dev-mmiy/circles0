#!/bin/bash

# Cloud Run 環境変数設定スクリプト
# Usage: ./scripts/deploy-cloud-run-env.sh

set -e

PROJECT_ID="circles-202510"
REGION="asia-northeast1"
CLOUD_SQL_CONNECTION="circles-202510:asia-northeast1:disease-community-db"

echo "=========================================="
echo "Cloud Run 環境変数設定"
echo "=========================================="
echo ""

# Backend サービスの設定
echo "🔧 Backend (disease-community-api) の環境変数を設定中..."
gcloud run services update disease-community-api \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --add-cloudsql-instances="${CLOUD_SQL_CONNECTION}" \
  --update-env-vars="ENVIRONMENT=production,AUTH0_DOMAIN=dev-2mqgvitlgxdwl5ea.us.auth0.com,AUTH0_AUDIENCE=https://api.disease-community.com,DATABASE_URL=postgresql+asyncpg://appuser:k*fJO8UyVONO_uS)@/disease_community?host=/cloudsql/${CLOUD_SQL_CONNECTION}"

echo "✅ Backend 環境変数設定完了"
echo ""

# Frontend サービスの設定
echo "🎨 Frontend (disease-community-frontend) の環境変数を設定中..."
gcloud run services update disease-community-frontend \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --update-env-vars="NEXT_PUBLIC_AUTH0_DOMAIN=dev-2mqgvitlgxdwl5ea.us.auth0.com,NEXT_PUBLIC_AUTH0_CLIENT_ID=YGlRudHFYDfkcMZSgamI9PIrhPsFsLmD,NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.disease-community.com,NEXT_PUBLIC_AUTH0_REDIRECT_URI=https://lifry.com/callback,NEXT_PUBLIC_API_URL=https://api.lifry.com"

echo "✅ Frontend 環境変数設定完了"
echo ""

echo "=========================================="
echo "✅ すべての環境変数設定が完了しました"
echo "=========================================="
echo ""
echo "次のステップ:"
echo "1. デプロイが完了するまで 2-3 分待つ"
echo "2. Backend ヘルスチェック: https://api.lifry.com/health"
echo "3. Frontend: https://lifry.com/"
echo ""

