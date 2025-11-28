import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { ApiProvider } from '@/contexts/ApiContext';
import Auth0ProviderWithConfig from '@/contexts/Auth0ProviderWithConfig';
import { UserProvider } from '@/contexts/UserContext';
import { DiseaseProvider } from '@/contexts/DiseaseContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

export const metadata: Metadata = {
  title: 'Disease Community Platform',
  description: 'A platform for people with diseases to connect and share experiences',
};

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Validate that the incoming `locale` parameter is valid
  if (!routing.locales.includes(locale as any)) notFound();

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <Auth0ProviderWithConfig>
              <UserProvider>
                <DiseaseProvider>
                  <NotificationProvider>
                    <ApiProvider>{children}</ApiProvider>
                  </NotificationProvider>
                </DiseaseProvider>
              </UserProvider>
            </Auth0ProviderWithConfig>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
