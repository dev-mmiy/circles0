#!/bin/bash

# Local Testing Script for Disease Community Platform
# This script runs all tests locally before pushing to production

set -e  # Exit on any error

echo "🚀 Starting local testing process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    print_status "Checking Docker status..."
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Start local services
start_services() {
    print_status "Starting local services..."
    
    # Start database
    docker compose up -d postgres
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Check if database is ready
    if ! docker compose exec -T postgres pg_isready -U postgres; then
        print_error "Database is not ready"
        exit 1
    fi
    
    print_success "Database is ready"
}

# Run backend tests
test_backend() {
    print_status "Running backend tests..."
    
    cd backend
    
    # Install dependencies
    print_status "Installing Python dependencies..."
    pip3 install -r requirements.txt
    
    # Run linting
    print_status "Running backend linting..."
    flake8 app/ --max-line-length=88 --extend-ignore=E203,W503
    black --check app/
    isort --check-only app/
    
    # Run tests
    print_status "Running backend tests..."
    python -m pytest tests/ -v --cov=app --cov-report=html --cov-report=term
    
    cd ..
    print_success "Backend tests completed"
}

# Run frontend tests
test_frontend() {
    print_status "Running frontend tests..."
    
    cd frontend
    
    # Install dependencies
    print_status "Installing Node.js dependencies..."
    npm install --legacy-peer-deps --no-audit --no-fund
    
    # Run linting
    print_status "Running frontend linting..."
    npm run lint
    npm run format:check
    
    # Run type check
    print_status "Running TypeScript type check..."
    npm run type-check
    
    # Run tests
    print_status "Running frontend tests..."
    npm run test -- --coverage --watchAll=false
    
    # Build frontend
    print_status "Building frontend..."
    npm run build
    
    cd ..
    print_success "Frontend tests completed"
}

# Run integration tests
test_integration() {
    print_status "Running integration tests..."
    
    cd backend
    
    # Run database migrations
    print_status "Running database migrations..."
    alembic upgrade head
    
    # Run integration tests
    print_status "Running integration tests..."
    python -m pytest tests/integration/ -v
    
    cd ..
    print_success "Integration tests completed"
}

# Run security scans
security_scan() {
    print_status "Running security scans..."
    
    # Backend security scan
    cd backend
    print_status "Running Python security scan..."
    pip3 install safety bandit
    safety check -r requirements.txt
    bandit -r app/ -f json -o bandit-report.json || true
    cd ..
    
    # Frontend security scan
    cd frontend
    print_status "Running Node.js security scan..."
    npm audit --audit-level moderate
    cd ..
    
    print_success "Security scans completed"
}

# Build Docker images
build_images() {
    print_status "Building Docker images..."
    
    # Build backend image
    print_status "Building backend image..."
    docker build -t disease-community-api:local ./backend
    
    # Build frontend image
    print_status "Building frontend image..."
    docker build -t disease-community-frontend:local ./frontend
    
    print_success "Docker images built successfully"
}

# Run end-to-end tests
test_e2e() {
    print_status "Running end-to-end tests..."
    
    # Start all services
    docker compose up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Check if services are running
    if ! curl -f http://localhost:8000/health; then
        print_error "Backend service is not ready"
        exit 1
    fi
    
    if ! curl -f http://localhost:3000; then
        print_error "Frontend service is not ready"
        exit 1
    fi
    
    print_success "All services are running"
    
    # Run Playwright tests
    cd frontend
    print_status "Running Playwright tests..."
    npm run test:e2e
    cd ..
    
    print_success "End-to-end tests completed"
}

# Cleanup
cleanup() {
    print_status "Cleaning up..."
    docker compose down
    print_success "Cleanup completed"
}

# Main execution
main() {
    print_status "Starting comprehensive local testing..."
    
    # Check prerequisites
    check_docker
    check_dependencies
    
    # Start services
    start_services
    
    # Run tests
    test_backend
    test_frontend
    test_integration
    security_scan
    
    # Build images
    build_images
    
    # Run e2e tests
    test_e2e
    
    # Cleanup
    cleanup
    
    print_success "🎉 All tests passed! Ready for deployment."
    print_status "You can now push to the repository for automated deployment."
}

# Handle script interruption
trap cleanup EXIT

# Run main function
main "$@"
