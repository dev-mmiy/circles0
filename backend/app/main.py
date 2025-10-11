import os
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.middleware.market import MarketMiddleware

# Environment variables
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

app = FastAPI(
    title="Disease Community API",
    description="API for Disease Community Platform",
    version="1.0.0",
    docs_url="/docs" if ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if ENVIRONMENT == "development" else None,
)

# Add market middleware
app.add_middleware(MarketMiddleware)

# CORS middleware
allowed_origins = (
    ["*"]
    if ENVIRONMENT == "development"
    else [
        "https://disease-community-frontend-asia-northeast1-disease-community-platform.a.run.app",  # noqa: E501
        "https://disease-community-frontend-dev-asia-northeast1-disease-community-platform.a.run.app",  # noqa: E501
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root(request: Request):
    market = getattr(request.state, 'market', 'en-us')
    market_config = getattr(request.state, 'market_config', None)

    return {
        "message": "Hello World!",
        "environment": ENVIRONMENT,
        "version": "1.0.0",
        "market": market,
        "timestamp": datetime.utcnow().isoformat(),
        "timezone": market_config.timezone if market_config else "UTC",
        "currency": market_config.currency if market_config else "USD",
    }


@app.get("/health")
async def health_check(request: Request):
    market = getattr(request.state, 'market', 'en-us')
    return {
        "status": "healthy",
        "environment": ENVIRONMENT,
        "service": "disease-community-api",
        "market": market,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/info")
async def info():
    return {
        "service": "Disease Community API",
        "version": "1.0.0",
        "environment": ENVIRONMENT,
        "log_level": LOG_LEVEL,
    }
