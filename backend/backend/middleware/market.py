"""
Market detection middleware for FastAPI.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp

from app.markets import DEFAULT_MARKET, MARKETS, SUPPORTED_MARKETS


class MarketMiddleware(BaseHTTPMiddleware):
    """Middleware to detect and set market context."""

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        market_code = self.detect_market(request)
        request.state.market = market_code
        request.state.market_config = MARKETS.get(market_code, MARKETS[DEFAULT_MARKET])
        response = await call_next(request)
        return response

    def detect_market(self, request: Request) -> str:
        """Detect market from request parameters."""
        # Check URL parameter first
        if market := request.query_params.get("market"):
            if market in SUPPORTED_MARKETS:
                return market

        # Check header
        if market := request.headers.get("x-market"):
            if market in SUPPORTED_MARKETS:
                return market

        # Check Accept-Language header
        if accept_lang := request.headers.get("accept-language"):
            # Simple language detection
            if "ja" in accept_lang.lower():
                return "ja-jp"
            if "en" in accept_lang.lower():
                return "en-us"

        # Check cookie
        if market := request.cookies.get("market"):
            if market in SUPPORTED_MARKETS:
                return market

        # Default to en-us
        return DEFAULT_MARKET
