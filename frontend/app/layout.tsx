import type { Metadata } from 'next';
import './globals.css';
import { ApiProvider } from '../contexts/ApiContext';
import Auth0ProviderWithConfig from '../contexts/Auth0ProviderWithConfig';

export const metadata: Metadata = {
  title: 'Disease Community Platform',
  description: 'A platform for people with diseases to connect and share experiences',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Auth0ProviderWithConfig>
          <ApiProvider>{children}</ApiProvider>
        </Auth0ProviderWithConfig>
      </body>
    </html>
  );
}
