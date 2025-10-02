#!/bin/bash

# Build script for Disease Community Platform
# Usage: ./scripts/build.sh [environment] [service]
# Environment: dev, prod
# Service: backend, frontend, all

set -e

ENVIRONMENT=${1:-dev}
SERVICE=${2:-all}
PROJECT_ID="disease-community-platform"

echo "🔨 Starting build process..."
echo "Environment: $ENVIRONMENT"
echo "Service: $SERVICE"
echo "Project ID: $PROJECT_ID"

# Function to build backend
build_backend() {
    echo "📦 Building backend..."
    
    cd backend
    
    # Install dependencies
    echo "Installing Python dependencies..."
    pip install -r requirements.txt
    
    # Run linting
    echo "Running backend linting..."
    flake8 app/
    black --check app/
    isort --check-only app/
    
    # Run tests
    echo "Running backend tests..."
    python -m pytest tests/ -v --cov=app --cov-report=html --cov-report=term
    
    # Build Docker image
    echo "Building backend Docker image..."
    docker build -t disease-community-backend:latest \
        -f Dockerfile \
        --target production .
    
    echo "✅ Backend build completed!"
    cd ..
}

# Function to build frontend
build_frontend() {
    echo "📦 Building frontend..."
    
    cd frontend
    
    # Install dependencies
    echo "Installing Node.js dependencies..."
    npm ci
    
    # Run linting
    echo "Running frontend linting..."
    npm run lint
    
    # Run type check
    echo "Running TypeScript type check..."
    npm run type-check
    
    # Run tests
    echo "Running frontend tests..."
    npm run test
    
    # Build application
    echo "Building frontend application..."
    npm run build
    
    # Build Docker image
    echo "Building frontend Docker image..."
    docker build -t disease-community-frontend:latest \
        -f Dockerfile .
    
    echo "✅ Frontend build completed!"
    cd ..
}

# Function to run security scan
security_scan() {
    echo "🔒 Running security scan..."
    
    # Scan backend
    echo "Scanning backend for vulnerabilities..."
    docker run --rm -v $(pwd)/backend:/app aquasec/trivy fs /app
    
    # Scan frontend
    echo "Scanning frontend for vulnerabilities..."
    docker run --rm -v $(pwd)/frontend:/app aquasec/trivy fs /app
    
    echo "✅ Security scan completed!"
}

# Function to run integration tests
integration_tests() {
    echo "🧪 Running integration tests..."
    
    # Start services
    echo "Starting services for integration tests..."
    docker compose up -d
    
    # Wait for services to be ready
    echo "Waiting for services to be ready..."
    sleep 30
    
    # Run integration tests
    echo "Running integration tests..."
    cd backend
    python -m pytest tests/integration/ -v
    cd ..
    
    # Stop services
    echo "Stopping services..."
    docker compose down
    
    echo "✅ Integration tests completed!"
}

# Main build logic
case $SERVICE in
    "backend")
        build_backend
        ;;
    "frontend")
        build_frontend
        ;;
    "all")
        build_backend
        build_frontend
        security_scan
        integration_tests
        ;;
    *)
        echo "❌ Invalid service: $SERVICE"
        echo "Usage: $0 [environment] [service]"
        echo "Environment: dev, prod"
        echo "Service: backend, frontend, all"
        exit 1
        ;;
esac

echo "🎉 Build process completed successfully!"
echo ""
echo "📋 Build Summary:"
echo "Environment: $ENVIRONMENT"
echo "Service: $SERVICE"
echo "Project ID: $PROJECT_ID"
