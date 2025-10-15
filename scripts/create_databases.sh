#!/bin/bash

# Database creation script for Disease Community Platform
# This script creates databases for different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Function to create database
create_database() {
    local db_name=$1
    local db_user=$2
    local db_password=$3
    local host=$4
    local port=${5:-5432}
    
    print_status "Creating database: $db_name"
    
    # Check if database already exists
    if PGPASSWORD=$db_password psql -h $host -p $port -U $db_user -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$db_name'" | grep -q 1; then
        print_warning "Database $db_name already exists"
        return 0
    fi
    
    # Create database
    PGPASSWORD=$db_password psql -h $host -p $port -U $db_user -d postgres -c "CREATE DATABASE $db_name;"
    
    if [ $? -eq 0 ]; then
        print_status "Database $db_name created successfully"
    else
        print_error "Failed to create database $db_name"
        exit 1
    fi
}

# Function to create user
create_user() {
    local username=$1
    local password=$2
    local host=$3
    local port=${4:-5432}
    local admin_user=${5:-postgres}
    local admin_password=${6:-postgres}
    
    print_status "Creating user: $username"
    
    # Check if user already exists
    if PGPASSWORD=$admin_password psql -h $host -p $port -U $admin_user -d postgres -tc "SELECT 1 FROM pg_user WHERE usename = '$username'" | grep -q 1; then
        print_warning "User $username already exists"
        return 0
    fi
    
    # Create user
    PGPASSWORD=$admin_password psql -h $host -p $port -U $admin_user -d postgres -c "CREATE USER $username WITH PASSWORD '$password';"
    
    if [ $? -eq 0 ]; then
        print_status "User $username created successfully"
    else
        print_error "Failed to create user $username"
        exit 1
    fi
}

# Main execution
main() {
    print_status "Starting database creation process..."
    
    # Environment variables with defaults
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-5432}
    DB_ADMIN_USER=${DB_ADMIN_USER:-postgres}
    DB_ADMIN_PASSWORD=${DB_ADMIN_PASSWORD:-postgres}
    
    # Development environment
    if [ "$1" = "dev" ] || [ "$1" = "all" ]; then
        print_status "Setting up development environment..."
        create_database "circles_db_dev" $DB_ADMIN_USER $DB_ADMIN_PASSWORD $DB_HOST $DB_PORT
        create_user "circles_dev" "circles_dev_password" $DB_HOST $DB_PORT $DB_ADMIN_USER $DB_ADMIN_PASSWORD
        PGPASSWORD=$DB_ADMIN_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_ADMIN_USER -d circles_db_dev -c "GRANT ALL PRIVILEGES ON DATABASE circles_db_dev TO circles_dev;"
    fi
    
    # Production environment
    if [ "$1" = "prod" ] || [ "$1" = "all" ]; then
        print_status "Setting up production environment..."
        create_database "circles_db_prod" $DB_ADMIN_USER $DB_ADMIN_PASSWORD $DB_HOST $DB_PORT
        create_user "circles_prod" "circles_prod_password" $DB_HOST $DB_PORT $DB_ADMIN_USER $DB_ADMIN_PASSWORD
        PGPASSWORD=$DB_ADMIN_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_ADMIN_USER -d circles_db_prod -c "GRANT ALL PRIVILEGES ON DATABASE circles_db_prod TO circles_prod;"
    fi
    
    # Test environment
    if [ "$1" = "test" ] || [ "$1" = "all" ]; then
        print_status "Setting up test environment..."
        create_database "circles_db_test" $DB_ADMIN_USER $DB_ADMIN_PASSWORD $DB_HOST $DB_PORT
        create_user "circles_test" "circles_test_password" $DB_HOST $DB_PORT $DB_ADMIN_USER $DB_ADMIN_PASSWORD
        PGPASSWORD=$DB_ADMIN_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_ADMIN_USER -d circles_db_test -c "GRANT ALL PRIVILEGES ON DATABASE circles_db_test TO circles_test;"
    fi
    
    print_status "Database creation process completed!"
}

# Show usage if no arguments provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 [dev|prod|test|all]"
    echo ""
    echo "Examples:"
    echo "  $0 dev     # Create development database"
    echo "  $0 prod    # Create production database"
    echo "  $0 test    # Create test database"
    echo "  $0 all     # Create all databases"
    echo ""
    echo "Environment variables:"
    echo "  DB_HOST              Database host (default: localhost)"
    echo "  DB_PORT              Database port (default: 5432)"
    echo "  DB_ADMIN_USER        Admin user (default: postgres)"
    echo "  DB_ADMIN_PASSWORD    Admin password (default: postgres)"
    exit 1
fi

# Run main function
main $1


