# Multi-stage build for production optimization
FROM python:3.11-slim AS base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Development stage
FROM base AS development
COPY . .

# Copy market configuration
COPY config/markets.json /app/config/markets.json
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Production stage
FROM base AS production
COPY . .

# Copy market configuration
COPY config/markets.json /app/config/markets.json

# Expose port (Cloud Run will set PORT environment variable)
EXPOSE 8080

# Run the application (Cloud Run compatible)
# Cloud Run sets PORT=8080, ensure we use it
# Run migrations before starting the server
CMD ["sh", "-c", "echo 'Running database migrations...' && alembic upgrade head && echo 'Starting server on port $PORT' && uvicorn app.main:app --host 0.0.0.0 --port $PORT"]
