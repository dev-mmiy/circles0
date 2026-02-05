'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, AdminUserListResponse } from '@/lib/api/admin';

export default function UsersPage() {
  const [data, setData] = useState<AdminUserListResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState<boolean | ''>('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [submitSearch, setSubmitSearch] = useState('');

  const load = useCallback(() => {
    adminApi
      .getUsers({
        page,
        per_page: 20,
        search: submitSearch || undefined,
        is_active: isActive === '' ? undefined : isActive,
        include_deleted: includeDeleted,
        sort: 'created_at',
        order: 'desc',
      })
      .then((r) => setData(r.data))
      .catch((e) => setErr(e?.response?.data?.detail || String(e)));
  }, [page, submitSearch, isActive, includeDeleted]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">ユーザー一覧</h1>
      {err && <p className="text-red-600 mb-4">{err}</p>}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="search"
          placeholder="email / nickname / member_id"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setSubmitSearch(search), setPage(1))}
          className="border rounded px-3 py-2 w-64"
        />
        <button
          onClick={() => (setSubmitSearch(search), setPage(1))}
          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
        >
          検索
        </button>
        <select
          value={String(isActive)}
          onChange={(e) => (setIsActive(e.target.value === '' ? '' : e.target.value === 'true'), setPage(1))}
          className="border rounded px-3 py-2"
        >
          <option value="">すべて</option>
          <option value="true">有効</option>
          <option value="false">無効</option>
        </select>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => (setIncludeDeleted(e.target.checked), setPage(1))}
          />
          削除済みを含む
        </label>
      </div>
      {data && (
        <>
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">会員ID</th>
                  <th className="px-4 py-2 text-left">email</th>
                  <th className="px-4 py-2 text-left">ニックネーム</th>
                  <th className="px-4 py-2 text-left">状態</th>
                  <th className="px-4 py-2 text-left">登録日</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-4 py-2">{u.member_id}</td>
                    <td className="px-4 py-2">{u.email}</td>
                    <td className="px-4 py-2">{u.nickname}</td>
                    <td className="px-4 py-2">
                      {u.deleted_at ? (
                        <span className="text-red-600">削除済</span>
                      ) : u.is_active ? (
                        <span className="text-green-600">有効</span>
                      ) : (
                        <span className="text-gray-500">無効</span>
                      )}
                    </td>
                    <td className="px-4 py-2">{new Date(u.created_at).toLocaleDateString('ja')}</td>
                    <td className="px-4 py-2">
                      <Link href={`/users/${u.id}`} className="text-blue-600 hover:underline">
                        詳細
                      </Link>
                    </td>
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
