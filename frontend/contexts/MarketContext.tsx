"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Market, getMarket, isValidMarket, DEFAULT_MARKET } from '@/lib/markets';

interface MarketContextType {
  market: string;
  marketConfig: Market | undefined;
  setMarket: (market: string) => void;
  formatDateTime: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatCurrency: (amount: number) => string;
  formatNumber: (number: number) => string;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

interface MarketProviderProps {
  children: ReactNode;
  initialMarket?: string;
}

export const MarketProvider: React.FC<MarketProviderProps> = ({ 
  children, 
  initialMarket 
}) => {
  const [market, setMarketState] = useState<string>(initialMarket || DEFAULT_MARKET);
  const [marketConfig, setMarketConfig] = useState<Market | undefined>(
    getMarket(initialMarket || DEFAULT_MARKET)
  );

  // Update market config when market changes
  useEffect(() => {
    const config = getMarket(market);
    setMarketConfig(config);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('market', market);
    }
  }, [market]);

  // Initialize market from localStorage or URL
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const urlMarket = urlParams.get('market');
    
    if (urlMarket && isValidMarket(urlMarket)) {
      setMarketState(urlMarket);
      return;
    }

    // Check localStorage
    const savedMarket = localStorage.getItem('market');
    if (savedMarket && isValidMarket(savedMarket)) {
      setMarketState(savedMarket);
      return;
    }

    // Check Accept-Language header
    const acceptLanguage = navigator.language;
    if (acceptLanguage) {
      const detectedMarket = detectMarketFromAcceptLanguage(acceptLanguage);
      if (detectedMarket) {
        setMarketState(detectedMarket);
        return;
      }
    }

    // Use default
    setMarketState(DEFAULT_MARKET);
  }, []);

  const setMarket = (newMarket: string) => {
    if (isValidMarket(newMarket)) {
      setMarketState(newMarket);
    }
  };

  const formatDateTime = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
    if (!marketConfig) return date.toISOString();
    
    return new Intl.DateTimeFormat(marketConfig.locale, {
      timeZone: marketConfig.timezone,
      ...options
    }).format(date);
  };

  const formatCurrency = (amount: number): string => {
    if (!marketConfig) return amount.toString();
    
    return new Intl.NumberFormat(marketConfig.locale, {
      style: 'currency',
      currency: marketConfig.currency,
    }).format(amount);
  };

  const formatNumber = (number: number): string => {
    if (!marketConfig) return number.toString();
    
    return new Intl.NumberFormat(marketConfig.locale).format(number);
  };

  return (
    <MarketContext.Provider
      value={{
        market,
        marketConfig,
        setMarket,
        formatDateTime,
        formatCurrency,
        formatNumber
      }}
    >
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = (): MarketContextType => {
  const context = useContext(MarketContext);
  if (context === undefined) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
};

// Helper function to detect market from Accept-Language
const detectMarketFromAcceptLanguage = (acceptLanguage: string): string | null => {
  const languages = acceptLanguage.split(',').map(lang => lang.trim().split(';')[0]);
  
  for (const lang of languages) {
    // Check for exact match (e.g., "ja-JP")
    const exactMatch = lang.toLowerCase().replace('_', '-');
    if (isValidMarket(exactMatch)) {
      return exactMatch;
    }
    
    // Check for language match (e.g., "ja" -> "ja-jp")
    const language = lang.split('-')[0].toLowerCase();
    if (language === 'ja') return 'ja-jp';
    if (language === 'en') return 'en-us';
  }
  
  return null;
};
