#!/bin/bash

# Stop local development environment
# Kills backend and frontend processes

set -e

echo "🛑 Stopping local development services..."

# Kill backend processes (uvicorn)
pkill -f "uvicorn app.main:app" || echo "No backend process found"

# Kill frontend processes (next dev)
pkill -f "next dev" || echo "No frontend process found"

# Optionally stop PostgreSQL (uncomment if needed)
# docker-compose stop postgres

echo "✅ Services stopped!"
