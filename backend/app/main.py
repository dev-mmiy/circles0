import os
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.diseases import router as diseases_router
from app.api.users import router as users_router

# from app.auth.router import router as session_auth_router  # Temporarily disabled
from app.middleware.market import MarketMiddleware

# Load environment variables from .env if present
load_dotenv()

# Environment variables
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

app = FastAPI(
    title="Disease Community API",
    description="API for Disease Community Platform",
    version="1.0.0",
    docs_url="/docs",  # Always enable docs for debugging
    redoc_url="/redoc",
)

# CORS middleware - MUST be added FIRST (before other middlewares)
# Temporarily allow all origins for debugging
allowed_origins = ["*"]

# Production origins (will be used after debugging is complete)
# allowed_origins = (
#     ["*"]
#     if ENVIRONMENT in ["development", "test"]
#     else [
#         "https://disease-community-frontend-508246122017.asia-northeast1.run.app",
#         "https://disease-community-frontend-dev-508246122017.asia-northeast1.run.app",
#     ]
# )

# Add localhost origins for development
if ENVIRONMENT in ["development", "test"]:
    allowed_origins.extend(
        [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
        ]
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add market middleware AFTER CORS
app.add_middleware(MarketMiddleware)

# Include routers
app.include_router(auth_router)
# app.include_router(session_auth_router, prefix="/api/v1", tags=["session-auth"])  # Temporarily disabled
app.include_router(users_router, prefix="/api/v1/users", tags=["users"])
app.include_router(diseases_router, prefix="/api/v1/diseases", tags=["diseases"])


@app.get("/")
async def root(request: Request):
    market = getattr(request.state, "market", "en-us")
    market_config = getattr(request.state, "market_config", None)

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
    market = getattr(request.state, "market", "en-us")
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
