/**
 * Shared market type definitions
 * Used by both frontend and backend
 */

export interface Market {
  locale: string;        // "en-us", "ja-jp"
  language: string;       // "en", "ja" (ISO 639-1)
  country: string;        // "us", "jp" (ISO 3166-1 alpha-2)
  currency: string;       // "USD", "JPY"
  timezone: string;       // "America/New_York", "Asia/Tokyo"
  dateFormat: string;     // "MM/DD/YYYY", "YYYY/MM/DD"
  numberFormat: string;   // "1,234.56", "1,234.56"
  displayName: string;    // "English (US)", "日本語 (日本)"
  flag: string;          // "🇺🇸", "🇯🇵"
}

export type MarketCode = "en-us" | "ja-jp";
export type LanguageCode = "en" | "ja";
export type CountryCode = "us" | "jp";

export interface MarketDetectionResult {
  market: string;
  confidence: number;
  source: "url-param" | "header" | "accept-language" | "cookie" | "default";
}

