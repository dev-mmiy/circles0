#!/bin/bash

# Cloud Run設定確認スクリプト
# 現在の設定を確認して、最適化が必要かどうかを判断

set -e

PROJECT_ID="circles-202510"
REGION="asia-northeast1"

echo "=========================================="
echo "Cloud Run 設定確認"
echo "=========================================="
echo ""
echo "プロジェクト: ${PROJECT_ID}"
echo "リージョン: ${REGION}"
echo ""

# Backend設定を確認
echo "📋 Backend (disease-community-api) 設定:"
echo "----------------------------------------"
BACKEND_CPU=$(gcloud run services describe disease-community-api \
  --region="${REGION}" \
  --format="value(spec.template.spec.containers[0].resources.limits.cpu)" 2>/dev/null || echo "N/A")
BACKEND_MEMORY=$(gcloud run services describe disease-community-api \
  --region="${REGION}" \
  --format="value(spec.template.spec.containers[0].resources.limits.memory)" 2>/dev/null || echo "N/A")
BACKEND_CONCURRENCY=$(gcloud run services describe disease-community-api \
  --region="${REGION}" \
  --format="value(spec.template.spec.containerConcurrency)" 2>/dev/null || echo "N/A")
BACKEND_TIMEOUT=$(gcloud run services describe disease-community-api \
  --region="${REGION}" \
  --format="value(spec.template.spec.timeoutSeconds)" 2>/dev/null || echo "N/A")
BACKEND_MIN_INSTANCES=$(gcloud run services describe disease-community-api \
  --region="${REGION}" \
  --format="value(spec.template.metadata.annotations.'autoscaling\.knative\.dev/minScale')" 2>/dev/null || echo "0")
BACKEND_MAX_INSTANCES=$(gcloud run services describe disease-community-api \
  --region="${REGION}" \
  --format="value(spec.template.metadata.annotations.'autoscaling\.knative\.dev/maxScale')" 2>/dev/null || echo "N/A")

echo "  CPU: ${BACKEND_CPU}"
echo "  Memory: ${BACKEND_MEMORY}"
echo "  Concurrency: ${BACKEND_CONCURRENCY}"
echo "  Timeout: ${BACKEND_TIMEOUT}秒"
echo "  最小インスタンス数: ${BACKEND_MIN_INSTANCES}"
echo "  最大インスタンス数: ${BACKEND_MAX_INSTANCES}"
echo ""

# Frontend設定を確認
echo "📋 Frontend (disease-community-frontend) 設定:"
echo "----------------------------------------"
FRONTEND_CPU=$(gcloud run services describe disease-community-frontend \
  --region="${REGION}" \
  --format="value(spec.template.spec.containers[0].resources.limits.cpu)" 2>/dev/null || echo "N/A")
FRONTEND_MEMORY=$(gcloud run services describe disease-community-frontend \
  --region="${REGION}" \
  --format="value(spec.template.spec.containers[0].resources.limits.memory)" 2>/dev/null || echo "N/A")
FRONTEND_TIMEOUT=$(gcloud run services describe disease-community-frontend \
  --region="${REGION}" \
  --format="value(spec.template.spec.timeoutSeconds)" 2>/dev/null || echo "N/A")
FRONTEND_MIN_INSTANCES=$(gcloud run services describe disease-community-frontend \
  --region="${REGION}" \
  --format="value(spec.template.metadata.annotations.'autoscaling\.knative\.dev/minScale')" 2>/dev/null || echo "0")
FRONTEND_MAX_INSTANCES=$(gcloud run services describe disease-community-frontend \
  --region="${REGION}" \
  --format="value(spec.template.metadata.annotations.'autoscaling\.knative\.dev/maxScale')" 2>/dev/null || echo "N/A")

echo "  CPU: ${FRONTEND_CPU}"
echo "  Memory: ${FRONTEND_MEMORY}"
echo "  Timeout: ${FRONTEND_TIMEOUT}秒"
echo "  最小インスタンス数: ${FRONTEND_MIN_INSTANCES}"
echo "  最大インスタンス数: ${FRONTEND_MAX_INSTANCES}"
echo ""

# 最適化が必要かどうかを判断
echo "=========================================="
echo "最適化チェック"
echo "=========================================="
echo ""

NEEDS_OPTIMIZATION=false

# Backendチェック
if [ "${BACKEND_MIN_INSTANCES}" != "1" ]; then
  echo "⚠️  Backend: 最小インスタンス数が1ではありません（現在: ${BACKEND_MIN_INSTANCES}）"
  NEEDS_OPTIMIZATION=true
fi

if [ "${BACKEND_CPU}" != "2" ]; then
  echo "⚠️  Backend: CPUが2ではありません（現在: ${BACKEND_CPU}）"
  NEEDS_OPTIMIZATION=true
fi

if [ "${BACKEND_MEMORY}" != "2Gi" ]; then
  echo "⚠️  Backend: Memoryが2Giではありません（現在: ${BACKEND_MEMORY}）"
  NEEDS_OPTIMIZATION=true
fi

# Frontendチェック
if [ "${FRONTEND_MIN_INSTANCES}" != "1" ]; then
  echo "⚠️  Frontend: 最小インスタンス数が1ではありません（現在: ${FRONTEND_MIN_INSTANCES}）"
  NEEDS_OPTIMIZATION=true
fi

if [ "${FRONTEND_CPU}" != "1" ]; then
  echo "⚠️  Frontend: CPUが1ではありません（現在: ${FRONTEND_CPU}）"
  NEEDS_OPTIMIZATION=true
fi

if [ "${FRONTEND_MEMORY}" != "1Gi" ]; then
  echo "⚠️  Frontend: Memoryが1Giではありません（現在: ${FRONTEND_MEMORY}）"
  NEEDS_OPTIMIZATION=true
fi

echo ""
if [ "$NEEDS_OPTIMIZATION" = true ]; then
  echo "❌ 最適化が必要です"
  echo ""
  echo "以下のコマンドで最適化を実行できます:"
  echo "  ./scripts/optimize-cloud-run.sh"
else
  echo "✅ すべての設定が最適化済みです"
  echo ""
  echo "現在の設定:"
  echo "  - Backend: CPU=2, Memory=2Gi, Min Instances=1, Timeout=300s"
  echo "  - Frontend: CPU=1, Memory=1Gi, Min Instances=1, Timeout=300s"
fi
echo ""

