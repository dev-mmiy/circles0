#!/bin/bash

# Run Alembic migration on Cloud SQL
# This script connects to Cloud SQL and runs database migrations

set -e

PROJECT_ID="circles-202510"
INSTANCE_NAME="disease-community-db"
DATABASE_NAME="disease_community"

echo "🗄️ Running database migration on Cloud SQL..."
echo "Project: $PROJECT_ID"
echo "Instance: $INSTANCE_NAME"
echo "Database: $DATABASE_NAME"
echo ""

# Check if Cloud SQL Proxy is running
if ! pgrep -f cloud_sql_proxy > /dev/null; then
    echo "⚠️ Cloud SQL Proxy is not running"
    echo "Starting Cloud SQL Proxy..."
    cloud_sql_proxy -instances=${PROJECT_ID}:asia-northeast1:${INSTANCE_NAME}=tcp:5433 &
    PROXY_PID=$!
    sleep 3
    echo "✅ Cloud SQL Proxy started (PID: $PROXY_PID)"
else
    echo "✅ Cloud SQL Proxy is already running"
fi

# Set DATABASE_URL for migration
export DATABASE_URL="postgresql://appuser:YOUR_PASSWORD@localhost:5433/${DATABASE_NAME}"

# Run migration
echo ""
echo "🔄 Running Alembic migration..."
cd backend
alembic upgrade head

echo ""
echo "✅ Migration completed!"
echo ""
echo "⚠️ Don't forget to update YOUR_PASSWORD in the script with the actual password"

