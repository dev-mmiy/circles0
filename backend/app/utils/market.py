"""
Market utility functions.
"""
from datetime import datetime
import pytz
from typing import Dict, Any

from app.markets import MARKETS, DEFAULT_MARKET


def get_market_config(market_code: str) -> Dict[str, Any]:
    """Get market configuration by code."""
    return MARKETS.get(market_code, MARKETS[DEFAULT_MARKET])


def format_datetime_for_market(
    dt: datetime,
    market_code: str,
    format_key: str = "date_format"
) -> str:
    """
    Format a datetime object according to the specified market's timezone and date format.
    """
    market_config = get_market_config(market_code)
    timezone_str = market_config["timezone"]
    date_format_str = market_config[format_key]

    # Convert to market's timezone
    tz = pytz.timezone(timezone_str)
    localized_dt = dt.astimezone(tz)

    # Format the datetime
    return localized_dt.strftime(date_format_str + " %H:%M")


def format_currency_for_market(amount: float, market_code: str) -> str:
    """Format currency for the specified market."""
    market_config = get_market_config(market_code)
    currency = market_config["currency"]
    number_format = market_config["number_format"]

    # Simple currency formatting
    if currency == "USD":
        return f"${amount:,.2f}"
    elif currency == "JPY":
        return f"¥{amount:,.0f}"
    else:
        return f"{amount:,.2f} {currency}"


def get_market_timezone(market_code: str) -> str:
    """Get timezone for the specified market."""
    market_config = get_market_config(market_code)
    return market_config["timezone"]


def get_market_currency(market_code: str) -> str:
    """Get currency for the specified market."""
    market_config = get_market_config(market_code)
    return market_config["currency"]