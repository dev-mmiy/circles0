import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

export default createMiddleware({
  ...routing,
  // Always use locale prefix
  localePrefix: 'always',

  // Disable automatic locale detection based on Accept-Language header
  localeDetection: false
});

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
