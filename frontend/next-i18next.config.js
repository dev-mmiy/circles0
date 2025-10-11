module.exports = {
  i18n: {
    defaultLocale: 'en-us',
    locales: ['en-us', 'ja-jp'],
    localeDetection: true,
  },
  reloadOnPrerender: process.env.NODE_ENV === 'development',
  fallbackLng: {
    default: ['en-us'],
  },
  debug: process.env.NODE_ENV === 'development',
  saveMissing: process.env.NODE_ENV === 'development',
  strictMode: true,
  serializeConfig: false,
  react: {
    useSuspense: false,
  },
};
