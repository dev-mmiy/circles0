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
  dateFormat: string;
  numberFormat: string;
  displayName: string;
  flag: string;
}

// Load market configuration
import marketConfig from '../../config/markets.json';

export const MARKETS: Record<string, Market> = marketConfig.markets;
export const DEFAULT_MARKET = marketConfig.default;
export const SUPPORTED_MARKETS = marketConfig.supported;

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
  return market ? market.displayName : locale;
};

export const getMarketFlag = (locale: string): string => {
  const market = getMarket(locale);
  return market ? market.flag : "🌍";
};
