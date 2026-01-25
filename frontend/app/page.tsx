import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

/**
 * Root path (/) - redirect to default locale.
 * Middleware normally redirects / -> /ja; this is a fallback if / is reached.
 */
export default function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
