"""
Market utility functions for formatting and localization
"""
from datetime import datetime
from typing import Optional
import pytz
from app.markets import get_market


def format_datetime_for_market(
    dt: datetime, 
    market: str, 
    format_type: str = "datetime"
) -> str:
    """Format datetime for specific market."""
    market_config = get_market(market)
    if not market_config:
        return dt.isoformat()
    
    # Convert to market timezone
    timezone = pytz.timezone(market_config.timezone)
    localized_dt = dt.astimezone(timezone)
    
    if format_type == "date":
        return localized_dt.strftime(market_config.date_format)
    elif format_type == "time":
        return localized_dt.strftime("%H:%M")
    elif format_type == "datetime":
        return localized_dt.strftime(f"{market_config.date_format} %H:%M")
    else:
        return localized_dt.isoformat()


def format_currency_for_market(amount: float, market: str) -> str:
    """Format currency for specific market."""
    market_config = get_market(market)
    if not market_config:
        return str(amount)
    
    # Simple currency formatting (can be enhanced with proper currency formatting)
    if market_config.currency == "USD":
        return f"${amount:,.2f}"
    elif market_config.currency == "JPY":
        return f"¥{amount:,.0f}"
    else:
        return f"{amount:,.2f} {market_config.currency}"


def format_number_for_market(number: float, market: str) -> str:
    """Format number for specific market."""
    market_config = get_market(market)
    if not market_config:
        return str(number)
    
    # Simple number formatting (can be enhanced with proper number formatting)
    return f"{number:,.2f}"


def get_market_timezone(market: str) -> Optional[str]:
    """Get timezone for market."""
    market_config = get_market(market)
    return market_config.timezone if market_config else None


def get_market_currency(market: str) -> Optional[str]:
    """Get currency for market."""
    market_config = get_market(market)
    return market_config.currency if market_config else None


def get_market_date_format(market: str) -> Optional[str]:
    """Get date format for market."""
    market_config = get_market(market)
    return market_config.date_format if market_config else None
