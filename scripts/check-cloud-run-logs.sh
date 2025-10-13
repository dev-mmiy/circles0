#!/bin/bash

# Check Cloud Run Logs Script
# This script helps debug Cloud Run deployment issues

set -e

echo "🔍 Checking Cloud Run Logs..."

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed"
    exit 1
fi

# Check authentication
echo "🔐 Checking authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1; then
    echo "❌ No active gcloud account found"
    echo "Please run: gcloud auth login"
    exit 1
fi

# Set project
PROJECT_ID="circles-202510"
REGION="asia-northeast1"
SERVICE_NAME="disease-community-api"

echo "📋 Project: $PROJECT_ID"
echo "🌍 Region: $REGION"
echo "🚀 Service: $SERVICE_NAME"

# Check service status
echo ""
echo "=== Service Status ==="
gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --format="table(status.url,status.conditions[0].type,status.conditions[0].status,status.conditions[0].message)" || echo "❌ Service not found"

# Get recent logs
echo ""
echo "=== Recent Logs (last 50 entries) ==="
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME" \
    --limit=50 \
    --format="table(timestamp,severity,textPayload)" \
    --freshness=2h || echo "❌ No logs found"

# Get error logs only
echo ""
echo "=== Error Logs Only ==="
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME AND severity>=ERROR" \
    --limit=20 \
    --format="table(timestamp,severity,textPayload)" \
    --freshness=2h || echo "❌ No error logs found"

# Get startup logs
echo ""
echo "=== Startup Logs ==="
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME AND (textPayload:\"Starting server\" OR textPayload:\"uvicorn\" OR textPayload:\"port\")" \
    --limit=20 \
    --format="table(timestamp,severity,textPayload)" \
    --freshness=2h || echo "❌ No startup logs found"

echo ""
echo "✅ Log check completed"
