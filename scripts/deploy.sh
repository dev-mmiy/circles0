#!/bin/bash

# Deployment script for Disease Community Platform
# Usage: ./scripts/deploy.sh [environment] [service]
# Environment: dev, prod
# Service: backend, frontend, all

set -e

ENVIRONMENT=${1:-dev}
SERVICE=${2:-all}
PROJECT_ID="disease-community-platform"
REGION="asia-northeast1"

echo "🚀 Starting deployment..."
echo "Environment: $ENVIRONMENT"
echo "Service: $SERVICE"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"

# Set environment-specific variables
if [ "$ENVIRONMENT" = "prod" ]; then
    SERVICE_SUFFIX=""
    ENV_VARS="ENVIRONMENT=production"
else
    SERVICE_SUFFIX="-dev"
    ENV_VARS="ENVIRONMENT=development"
fi

# Function to deploy backend
deploy_backend() {
    echo "📦 Deploying backend..."
    
    # Build and push image
    docker build -t asia.gcr.io/$PROJECT_ID/backend:latest \
        -f backend/Dockerfile \
        --target production \
        backend
    
    docker push asia.gcr.io/$PROJECT_ID/backend:latest
    
    # Deploy to Cloud Run
    gcloud run deploy disease-community-api$SERVICE_SUFFIX \
        --image asia.gcr.io/$PROJECT_ID/backend:latest \
        --region $REGION \
        --platform managed \
        --allow-unauthenticated \
        --set-env-vars $ENV_VARS \
        --set-env-vars DATABASE_URL=$DATABASE_URL
    
    echo "✅ Backend deployed successfully!"
}

# Function to deploy frontend
deploy_frontend() {
    echo "📦 Deploying frontend..."
    
    # Build and push image
    docker build -t asia.gcr.io/$PROJECT_ID/frontend:latest \
        -f frontend/Dockerfile \
        frontend
    
    docker push asia.gcr.io/$PROJECT_ID/frontend:latest
    
    # Set API URL based on environment
    if [ "$ENVIRONMENT" = "prod" ]; then
        API_URL="https://disease-community-api-asia-northeast1-$PROJECT_ID.a.run.app"
    else
        API_URL="https://disease-community-api-dev-asia-northeast1-$PROJECT_ID.a.run.app"
    fi
    
    # Deploy to Cloud Run
    gcloud run deploy disease-community-frontend$SERVICE_SUFFIX \
        --image asia.gcr.io/$PROJECT_ID/frontend:latest \
        --region $REGION \
        --platform managed \
        --allow-unauthenticated \
        --set-env-vars NEXT_PUBLIC_API_URL=$API_URL
    
    echo "✅ Frontend deployed successfully!"
}

# Function to run health checks
health_check() {
    echo "🏥 Running health checks..."
    
    if [ "$ENVIRONMENT" = "prod" ]; then
        API_URL="https://disease-community-api-asia-northeast1-$PROJECT_ID.a.run.app"
        FRONTEND_URL="https://disease-community-frontend-asia-northeast1-$PROJECT_ID.a.run.app"
    else
        API_URL="https://disease-community-api-dev-asia-northeast1-$PROJECT_ID.a.run.app"
        FRONTEND_URL="https://disease-community-frontend-dev-asia-northeast1-$PROJECT_ID.a.run.app"
    fi
    
    # Check backend health
    echo "Checking backend health..."
    curl -f "$API_URL/health" || {
        echo "❌ Backend health check failed!"
        exit 1
    }
    
    # Check frontend health
    echo "Checking frontend health..."
    curl -f "$FRONTEND_URL" || {
        echo "❌ Frontend health check failed!"
        exit 1
    }
    
    echo "✅ All health checks passed!"
}

# Main deployment logic
case $SERVICE in
    "backend")
        deploy_backend
        ;;
    "frontend")
        deploy_frontend
        ;;
    "all")
        deploy_backend
        deploy_frontend
        ;;
    *)
        echo "❌ Invalid service: $SERVICE"
        echo "Usage: $0 [environment] [service]"
        echo "Environment: dev, prod"
        echo "Service: backend, frontend, all"
        exit 1
        ;;
esac

# Run health checks
health_check

echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "Environment: $ENVIRONMENT"
echo "Service: $SERVICE"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"

if [ "$ENVIRONMENT" = "prod" ]; then
    echo "🌐 Production URLs:"
    echo "API: https://disease-community-api-asia-northeast1-$PROJECT_ID.a.run.app"
    echo "Frontend: https://disease-community-frontend-asia-northeast1-$PROJECT_ID.a.run.app"
else
    echo "🌐 Development URLs:"
    echo "API: https://disease-community-api-dev-asia-northeast1-$PROJECT_ID.a.run.app"
    echo "Frontend: https://disease-community-frontend-dev-asia-northeast1-$PROJECT_ID.a.run.app"
fi
