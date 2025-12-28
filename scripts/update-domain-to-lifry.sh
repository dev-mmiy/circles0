#!/bin/bash

# 本番環境のドメインを lifry.com に変更するスクリプト
# Usage: ./scripts/update-domain-to-lifry.sh

set -e

PROJECT_ID="circles-202510"
REGION="asia-northeast1"
FRONTEND_DOMAIN="https://lifry.com"  # HTTPSを推奨（Cloud Runが自動的にHTTPS証明書を提供）
BACKEND_DOMAIN="https://api.lifry.com"  # バックエンド用サブドメイン

echo "=========================================="
echo "ドメイン設定を lifry.com に更新"
echo "=========================================="
echo ""
echo "フロントエンドドメイン: ${FRONTEND_DOMAIN}"
echo "バックエンドドメイン: ${BACKEND_DOMAIN}"
echo ""

# バックエンドの環境変数を更新
echo "🔧 Backend (disease-community-api) の環境変数を更新中..."
gcloud run services update disease-community-api \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --update-env-vars="CORS_ALLOWED_ORIGINS=${FRONTEND_DOMAIN},http://lifry.com"

echo "✅ Backend 環境変数更新完了"
echo ""

# フロントエンドの環境変数を更新
echo "🎨 Frontend (disease-community-frontend) の環境変数を更新中..."
gcloud run services update disease-community-frontend \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --update-env-vars="NEXT_PUBLIC_AUTH0_DOMAIN=dev-2mqgvitlgxdwl5ea.us.auth0.com,NEXT_PUBLIC_AUTH0_CLIENT_ID=YGlRudHFYDfkcMZSgamI9PIrhPsFsLmD,NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.disease-community.com,NEXT_PUBLIC_AUTH0_REDIRECT_URI=${FRONTEND_DOMAIN}/callback,http://lifry.com/callback,NEXT_PUBLIC_API_URL=${BACKEND_DOMAIN}"

echo "✅ Frontend 環境変数更新完了"
echo ""

echo "=========================================="
echo "✅ 環境変数の更新が完了しました"
echo "=========================================="
echo ""
echo "次のステップ:"
echo "1. Google Cloud Consoleでカスタムドメインマッピングを設定"
echo "2. DNS設定を完了（CNAMEまたはAレコード）"
echo "3. Auth0 DashboardでリダイレクトURIを更新"
echo "4. 設定の反映を確認（数分〜数時間かかる場合があります）"
echo ""
echo "詳細は docs/DOMAIN_SETUP.md を参照してください"

