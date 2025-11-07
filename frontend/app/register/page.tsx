'use client';

import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useRouter } from 'next/navigation';
import { createUserProfile } from '@/lib/api/users';

export default function RegisterPage() {
  const { user, getAccessTokenSilently, isLoading } = useAuth0();
  const router = useRouter();
  const [formData, setFormData] = useState({
    nickname: user?.nickname || user?.name || '',
    profile_visibility: 'public' as 'public' | 'limited' | 'private',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const accessToken = await getAccessTokenSilently();

      // Create user profile
      await createUserProfile(accessToken, {
        auth0_id: user?.sub || '',
        email: user?.email || '',
        email_verified: user?.email_verified || false,
        nickname: formData.nickname,
        avatar_url: user?.picture,
        profile_visibility: formData.profile_visibility,
      });

      // Redirect to profile page
      router.push('/profile/me');
    } catch (err) {
      console.error('Failed to create user profile:', err);
      setError(err instanceof Error ? err.message : '会員登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">会員登録</h1>

          <p className="text-gray-600 mb-6">
            ようこそ！プロフィール情報を入力して、会員登録を完了してください。
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (read-only) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                type="email"
                id="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>

            {/* Nickname */}
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
                ニックネーム <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nickname"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                required
                maxLength={50}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="公開用のニックネームを入力"
              />
              <p className="mt-1 text-sm text-gray-500">
                他のユーザーに表示されるニックネームです（50文字以内）
              </p>
            </div>

            {/* Profile Visibility */}
            <div>
              <label htmlFor="profile_visibility" className="block text-sm font-medium text-gray-700 mb-1">
                プロフィール公開設定 <span className="text-red-500">*</span>
              </label>
              <select
                id="profile_visibility"
                name="profile_visibility"
                value={formData.profile_visibility}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="public">公開 - すべてのユーザーが閲覧可能</option>
                <option value="limited">限定公開 - 登録ユーザーのみ閲覧可能</option>
                <option value="private">非公開 - 自分のみ閲覧可能</option>
              </select>
            </div>

            {/* Avatar Preview */}
            {user?.picture && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  プロフィール画像
                </label>
                <div className="flex items-center space-x-4">
                  <img
                    src={user.picture}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <p className="text-sm text-gray-500">
                    Auth0から取得した画像を使用します
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting || !formData.nickname}
                className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '登録中...' : '会員登録を完了する'}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              登録することで、利用規約とプライバシーポリシーに同意したものとみなされます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
