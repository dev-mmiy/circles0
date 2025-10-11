/**
 * Market definitions for internationalization
 * Based on ISO 3166-1 alpha-2 (Country) and ISO 639-1 (Language)
 */

export interface Market {
  locale: string;
  language: string;
  country: string;
  currency: string;
  timezone: string;
  date_format: string;
  number_format: string;
  display_name: string;
  flag: string;
}

// Market configuration
export const MARKETS: Record<string, Market> = {
  "en-us": {
    locale: "en-us",
    language: "en",
    country: "us",
    currency: "USD",
    timezone: "America/New_York",
    date_format: "MM/DD/YYYY",
    number_format: "1,234.56",
    display_name: "English (US)",
    flag: "🇺🇸"
  },
  "ja-jp": {
    locale: "ja-jp",
    language: "ja",
    country: "jp",
    currency: "JPY",
    timezone: "Asia/Tokyo",
    date_format: "YYYY/MM/DD",
    number_format: "1,234.56",
    display_name: "日本語 (日本)",
    flag: "🇯🇵"
  }
};

export const DEFAULT_MARKET = "en-us";
export const SUPPORTED_MARKETS = ["en-us", "ja-jp"];

// Market detection order
export const MARKET_DETECTION_ORDER = [
  "url-param",
  "header", 
  "accept-language",
  "cookie",
  "default"
];

// Helper functions
export const getMarket = (locale: string): Market | undefined => {
  return MARKETS[locale];
};

export const getMarketByLanguage = (language: string): Market | undefined => {
  return Object.values(MARKETS).find(market => market.language === language);
};

export const getMarketByCountry = (country: string): Market | undefined => {
  return Object.values(MARKETS).find(market => market.country === country);
};

export const isValidMarket = (locale: string): boolean => {
  return locale in MARKETS;
};

export const getMarketDisplayName = (locale: string): string => {
  const market = getMarket(locale);
  return market ? market.display_name : locale;
};

export const getMarketFlag = (locale: string): string => {
  const market = getMarket(locale);
  return market ? market.flag : "🌍";
};
