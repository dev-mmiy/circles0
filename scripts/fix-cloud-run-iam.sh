#!/bin/bash

# Fix Cloud Run IAM Policy
# This script sets IAM policy to allow unauthenticated access

set -e

PROJECT_ID="circles-202510"
REGION="asia-northeast1"

echo "🔐 Setting IAM policies for Cloud Run services..."

# Backend
echo "Setting IAM policy for disease-community-api..."
gcloud run services add-iam-policy-binding disease-community-api \
  --region=$REGION \
  --member="allUsers" \
  --role="roles/run.invoker" \
  --project=$PROJECT_ID

# Frontend
echo "Setting IAM policy for disease-community-frontend..."
gcloud run services add-iam-policy-binding disease-community-frontend \
  --region=$REGION \
  --member="allUsers" \
  --role="roles/run.invoker" \
  --project=$PROJECT_ID

echo "✅ IAM policies updated successfully!"
echo ""
echo "Testing backend..."
curl -f https://disease-community-api-508246122017.asia-northeast1.run.app/health

echo ""
echo "Testing frontend..."
curl -f https://disease-community-frontend-508246122017.asia-northeast1.run.app

echo ""
echo "🎉 All services are accessible!"
