#!/bin/bash

# Migration script for Disease Community Platform
# This script handles database migrations for different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to run migration
run_migration() {
    local environment=$1
    local action=$2
    
    print_status "Running migration for environment: $environment"
    
    # Set environment variables based on environment
    case $environment in
        "dev")
            export DATABASE_URL="postgresql://circles_dev:circles_dev_password@localhost:5432/circles_db_dev"
            ;;
        "prod")
            export DATABASE_URL="postgresql://circles_prod:circles_prod_password@localhost:5432/circles_db_prod"
            ;;
        "test")
            export DATABASE_URL="postgresql://circles_test:circles_test_password@localhost:5432/circles_db_test"
            ;;
        *)
            print_error "Unknown environment: $environment"
            exit 1
            ;;
    esac
    
    print_info "Database URL: $DATABASE_URL"
    
    # Change to backend directory
    cd /home/mmiy/workspace/circles0/backend
    
    # Run migration command
    case $action in
        "upgrade")
            print_status "Running: alembic upgrade head"
            docker compose exec backend alembic upgrade head
            ;;
        "downgrade")
            print_status "Running: alembic downgrade -1"
            docker compose exec backend alembic downgrade -1
            ;;
        "revision")
            local message=${3:-"Auto-generated migration"}
            print_status "Running: alembic revision --autogenerate -m \"$message\""
            docker compose exec backend alembic revision --autogenerate -m "$message"
            ;;
        "history")
            print_status "Running: alembic history"
            docker compose exec backend alembic history
            ;;
        "current")
            print_status "Running: alembic current"
            docker compose exec backend alembic current
            ;;
        *)
            print_error "Unknown action: $action"
            exit 1
            ;;
    esac
}

# Function to show help
show_help() {
    echo "Migration script for Disease Community Platform"
    echo ""
    echo "Usage: $0 <environment> <action> [message]"
    echo ""
    echo "Environments:"
    echo "  dev     Development environment"
    echo "  prod    Production environment"
    echo "  test    Test environment"
    echo ""
    echo "Actions:"
    echo "  upgrade     Apply all pending migrations"
    echo "  downgrade   Rollback last migration"
    echo "  revision    Create new migration (requires message)"
    echo "  history     Show migration history"
    echo "  current     Show current migration"
    echo ""
    echo "Examples:"
    echo "  $0 dev upgrade"
    echo "  $0 prod downgrade"
    echo "  $0 test revision \"Add user profile table\""
    echo "  $0 dev history"
    echo "  $0 prod current"
    echo ""
    echo "Environment variables:"
    echo "  DATABASE_URL    Override database connection string"
}

# Main execution
main() {
    if [ $# -lt 2 ]; then
        show_help
        exit 1
    fi
    
    local environment=$1
    local action=$2
    local message=$3
    
    print_status "Starting migration process..."
    print_info "Environment: $environment"
    print_info "Action: $action"
    
    # Validate environment
    if [[ ! "$environment" =~ ^(dev|prod|test)$ ]]; then
        print_error "Invalid environment: $environment"
        print_error "Valid environments: dev, prod, test"
        exit 1
    fi
    
    # Validate action
    if [[ ! "$action" =~ ^(upgrade|downgrade|revision|history|current)$ ]]; then
        print_error "Invalid action: $action"
        print_error "Valid actions: upgrade, downgrade, revision, history, current"
        exit 1
    fi
    
    # Check if message is provided for revision
    if [ "$action" = "revision" ] && [ -z "$message" ]; then
        print_error "Message is required for revision action"
        print_error "Usage: $0 $environment revision \"Your message here\""
        exit 1
    fi
    
    # Run migration
    run_migration $environment $action "$message"
    
    print_status "Migration process completed!"
}

# Run main function
main "$@"


