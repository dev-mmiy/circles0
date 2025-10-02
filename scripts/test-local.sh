#!/bin/bash

# Local testing script for Disease Community Platform
# This script tests the local development environment

set -e

echo "🧪 Testing local development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test API endpoint
test_api() {
    local url=$1
    local expected_message=$2
    
    echo "Testing API: $url"
    
    response=$(curl -s "$url" || echo "ERROR")
    
    if [[ "$response" == *"$expected_message"* ]]; then
        echo -e "${GREEN}✅ API test passed${NC}"
        echo "Response: $response"
    else
        echo -e "${RED}❌ API test failed${NC}"
        echo "Expected: $expected_message"
        echo "Got: $response"
        return 1
    fi
}

# Function to test frontend
test_frontend() {
    local url=$1
    
    echo "Testing Frontend: $url"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "ERROR")
    
    if [[ "$response" == "200" ]]; then
        echo -e "${GREEN}✅ Frontend test passed${NC}"
    else
        echo -e "${RED}❌ Frontend test failed${NC}"
        echo "HTTP Status: $response"
        return 1
    fi
}

# Check if services are running
echo "🔍 Checking if services are running..."

# Test backend API
if test_api "http://localhost:8000/" "Hello World!"; then
    echo "Backend is running correctly"
else
    echo -e "${YELLOW}⚠️  Backend might not be running. Start it with: docker-compose up -d${NC}"
fi

# Test backend health endpoint
if test_api "http://localhost:8000/health" "healthy"; then
    echo "Backend health check passed"
else
    echo -e "${YELLOW}⚠️  Backend health check failed${NC}"
fi

# Test frontend
if test_frontend "http://localhost:3000"; then
    echo "Frontend is running correctly"
else
    echo -e "${YELLOW}⚠️  Frontend might not be running. Start it with: docker-compose up -d${NC}"
fi

# Test API info endpoint
if test_api "http://localhost:8000/info" "Disease Community API"; then
    echo "API info endpoint working"
else
    echo -e "${YELLOW}⚠️  API info endpoint failed${NC}"
fi

echo ""
echo "🎉 Local testing completed!"
echo ""
echo "📋 Test Summary:"
echo "- Backend API: http://localhost:8000"
echo "- Frontend: http://localhost:3000"
echo "- API Documentation: http://localhost:8000/docs"
echo ""
echo "💡 To start services: docker-compose up -d"
echo "💡 To stop services: docker-compose down"
