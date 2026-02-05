'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, AdminUserDetail } from '@/lib/api/admin';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<AdminUserDetail>>({});

  const load = useCallback(() => {
    adminApi
      .getUser(id)
      .then((r) => {
        setUser(r.data);
        setForm({
          email: r.data.email,
          nickname: r.data.nickname,
          first_name: r.data.first_name ?? undefined,
          last_name: r.data.last_name ?? undefined,
          phone: r.data.phone ?? undefined,
          bio: r.data.bio ?? undefined,
          email_verified: r.data.email_verified,
        });
      })
      .catch((e) => setErr(e?.response?.data?.detail || String(e)));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = () => {
    adminApi
      .updateUser(id, form)
      .then((r) => {
        setUser(r.data);
        setEditing(false);
      })
      .catch((e) => setErr(e?.response?.data?.detail || String(e)));
  };

  const onStatus = (is_active: boolean) => {
    if (!confirm(is_active ? '有効にしますか？' : '無効にしますか？')) return;
    adminApi
      .setUserStatus(id, is_active)
      .then((r) => setUser(r.data))
      .catch((e) => setErr(e?.response?.data?.detail || String(e)));
  };

  const onDelete = () => {
    const reason = window.prompt('削除理由（任意）');
    if (!confirm('論理削除します。よろしいですか？')) return;
    adminApi
      .deleteUser(id, reason || undefined)
      .then(() => router.push('/users'))
      .catch((e) => setErr(e?.response?.data?.detail || String(e)));
  };

  if (err) return <p className="text-red-600">{err}</p>;
  if (!user) return <p className="text-gray-500">読み込み中...</p>;

  const deleted = !!user.deleted_at;

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <Link href="/users" className="text-blue-600 hover:underline">
          ← 一覧
        </Link>
        <h1 className="text-xl font-semibold">ユーザー詳細</h1>
      </div>
      <div className="max-w-2xl space-y-4">
        <div className="bg-white border rounded p-4">
          <dl className="grid grid-cols-1 gap-2 text-sm">
            <Row label="会員ID" value={user.member_id} />
            <Row label="email" value={user.email} />
            <Row label="ニックネーム" value={user.nickname} />
            <Row label="氏名" value={[user.last_name, user.first_name].filter(Boolean).join(' ') || '—'} />
            <Row label="電話" value={user.phone || '—'} />
            <Row label="bio" value={user.bio || '—'} />
            <Row label="状態" value={user.deleted_at ? '削除済' : user.is_active ? '有効' : '無効'} />
            <Row label="登録日" value={new Date(user.created_at).toLocaleString('ja')} />
            <Row label="最終ログイン" value={user.last_login_at ? new Date(user.last_login_at).toLocaleString('ja') : '—'} />
          </dl>
          <div className="mt-4 text-sm text-gray-500">
            投稿 {user.stats.posts_count} / フォロワー {user.stats.followers_count} / フォロー中 {user.stats.following_count}
            {user.stats.comments_count != null && ` / コメント ${user.stats.comments_count}`}
            {user.stats.meal_records_count != null && ` / 食事 ${user.stats.meal_records_count}`}
            {user.stats.vital_records_count != null && ` / バイタル ${user.stats.vital_records_count}`}
          </div>
        </div>

        {!deleted && (
          <div className="flex flex-wrap gap-2">
            {!editing ? (
              <>
                <button onClick={() => setEditing(true)} className="px-4 py-2 border rounded hover:bg-gray-50">
                  編集
                </button>
                <button
                  onClick={() => onStatus(!user.is_active)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  {user.is_active ? '無効化' : '有効化'}
                </button>
                <button onClick={onDelete} className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50">
                  削除（論理削除）
                </button>
              </>
            ) : (
              <>
                <input
                  value={form.email ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email"
                  className="border rounded px-3 py-2"
                />
                <input
                  value={form.nickname ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
                  placeholder="nickname"
                  className="border rounded px-3 py-2"
                />
                <input
                  value={form.first_name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                  placeholder="first_name"
                  className="border rounded px-3 py-2"
                />
                <input
                  value={form.last_name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                  placeholder="last_name"
                  className="border rounded px-3 py-2"
                />
                <input
                  value={form.phone ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="phone"
                  className="border rounded px-3 py-2"
                />
                <button onClick={onSave} className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">
                  保存
                </button>
                <button onClick={() => setEditing(false)} className="px-4 py-2 border rounded">
                  キャンセル
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 text-gray-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
