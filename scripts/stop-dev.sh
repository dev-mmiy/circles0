#!/bin/bash

# Development environment stop script

set -e

echo "🛑 Stopping Disease Community Platform (Development Mode)"

# Check if docker compose (v2) is available
if docker compose version &> /dev/null; then
    echo "📦 Using Docker Compose V2"
    docker compose down
elif command -v docker-compose &> /dev/null; then
    echo "📦 Using Docker Compose V1"
    docker-compose down
else
    echo "⚠️  Docker Compose not available, stopping services individually"
    
    # Stop and remove containers
    echo "🛑 Stopping services..."
    
    # Stop Frontend
    if docker ps -q -f name=disease-community-frontend | grep -q .; then
        echo "Stopping Frontend..."
        docker stop disease-community-frontend
        docker rm disease-community-frontend
    fi
    
    # Stop Backend
    if docker ps -q -f name=disease-community-backend | grep -q .; then
        echo "Stopping Backend..."
        docker stop disease-community-backend
        docker rm disease-community-backend
    fi
    
    # Stop PostgreSQL
    if docker ps -q -f name=disease-community-db | grep -q .; then
        echo "Stopping PostgreSQL..."
        docker stop disease-community-db
        docker rm disease-community-db
    fi
fi

echo "✅ All services stopped successfully!"
