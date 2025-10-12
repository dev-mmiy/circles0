import type { Metadata } from 'next';
import './globals.css';
import { ApiProvider } from '../contexts/ApiContext';

export const metadata: Metadata = {
  title: 'Disease Community Platform',
  description: 'A platform for people with diseases to connect and share experiences',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <ApiProvider>
          {children}
        </ApiProvider>
      </body>
    </html>
  );
}
