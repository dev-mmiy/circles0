import asyncio
import os
from datetime import datetime, timezone
from typing import Any

# Import dotenv but don't call load_dotenv automatically
# We'll handle .env loading manually to prevent error messages
try:
    from dotenv import load_dotenv
except ImportError:
    # dotenv not available, define a dummy function
    def load_dotenv(*args, **kwargs):
        pass
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.encoders import jsonable_encoder
import json

from app.api.auth import router as auth_router
from app.api.blocks import router as blocks_router
from app.api.diseases import router as diseases_router
from app.api.follows import router as follows_router
from app.api.groups import router as groups_router
from app.api.hashtags import router as hashtags_router
from app.api.images import router as images_router
from app.api.messages import router as messages_router
from app.api.messages_sse import router as messages_sse_router
from app.api.notifications import router as notifications_router
from app.api.notifications_sse import router as notifications_sse_router
from app.api.posts import router as posts_router
from app.api.users import router as users_router
from app.api.vital_records import router as vital_records_router
from app.api.meal_records import router as meal_records_router
from app.api.blood_pressure_records import router as blood_pressure_records_router
from app.api.heart_rate_records import router as heart_rate_records_router
from app.api.temperature_records import router as temperature_records_router
from app.api.weight_records import router as weight_records_router

# Try to import push subscriptions router (optional - requires pywebpush)
try:
    from app.api.push_subscriptions import router as push_subscriptions_router

    PUSH_SUBSCRIPTIONS_AVAILABLE = True
except ImportError:
    PUSH_SUBSCRIPTIONS_AVAILABLE = False
    push_subscriptions_router = None

# Load environment variables from .env if present (ignore if file doesn't exist)
import warnings
from pathlib import Path

# from app.auth.router import router as session_auth_router  # Temporarily disabled
from app.middleware.market import MarketMiddleware

# Load .env file only if it exists and is not empty
# Skip loading in CI/CD environments where .env file is not needed
# Disable python-dotenv's automatic .env file discovery to prevent error messages
os.environ.setdefault("DOTENV_SILENT", "1")
env_file = Path(__file__).parent.parent / ".env"
# Use absolute path to avoid path resolution issues
try:
    env_file_abs = env_file.resolve()
except (FileNotFoundError, OSError, RuntimeError):
    # Path resolution failed, skip .env loading
    env_file_abs = None

if env_file_abs:
    try:
        # Check if file exists and has content before attempting to load
        # Use try-except around exists() and stat() to prevent any error messages
        file_exists = False
        file_size = 0
        try:
            if env_file_abs.exists() and env_file_abs.is_file():
                file_exists = True
                file_size = env_file_abs.stat().st_size
        except (FileNotFoundError, OSError, PermissionError):
            # File doesn't exist or cannot be accessed - this is normal in CI/CD environments
            file_exists = False
            file_size = 0
        
        if file_exists and file_size > 0:
            # File exists and has content, load it with all output suppressed
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                try:
                    import contextlib
                    import logging
                    import sys

                    # Suppress dotenv logger completely
                    logging.getLogger("dotenv").setLevel(logging.CRITICAL)
                    # Redirect both stderr and stdout to /dev/null to suppress all messages
                    with open(os.devnull, 'w') as devnull:
                        with contextlib.redirect_stderr(devnull), contextlib.redirect_stdout(devnull):
                            load_dotenv(dotenv_path=str(env_file_abs), override=False, verbose=False)
                except (FileNotFoundError, OSError, PermissionError, Exception):
                    # Silently ignore errors if .env file cannot be loaded
                    pass
    except Exception:
        # Silently ignore any other errors
        pass

# Environment variables
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
DEBUG = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")

# Configure logging
import logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)  # Main app logger

app = FastAPI(
    title="Disease Community API",
    description="API for Disease Community Platform",
    version="1.0.0",
    docs_url="/docs",  # Always enable docs for debugging
    redoc_url="/redoc",
)

# CORS middleware - MUST be added FIRST (before other middlewares)
# Set allowed origins based on environment
if ENVIRONMENT in ["development", "test"]:
    # Development: Allow all origins for local testing
    allowed_origins = ["*"]
    # Also explicitly add localhost origins for clarity
    allowed_origins.extend(
        [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
        ]
    )
else:
    # Production: Only allow specific frontend URLs
    allowed_origins = [
        "https://lifry.com",
        "http://lifry.com",
        "https://disease-community-frontend-508246122017.asia-northeast1.run.app",
        "https://disease-community-frontend-dev-508246122017.asia-northeast1.run.app",
    ]
    # Allow additional origins from environment variable if set
    # Format: comma-separated list of URLs
    additional_origins = os.getenv("CORS_ALLOWED_ORIGINS", "")
    if additional_origins:
        allowed_origins.extend([origin.strip() for origin in additional_origins.split(",")])

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

# Add request logging middleware to track all incoming requests
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp
import time

# Get logger for middleware
request_logger = logging.getLogger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all incoming requests for debugging."""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        method = request.method
        path = request.url.path
        query_params = str(request.query_params)
        
        # Only log detailed request info in debug mode
        if DEBUG:
            request_logger.info(f"[RequestLogging] Incoming request: {method} {path}?{query_params}")
            has_auth = "Authorization" in request.headers
            if has_auth:
                request_logger.info(f"[RequestLogging] Has Authorization header: {bool(request.headers.get('Authorization', ''))}")
        
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Log slow requests (>1s) or all requests in debug mode
            if DEBUG or process_time > 1.0:
                request_logger.info(f"[RequestLogging] Response: {method} {path} -> {response.status_code} ({process_time:.3f}s)")
            
            return response
        except asyncio.TimeoutError as e:
            process_time = time.time() - start_time
            # Log timeout errors with detailed information
            request_logger.error(
                f"[RequestLogging] Timeout Error: {method} {path} - "
                f"Request timed out after {process_time:.3f}s. "
                f"Query params: {query_params}",
                exc_info=True
            )
            raise
        except Exception as e:
            process_time = time.time() - start_time
            error_type = type(e).__name__
            error_message = str(e)
            
            # Check if it's a timeout-related error
            is_timeout = (
                "timeout" in error_message.lower() or
                "timed out" in error_message.lower() or
                isinstance(e, asyncio.TimeoutError)
            )
            
            if is_timeout:
                request_logger.error(
                    f"[RequestLogging] Timeout Error: {method} {path} - "
                    f"{error_type}: {error_message} (elapsed: {process_time:.3f}s). "
                    f"Query params: {query_params}",
                    exc_info=True
                )
            else:
                # Always log errors with detailed information
                request_logger.error(
                    f"[RequestLogging] Error processing {method} {path}: "
                    f"{error_type}: {error_message} (elapsed: {process_time:.3f}s). "
                    f"Query params: {query_params}",
                    exc_info=True
                )
            raise

app.add_middleware(RequestLoggingMiddleware)


# Helper function to get CORS origin for exception handlers
def get_cors_origin(request: Request) -> str:
    """Get the appropriate CORS origin for the request."""
    origin = request.headers.get("Origin")
    if origin and origin in allowed_origins:
        return origin
    # If no origin or origin not in allowed list, use first allowed origin or "*" for dev
    if ENVIRONMENT in ["development", "test"]:
        return "*"
    # For production, return first allowed origin (or empty string if none)
    return allowed_origins[0] if allowed_origins else ""


# Exception handlers to ensure CORS headers are always present
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions and ensure CORS headers are present."""
    cors_origin = get_cors_origin(request)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions and ensure CORS headers are present."""
    from sqlalchemy.exc import ProgrammingError
    
    logger.error(f"Unhandled Exception: {str(exc)}", exc_info=True)
    cors_origin = get_cors_origin(request)
    
    # Provide more user-friendly error messages for common database errors
    error_detail = str(exc)
    if isinstance(exc, ProgrammingError):
        if "does not exist" in error_detail or "relation" in error_detail.lower():
            error_detail = (
                "Database table not found. This usually means database migrations need to be run. "
                "Please contact the administrator."
            )
        else:
            error_detail = f"Database error: {error_detail}"
    
    return JSONResponse(
        status_code=500,
        content={"detail": error_detail},
        headers={
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )


# Mount static files for local storage (if enabled)
from pathlib import Path
local_upload_dir = os.getenv("LOCAL_UPLOAD_DIR", "./uploads")
local_upload_path = Path(local_upload_dir).resolve()
if local_upload_path.exists():
    try:
        app.mount("/uploads", StaticFiles(directory=str(local_upload_path)), name="uploads")
        logger.info(f"Static files mounted at /uploads from {local_upload_path}")
    except Exception as e:
        logger.warning(f"Failed to mount static files: {e}")

# Include routers
app.include_router(auth_router)
# app.include_router(session_auth_router, prefix="/api/v1", tags=["session-auth"])  # Temporarily disabled
app.include_router(users_router, prefix="/api/v1/users", tags=["users"])
app.include_router(diseases_router, prefix="/api/v1/diseases", tags=["diseases"])
app.include_router(posts_router, prefix="/api/v1", tags=["posts"])
app.include_router(vital_records_router, prefix="/api/v1", tags=["vital-records"])
app.include_router(meal_records_router, prefix="/api/v1", tags=["meal-records"])
app.include_router(blood_pressure_records_router, prefix="/api/v1", tags=["blood-pressure-records"])
app.include_router(heart_rate_records_router, prefix="/api/v1", tags=["heart-rate-records"])
app.include_router(temperature_records_router, prefix="/api/v1", tags=["temperature-records"])
app.include_router(weight_records_router, prefix="/api/v1", tags=["weight-records"])
app.include_router(follows_router, prefix="/api/v1", tags=["follows"])
app.include_router(blocks_router, prefix="/api/v1", tags=["blocks"])
app.include_router(groups_router, prefix="/api/v1", tags=["groups"])
app.include_router(hashtags_router, prefix="/api/v1", tags=["hashtags"])
app.include_router(images_router, prefix="/api/v1", tags=["images"])
app.include_router(messages_router, prefix="/api/v1", tags=["messages"])
app.include_router(
    messages_sse_router,
    prefix="/api/v1/messages",
    tags=["messages", "sse"],
)
app.include_router(
    notifications_router, prefix="/api/v1/notifications", tags=["notifications"]
)
app.include_router(
    notifications_sse_router,
    prefix="/api/v1/notifications",
    tags=["notifications", "sse"],
)
if PUSH_SUBSCRIPTIONS_AVAILABLE:
    app.include_router(
        push_subscriptions_router,
        prefix="/api/v1/push-subscriptions",
        tags=["push-subscriptions"],
    )


@app.get("/")
async def root(request: Request):
    market = getattr(request.state, "market", "en-us")
    market_config = getattr(request.state, "market_config", None)

    return {
        "message": "Hello World!",
        "environment": ENVIRONMENT,
        "version": "1.0.0",
        "market": market,
        "timestamp": datetime.utcnow().isoformat() + "Z",
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
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/info")
async def info():
    return {
        "service": "Disease Community API",
        "version": "1.0.0",
        "environment": ENVIRONMENT,
        "log_level": LOG_LEVEL,
    }


@app.get("/config-check")
async def config_check():
    """Check if required environment variables are configured (without exposing values)."""
    auth0_domain = os.getenv("AUTH0_DOMAIN")
    auth0_audience = os.getenv("AUTH0_AUDIENCE")
    database_url = os.getenv("DATABASE_URL")

    return {
        "environment": ENVIRONMENT,
        "config_status": {
            "auth0_domain_configured": bool(auth0_domain),
            "auth0_domain_value": auth0_domain[:20] + "..." if auth0_domain else None,
            "auth0_audience_configured": bool(auth0_audience),
            "auth0_audience_value": (
                auth0_audience[:30] + "..." if auth0_audience else None
            ),
            "database_url_configured": bool(database_url),
        },
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.on_event("startup")
async def startup_event():
    """Run database migrations and seed data in background on startup."""
    def run_migrations_and_seed():
        """Run migrations and seed data in background thread."""
        import subprocess
        import sys
        
        try:
            # Run migrations
            logger.info("🔄 Running database migrations in background...")
            result = subprocess.run(
                ["alembic", "upgrade", "head"],
                capture_output=True,
                text=True,
                timeout=300,  # 5 minute timeout
            )
            if result.returncode == 0:
                logger.info("✅ Database migrations completed successfully")
            else:
                logger.warning(f"⚠️ Migration warnings: {result.stderr}")
            
            # Run seed data script
            logger.info("🌱 Seeding master data in background...")
            seed_result = subprocess.run(
                [sys.executable, "scripts/seed_final_master_data.py"],
                capture_output=True,
                text=True,
                timeout=300,  # 5 minute timeout
            )
            if seed_result.returncode == 0:
                logger.info("✅ Master data seeding completed successfully")
            else:
                logger.warning(f"⚠️ Seed data warnings: {seed_result.stderr}")
                
        except subprocess.TimeoutExpired:
            logger.warning("⚠️ Migrations or seeding timed out, but continuing...")
        except Exception as e:
            logger.error(f"⚠️ Error during migrations/seeding: {e}", exc_info=True)
            # Don't fail startup - app can still serve requests
    
    # Run migrations and seeding in background thread (non-blocking)
    import threading
    thread = threading.Thread(target=run_migrations_and_seed, daemon=True)
    thread.start()
    logger.info("🚀 Application started, migrations and seeding running in background...")
