#!/bin/bash

# Cloud Run パフォーマンス最適化スクリプト
# タイムアウトエラーを減らすための設定を適用

set -e

PROJECT_ID="circles-202510"
REGION="asia-northeast1"

echo "=========================================="
echo "Cloud Run パフォーマンス最適化"
echo "=========================================="
echo ""
echo "プロジェクト: ${PROJECT_ID}"
echo "リージョン: ${REGION}"
echo ""

# Backend サービスの最適化
echo "🔧 Backend (disease-community-api) を最適化中..."
gcloud run services update disease-community-api \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --min-instances=1 \
  --cpu=2 \
  --memory=2Gi \
  --timeout=300 \
  --concurrency=80 \
  --max-instances=10

echo "✅ Backend 最適化完了"
echo ""

# Frontend サービスの最適化
echo "🎨 Frontend (disease-community-frontend) を最適化中..."
gcloud run services update disease-community-frontend \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --min-instances=1 \
  --cpu=1 \
  --memory=1Gi \
  --timeout=300 \
  --max-instances=10

echo "✅ Frontend 最適化完了"
echo ""

echo "=========================================="
echo "✅ 最適化が完了しました"
echo "=========================================="
echo ""
echo "変更内容:"
echo "- 最小インスタンス数: 1（コールドスタートを回避）"
echo "- Backend CPU: 2コア"
echo "- Backend メモリ: 2Gi"
echo "- Frontend CPU: 1コア"
echo "- Frontend メモリ: 1Gi"
echo "- タイムアウト: 300秒（5分）"
echo "- 最大同時リクエスト数: 80（Backend）"
echo ""
echo "注意: 最小インスタンス1台分のコストが発生します（約$10-20/月）"
echo ""

