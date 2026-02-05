'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, AuditLogListResponse } from '@/lib/api/admin';

const ACTION_LABEL: Record<string, string> = {
  login: 'ログイン',
  user_update: 'ユーザー変更',
  user_status: 'ステータス変更',
  user_delete: 'ユーザー削除',
};

export default function AuditPage() {
  const [data, setData] = useState<AuditLogListResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');

  const load = useCallback(() => {
    adminApi
      .getAuditLogs({ page, per_page: 20, action: action || undefined })
      .then((r) => setData(r.data))
      .catch((e) => setErr(e?.response?.data?.detail || String(e)));
  }, [page, action]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">監査ログ</h1>
      {err && <p className="text-red-600 mb-4">{err}</p>}
      <div className="mb-4">
        <select
          value={action}
          onChange={(e) => (setAction(e.target.value), setPage(1))}
          className="border rounded px-3 py-2"
        >
          <option value="">すべて</option>
          <option value="login">ログイン</option>
          <option value="user_update">ユーザー変更</option>
          <option value="user_status">ステータス変更</option>
          <option value="user_delete">ユーザー削除</option>
        </select>
      </div>
      {data && (
        <>
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">日時</th>
                  <th className="px-4 py-2 text-left">操作</th>
                  <th className="px-4 py-2 text-left">リソース</th>
                  <th className="px-4 py-2 text-left">IP</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="px-4 py-2">{new Date(e.created_at).toLocaleString('ja')}</td>
                    <td className="px-4 py-2">{ACTION_LABEL[e.action] || e.action}</td>
                    <td className="px-4 py-2">
                      {e.resource_type && e.resource_id ? `${e.resource_type}: ${e.resource_id}` : '—'}
                    </td>
                    <td className="px-4 py-2">{e.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              前へ
            </button>
            <span>
              {page} / {data.total_pages} （{data.total} 件）
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
              disabled={page >= data.total_pages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              次へ
            </button>
          </div>
        </>
      )}
    </div>
  );
}
