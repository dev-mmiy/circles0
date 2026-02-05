import './globals.css';
import Auth0ProviderAdmin from '@/components/Auth0ProviderAdmin';
import AdminLayout from '@/components/AdminLayout';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Auth0ProviderAdmin>
          <AdminLayout>{children}</AdminLayout>
        </Auth0ProviderAdmin>
      </body>
    </html>
  );
}
