'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import LoginScreen from './LoginScreen';
import Sidebar from './Sidebar';
import AdminGuard from './AdminGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth0();
  const pathname = usePathname();

  if (pathname === '/callback' || pathname === '/forbidden') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-gray-500">読み込み中...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <AdminGuard>
          <main className="flex-1 p-6">{children}</main>
        </AdminGuard>
      </div>
    </div>
  );
}
