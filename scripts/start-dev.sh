#!/bin/bash

# Development environment startup script
# Alternative to docker-compose for environments without docker-compose

set -e

echo "🚀 Starting Disease Community Platform (Development Mode)"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not available"
    echo "Please install Docker Desktop or Docker Engine"
    exit 1
fi

# Check if docker compose (v2) is available
if docker compose version &> /dev/null; then
    echo "📦 Using Docker Compose V2"
    docker compose up -d
elif command -v docker-compose &> /dev/null; then
    echo "📦 Using Docker Compose V1"
    docker-compose up -d
else
    echo "⚠️  Docker Compose not available, starting services individually"
    
    # Start PostgreSQL
    echo "🐘 Starting PostgreSQL..."
    docker run -d \
        --name disease-community-db \
        -e POSTGRES_DB=disease_community \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres \
        -p 5432:5432 \
        postgres:15-alpine
    
    # Wait for PostgreSQL to be ready
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 10
    
    # Start Backend
    echo "🐍 Starting FastAPI Backend..."
    cd backend
    docker build -t disease-community-backend .
    docker run -d \
        --name disease-community-backend \
        -p 8000:8000 \
        -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/disease_community \
        -e ENVIRONMENT=development \
        -e LOG_LEVEL=DEBUG \
        disease-community-backend
    cd ..
    
    # Start Frontend
    echo "⚛️  Starting Next.js Frontend..."
    cd frontend
    docker build -t disease-community-frontend .
    docker run -d \
        --name disease-community-frontend \
        -p 3000:3000 \
        -e NEXT_PUBLIC_API_URL=http://localhost:8000 \
        -e NODE_ENV=development \
        disease-community-frontend
    cd ..
fi

echo ""
echo "🎉 Services started successfully!"
echo ""
echo "📋 Service URLs:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:8000"
echo "- API Documentation: http://localhost:8000/docs"
echo ""
echo "🔍 Check service status:"
echo "docker ps"
echo ""
echo "🛑 Stop services:"
echo "./scripts/stop-dev.sh"
