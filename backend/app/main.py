import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

# CORS middleware
allowed_origins = (
    ["*"]
    if ENVIRONMENT == "development"
    else [
        "https://disease-community-frontend-asia-northeast1-disease-community-platform.a.run.app",
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
async def root():
    return {"message": "Hello World!", "environment": ENVIRONMENT, "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": ENVIRONMENT,
        "service": "disease-community-api",
    }


@app.get("/info")
async def info():
    return {
        "service": "Disease Community API",
        "version": "1.0.0",
        "environment": ENVIRONMENT,
        "log_level": LOG_LEVEL,
    }
