"""
Market detection middleware for FastAPI
"""
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from typing import Optional
import re

from app.markets import (
    MARKETS, 
    DEFAULT_MARKET, 
    get_market, 
    is_valid_market,
    MARKET_DETECTION_ORDER
)


class MarketMiddleware(BaseHTTPMiddleware):
    """Middleware to detect and set market for requests."""
    
    async def dispatch(self, request: Request, call_next):
        # Detect market
        market = self.detect_market(request)
        
        # Set market in request state
        request.state.market = market
        request.state.market_config = get_market(market)
        
        # Process request
        response = await call_next(request)
        
        # Add market info to response headers
        response.headers["X-Market"] = market
        
        return response
    
    def detect_market(self, request: Request) -> str:
        """Detect market from request."""
        
        # 1. URL parameter
        if market := request.query_params.get("market"):
            if is_valid_market(market):
                return market
        
        # 2. Header
        if market := request.headers.get("x-market"):
            if is_valid_market(market):
                return market
        
        # 3. Accept-Language header
        if accept_lang := request.headers.get("accept-language"):
            market = self.parse_accept_language(accept_lang)
            if market:
                return market
        
        # 4. Cookie
        if market := request.cookies.get("market"):
            if is_valid_market(market):
                return market
        
        # 5. Default
        return DEFAULT_MARKET
    
    def parse_accept_language(self, accept_language: str) -> Optional[str]:
        """Parse Accept-Language header to detect market."""
        # Split by comma and process each language
        languages = [lang.strip().split(';')[0] for lang in accept_language.split(',')]
        
        for lang in languages:
            # Check for exact match (e.g., "ja-JP")
            exact_match = lang.lower().replace('_', '-')
            if is_valid_market(exact_match):
                return exact_match
            
            # Check for language match (e.g., "ja" -> "ja-jp")
            language = lang.split('-')[0].lower()
            if language == 'ja':
                return 'ja-jp'
            if language == 'en':
                return 'en-us'
        
        return None


def get_market_from_request(request: Request) -> str:
    """Get market from request state."""
    return getattr(request.state, 'market', DEFAULT_MARKET)


def get_market_config_from_request(request: Request):
    """Get market config from request state."""
    return getattr(request.state, 'market_config', get_market(DEFAULT_MARKET))
