/**
 * Debug utility for conditional logging
 * Only logs in development environment
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const debugLog = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error(...args);
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
};

