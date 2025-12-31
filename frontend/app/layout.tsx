import './globals.css';
import { headers } from 'next/headers';
import { routing } from '@/i18n/routing';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Get locale from pathname via custom header set by middleware
  let locale: 'ja' | 'en' = routing.defaultLocale;
  try {
    const headersList = await headers();
    const pathname = headersList.get('x-pathname') || '';

    if (pathname) {
      const segments = pathname.split('/').filter(Boolean);
      const firstSegment = segments[0];
      if (routing.locales.includes(firstSegment as any)) {
        locale = firstSegment as 'ja' | 'en';
      }
    }
  } catch (error) {
    // Fallback to default locale if header access fails
    console.warn('Failed to get locale from headers, using default:', error);
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="font-sans">{children}</body>
    </html>
  );
}
