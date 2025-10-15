#!/bin/bash

# Setup Cloud SQL for Disease Community Platform
# This script creates a Cloud SQL instance and database

set -e

PROJECT_ID="circles-202510"
REGION="asia-northeast1"
INSTANCE_NAME="disease-community-db"
DATABASE_NAME="disease_community"
DB_USER="appuser"

echo "🗄️ Setting up Cloud SQL..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Instance: $INSTANCE_NAME"
echo ""

# Check if instance already exists
if gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID &>/dev/null; then
    echo "✅ Cloud SQL instance '$INSTANCE_NAME' already exists"
else
    echo "📦 Creating Cloud SQL instance (this may take 5-10 minutes)..."
    gcloud sql instances create $INSTANCE_NAME \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region=$REGION \
        --root-password="$(openssl rand -base64 32)" \
        --project=$PROJECT_ID
    
    echo "✅ Cloud SQL instance created"
fi

# Create database
echo "📊 Creating database '$DATABASE_NAME'..."
gcloud sql databases create $DATABASE_NAME \
    --instance=$INSTANCE_NAME \
    --project=$PROJECT_ID || echo "Database may already exist"

# Generate app password
APP_PASSWORD="$(openssl rand -base64 32)"

# Create user
echo "👤 Creating database user '$DB_USER'..."
gcloud sql users create $DB_USER \
    --instance=$INSTANCE_NAME \
    --password="$APP_PASSWORD" \
    --project=$PROJECT_ID || echo "User may already exist"

# Get connection name
CONNECTION_NAME="$PROJECT_ID:$REGION:$INSTANCE_NAME"

echo ""
echo "✅ Cloud SQL setup completed!"
echo ""
echo "================================================"
echo "📋 Configuration Information"
echo "================================================"
echo ""
echo "Connection Name:"
echo "  $CONNECTION_NAME"
echo ""
echo "DATABASE_URL for GitHub Secrets:"
echo "  postgresql://$DB_USER:$APP_PASSWORD@/$DATABASE_NAME?host=/cloudsql/$CONNECTION_NAME"
echo ""
echo "⚠️ IMPORTANT: Save the DATABASE_URL above!"
echo "   You'll need to add it to GitHub Secrets as 'DATABASE_URL'"
echo ""
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Copy the DATABASE_URL above"
echo "2. Go to GitHub → Settings → Secrets and variables → Actions"
echo "3. Click 'New repository secret'"
echo "4. Name: DATABASE_URL"
echo "5. Value: paste the DATABASE_URL"
echo "6. Update .github/workflows/ci.yml to add:"
echo "   --add-cloudsql-instances=$CONNECTION_NAME"
echo ""

