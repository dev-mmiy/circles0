/**
 * Simple translation utility for Header component
 *
 * TODO: Replace with proper i18n library (e.g., next-i18next) in the future
 */

type Translations = {
  [locale: string]: {
    navigation: {
      home: string;
      feed: string;
      userSearch: string;
      myPage: string;
    };
  };
};

const translations: Translations = {
  'ja-jp': {
    navigation: {
      home: 'ホーム',
      feed: 'フィード',
      userSearch: 'ユーザー検索',
      myPage: 'マイページ',
    },
  },
  'en-us': {
    navigation: {
      home: 'Home',
      feed: 'Feed',
      userSearch: 'User Search',
      myPage: 'My Page',
    },
  },
};

/**
 * Get translation for a key based on user's preferred language
 */
export function getTranslation(locale: string | undefined, key: string): string {
  // Default to Japanese if locale is not specified
  const normalizedLocale = locale?.toLowerCase() || 'ja-jp';

  // Support both 'ja-jp' and 'ja' formats
  const localeKey = normalizedLocale.includes('ja')
    ? 'ja-jp'
    : normalizedLocale.includes('en')
    ? 'en-us'
    : 'ja-jp';

  const keys = key.split('.');
  let value: any = translations[localeKey];

  for (const k of keys) {
    value = value?.[k];
  }

  // Fallback to Japanese if translation not found
  if (!value && localeKey !== 'ja-jp') {
    let fallback: any = translations['ja-jp'];
    for (const k of keys) {
      fallback = fallback?.[k];
    }
    return fallback || key;
  }

  return value || key;
}

/**
 * Hook to get translations based on user's preferred language
 */
export function useTranslations(locale: string | undefined) {
  return {
    t: (key: string) => getTranslation(locale, key),
  };
}
