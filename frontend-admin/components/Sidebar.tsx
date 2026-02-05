'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'ダッシュボード' },
  { href: '/users', label: 'ユーザー' },
  { href: '/audit', label: '監査ログ' },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 border-r border-gray-200 bg-white min-h-screen p-4">
      <nav className="space-y-1">
        {items.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`block px-3 py-2 rounded-md text-sm ${
              pathname === href || (href !== '/' && pathname.startsWith(href))
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
