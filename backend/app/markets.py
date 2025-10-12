"""
Market configuration for internationalization.
"""

import json
import os
from dataclasses import dataclass


@dataclass
class Market:
    """Market configuration for internationalization."""

    locale: str
    language: str
    country: str
    currency: str
    timezone: str
    date_format: str
    number_format: str
    display_name: str
    flag: str


# Load market configuration from JSON file
def load_market_config():
    """Load market configuration from JSON file."""
    config_path = os.path.join(os.path.dirname(__file__), "../config/markets.json")
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    markets = {}
    for locale, market_data in config["markets"].items():
        markets[locale] = Market(**market_data)

    return markets, config["default"], config["supported"]


# Load market configuration
MARKETS, DEFAULT_MARKET, SUPPORTED_MARKETS = load_market_config()
