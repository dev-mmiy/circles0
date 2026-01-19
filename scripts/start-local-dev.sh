#!/bin/bash

# Local development environment startup script
# Starts backend and frontend without Docker Compose
# Uses Colima, asdf, and Homebrew setup

set -e

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the project root directory (one level up from scripts)
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project root
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Disease Community Platform (Local Development)${NC}"
echo -e "${YELLOW}📁 Project root: $PROJECT_ROOT${NC}"
echo ""

# Check if PostgreSQL is running
echo -e "${YELLOW}📋 Checking PostgreSQL...${NC}"
if ! docker-compose ps postgres 2>/dev/null | grep -q "Up"; then
    echo -e "${YELLOW}🐘 Starting PostgreSQL...${NC}"
    docker-compose up -d postgres
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 5
else
    echo -e "${GREEN}✅ PostgreSQL is already running${NC}"
fi

# Ensure we're in project root
cd "$PROJECT_ROOT"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Backend
echo -e "${YELLOW}🐍 Starting FastAPI Backend...${NC}"
cd "$PROJECT_ROOT/backend"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found. Creating...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment and start backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd "$PROJECT_ROOT"

# Wait a bit for backend to start
sleep 3

# Start Frontend
echo -e "${YELLOW}⚛️  Starting Next.js Frontend...${NC}"
cd "$PROJECT_ROOT/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
    npm install
fi

npm run dev &
FRONTEND_PID=$!
cd "$PROJECT_ROOT"

echo ""
echo -e "${GREEN}🎉 Services started successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Service URLs:${NC}"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:8000"
echo "- API Documentation: http://localhost:8000/docs"
echo ""
echo -e "${YELLOW}💡 Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
