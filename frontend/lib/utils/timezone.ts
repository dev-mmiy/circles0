/**
 * Timezone utilities for converting UTC timestamps to local time
 * based on user's country and timezone settings
 */

/**
 * Country code to timezone mapping (fallback when timezone is not set)
 * Based on IANA timezone database
 */
const COUNTRY_TIMEZONE_MAP: Record<string, string> = {
  // Asia
  JP: 'Asia/Tokyo',
  CN: 'Asia/Shanghai',
  KR: 'Asia/Seoul',
  TW: 'Asia/Taipei',
  HK: 'Asia/Hong_Kong',
  SG: 'Asia/Singapore',
  MY: 'Asia/Kuala_Lumpur',
  TH: 'Asia/Bangkok',
  ID: 'Asia/Jakarta',
  PH: 'Asia/Manila',
  VN: 'Asia/Ho_Chi_Minh',
  IN: 'Asia/Kolkata',
  PK: 'Asia/Karachi',
  BD: 'Asia/Dhaka',

  // Europe
  GB: 'Europe/London',
  DE: 'Europe/Berlin',
  FR: 'Europe/Paris',
  IT: 'Europe/Rome',
  ES: 'Europe/Madrid',
  NL: 'Europe/Amsterdam',
  BE: 'Europe/Brussels',
  CH: 'Europe/Zurich',
  AT: 'Europe/Vienna',
  SE: 'Europe/Stockholm',
  NO: 'Europe/Oslo',
  DK: 'Europe/Copenhagen',
  FI: 'Europe/Helsinki',
  PL: 'Europe/Warsaw',
  CZ: 'Europe/Prague',
  IE: 'Europe/Dublin',
  PT: 'Europe/Lisbon',
  GR: 'Europe/Athens',
  RU: 'Europe/Moscow',

  // Americas
  US: 'America/New_York', // Default to Eastern Time
  CA: 'America/Toronto', // Default to Eastern Time
  MX: 'America/Mexico_City',
  BR: 'America/Sao_Paulo',
  AR: 'America/Buenos_Aires',
  CL: 'America/Santiago',
  CO: 'America/Bogota',
  PE: 'America/Lima',

  // Oceania
  AU: 'Australia/Sydney',
  NZ: 'Pacific/Auckland',

  // Africa & Middle East
  ZA: 'Africa/Johannesburg',
  EG: 'Africa/Cairo',
  NG: 'Africa/Lagos',
  KE: 'Africa/Nairobi',
  IL: 'Asia/Jerusalem',
  TR: 'Europe/Istanbul',
  SA: 'Asia/Riyadh',
  AE: 'Asia/Dubai',
};

/**
 * Get timezone for a country code
 */
export function getTimezoneForCountry(countryCode: string): string {
  return COUNTRY_TIMEZONE_MAP[countryCode.toUpperCase()] || 'UTC';
}

/**
 * Get timezone string for user (from user profile or country code)
 */
export function getUserTimezone(timezone?: string, countryCode?: string): string {
  return timezone || (countryCode ? getTimezoneForCountry(countryCode) : 'UTC');
}

/**
 * Normalize UTC date string to ensure it's interpreted as UTC
 * If the string doesn't have timezone info, append 'Z' to indicate UTC
 */
function normalizeUtcDateString(dateString: string | undefined | null): string {
  // Handle undefined or null
  if (!dateString) {
    // Return current date as fallback
    return new Date().toISOString();
  }

  // Check if the string already has timezone info
  // ISO 8601 format: YYYY-MM-DDTHH:mm:ss[Z|±HH:mm]
  // Look for 'Z' at the end or timezone offset pattern (+HH:mm or -HH:mm)
  if (dateString.endsWith('Z')) {
    return dateString;
  }

  // Check for timezone offset pattern (e.g., +09:00, -05:00)
  // This pattern appears after the time part (HH:mm:ss)
  const timezoneOffsetPattern = /[+-]\d{2}:\d{2}$/;
  if (timezoneOffsetPattern.test(dateString)) {
    return dateString;
  }

  // If no timezone info, append 'Z' to indicate UTC
  return dateString + 'Z';
}

/**
 * Format date in user's locale and timezone
 * If timezone is not provided, uses browser's local timezone
 */
export function formatDateInTimezone(
  utcDateString: string | undefined | null,
  locale: string,
  timezone?: string,
  countryCode?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  // Normalize the date string to ensure it's interpreted as UTC
  const normalizedDateString = normalizeUtcDateString(utcDateString);
  const utcDate = new Date(normalizedDateString);

  // Check if date is valid
  if (isNaN(utcDate.getTime())) {
    // Return empty string or fallback if date is invalid
    return '';
  }

  // Determine target timezone:
  // 1. Use provided timezone if available
  // 2. Use country-based timezone if countryCode is provided
  // 3. Use browser's local timezone (undefined = browser default)
  const targetTimezone = timezone || (countryCode ? getTimezoneForCountry(countryCode) : undefined);

  const defaultOptions: Intl.DateTimeFormatOptions = {
    ...(targetTimezone && { timeZone: targetTimezone }),
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', defaultOptions).format(
    utcDate
  );
}

/**
 * Format relative time (e.g., "2 hours ago") in user's timezone
 * This calculates the difference based on UTC time
 */
export function formatRelativeTime(
  utcDateString: string | undefined | null,
  locale: string,
  timezone?: string,
  countryCode?: string
): { minutes: number; hours: number; days: number; isRecent: boolean } {
  // Normalize the date string to ensure it's interpreted as UTC
  const normalizedDateString = normalizeUtcDateString(utcDateString);
  const utcDate = new Date(normalizedDateString);

  // Check if date is valid
  if (isNaN(utcDate.getTime())) {
    // Return default values if date is invalid
    return { minutes: 0, hours: 0, days: 0, isRecent: false };
  }

  // Get current UTC time
  const now = new Date();

  // Calculate time difference in milliseconds
  const diffInMs = now.getTime() - utcDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  return {
    minutes: diffInMinutes,
    hours: diffInHours,
    days: diffInDays,
    isRecent: diffInDays < 7,
  };
}
