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
import ScrollHandler from '@/components/ScrollHandler';
import ToasterProvider from '@/components/ToasterProvider';

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
  let messages;
  try {
    messages = await getMessages();
  } catch (error) {
    console.error('Failed to load messages:', error);
    // Fallback to empty messages object to prevent 500 error
    messages = {};
  }

  return (
    <>
      <ScrollHandler />
      <ThemeProvider>
        <NextIntlClientProvider messages={messages}>
          <Auth0ProviderWithConfig>
            <UserProvider>
              <DiseaseProvider>
                <NotificationProvider>
                  <ApiProvider>
                    {children}
                    <ToasterProvider />
                  </ApiProvider>
                </NotificationProvider>
              </DiseaseProvider>
            </UserProvider>
          </Auth0ProviderWithConfig>
        </NextIntlClientProvider>
      </ThemeProvider>
    </>
  );
}
