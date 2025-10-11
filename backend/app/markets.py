"""
Market definitions for internationalization
Based on ISO 3166-1 alpha-2 (Country) and ISO 639-1 (Language)
"""
import json
import os
from typing import Dict, Optional, List
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
    config_path = os.path.join(os.path.dirname(__file__), '../config/markets.json')
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    markets = {}
    for locale, market_data in config['markets'].items():
        markets[locale] = Market(**market_data)
    
    return markets, config['default'], config['supported']


# Load configuration
MARKETS, DEFAULT_MARKET, SUPPORTED_MARKETS = load_market_config()

# Market detection order
MARKET_DETECTION_ORDER = [
    "url-param",
    "header",
    "accept-language", 
    "cookie",
    "default"
]


def get_market(locale: str) -> Optional[Market]:
    """Get market configuration by locale."""
    return MARKETS.get(locale)


def get_market_by_language(language: str) -> Optional[Market]:
    """Get market configuration by language code."""
    for market in MARKETS.values():
        if market.language == language:
            return market
    return None


def get_market_by_country(country: str) -> Optional[Market]:
    """Get market configuration by country code."""
    for market in MARKETS.values():
        if market.country == country:
            return market
    return None


def is_valid_market(locale: str) -> bool:
    """Check if locale is a valid market."""
    return locale in MARKETS


def get_market_display_name(locale: str) -> str:
    """Get display name for market."""
    market = get_market(locale)
    return market.display_name if market else locale


def get_market_flag(locale: str) -> str:
    """Get flag emoji for market."""
    market = get_market(locale)
    return market.flag if market else "🌍"


def get_supported_languages() -> List[str]:
    """Get list of supported language codes."""
    return list(set(market.language for market in MARKETS.values()))


def get_supported_countries() -> List[str]:
    """Get list of supported country codes."""
    return list(set(market.country for market in MARKETS.values()))
