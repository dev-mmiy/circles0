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
    
    # Start backend container for testing
    print_status "Starting backend container for testing..."
    docker compose up -d backend
    
    # Wait for backend to be ready
    print_status "Waiting for backend to be ready..."
    sleep 15
    
    # Run linting in container
    print_status "Running backend linting..."
    docker compose exec backend flake8 app/ --max-line-length=88 --extend-ignore=E203,W503
    docker compose exec backend black --check app/
    docker compose exec backend isort --check-only app/
    
    # Run tests in container
    print_status "Running backend tests..."
    docker compose exec backend python -m pytest tests/ -v --cov=app --cov-report=html --cov-report=term
    
    print_success "Backend tests completed"
}

# Run frontend tests
test_frontend() {
    print_status "Running frontend tests..."
    
    # Start frontend container for testing
    print_status "Starting frontend container for testing..."
    docker compose up -d frontend
    
    # Wait for frontend to be ready
    print_status "Waiting for frontend to be ready..."
    sleep 15
    
    # Run linting in container
    print_status "Running frontend linting..."
    docker compose exec frontend npm run lint
    docker compose exec frontend npm run format:check
    
    # Run type check in container
    print_status "Running TypeScript type check..."
    docker compose exec frontend npm run type-check
    
    # Run tests in container
    print_status "Running frontend tests..."
    docker compose exec frontend npm run test -- --coverage --watchAll=false
    
    # Build frontend in container
    print_status "Building frontend..."
    docker compose exec frontend npm run build
    
    print_success "Frontend tests completed"
}

# Run integration tests
test_integration() {
    print_status "Running integration tests..."
    
    # Run database migrations in container
    print_status "Running database migrations..."
    docker compose exec backend alembic upgrade head
    
    # Run integration tests in container
    print_status "Running integration tests..."
    docker compose exec backend python -m pytest tests/integration/ -v
    
    print_success "Integration tests completed"
}

# Run security scans
security_scan() {
    print_status "Running security scans..."
    
    # Backend security scan in container
    print_status "Running Python security scan..."
    docker compose exec backend pip install safety bandit
    docker compose exec backend safety check -r requirements.txt
    docker compose exec backend bandit -r app/ -f json -o bandit-report.json || true
    
    # Frontend security scan in container
    print_status "Running Node.js security scan..."
    docker compose exec frontend npm audit --audit-level moderate
    
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
