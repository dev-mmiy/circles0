'use client';

import { useEffect, useState } from 'react';
import { adminApi, DashboardStats } from '@/lib/api/admin';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getDashboard()
      .then((r) => setStats(r.data))
      .catch((e) => setErr(e?.response?.data?.detail || String(e)));
  }, []);

  if (err) return <p className="text-red-600">{err}</p>;
  if (!stats) return <p className="text-gray-500">読み込み中...</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">ダッシュボード</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="総ユーザー数" value={stats.total_users} />
        <Card label="アクティブ" value={stats.active_users} />
        <Card label="今月の新規" value={stats.new_users_this_month} />
        <Card label="削除済み" value={stats.deleted_users} />
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}
