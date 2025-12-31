/**
 * Locale utility functions
 *
 * Helper functions for working with i18n locales
 */

/**
 * Get current locale from pathname
 * @param pathname - Current pathname (e.g., '/ja/feed' or '/en/feed')
 * @returns Current locale ('ja' or 'en'), defaults to 'ja'
 */
export function getLocaleFromPathname(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  // Check if first segment is a valid locale
  if (firstSegment === 'ja' || firstSegment === 'en') {
    return firstSegment;
  }

  // Default to 'ja' if no locale found
  return 'ja';
}

/**
 * Get current locale from window.location.pathname
 * @returns Current locale ('ja' or 'en'), defaults to 'ja'
 */
export function getCurrentLocale(): string {
  if (typeof window === 'undefined') {
    return 'ja'; // Default for SSR
  }

  return getLocaleFromPathname(window.location.pathname);
}

/**
 * Add locale prefix to a path
 * @param path - Path without locale prefix (e.g., '/feed' or '/posts/123')
 * @param locale - Locale to use (defaults to current locale)
 * @returns Path with locale prefix (e.g., '/ja/feed' or '/en/posts/123')
 */
export function addLocalePrefix(path: string, locale?: string): string {
  const currentLocale = locale || getCurrentLocale();

  // Check if path already has a locale prefix
  const segments = path.split('/').filter(Boolean);
  if (segments.length > 0 && (segments[0] === 'ja' || segments[0] === 'en')) {
    // Path already has locale prefix, return as is
    return path.startsWith('/') ? path : `/${path}`;
  }

  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // Add locale prefix
  return `/${currentLocale}/${cleanPath}`;
}
