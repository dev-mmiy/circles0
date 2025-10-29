'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUserProfile, UserProfile } from '@/lib/api/users';

export default function MyProfilePage() {
  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      try {
        const token = await getAccessTokenSilently();
        const data = await getCurrentUserProfile(token);
        setProfile(data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (!isLoading) {
      fetchProfile();
    }
  }, [isAuthenticated, isLoading, user, getAccessTokenSilently]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Log In</h1>
          <p className="text-gray-600 mb-4">You need to be logged in to view your profile.</p>
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h1>
          <p className="text-gray-600 mb-4">Your profile could not be loaded.</p>
        </div>
      </div>
    );
  }

  const genderLabels = {
    male: '男性',
    female: '女性',
    other: 'その他',
    prefer_not_to_say: '回答しない',
  };

  const visibilityLabels = {
    public: '公開',
    limited: '限定公開',
    private: '非公開',
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              {/* Avatar */}
              <div className="relative">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    width={96}
                    height={96}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                    {profile.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{profile.display_name}</h1>
                {profile.username && (
                  <p className="text-gray-600 mt-1">@{profile.username}</p>
                )}
                {profile.show_email && (
                  <p className="text-gray-500 text-sm mt-1">✉ {profile.email}</p>
                )}
              </div>
            </div>

            {/* Edit Button */}
            <Link
              href="/profile/me/edit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              プロフィール編集
            </Link>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">自己紹介</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}
        </div>

        {/* Diseases */}
        {profile.diseases && profile.diseases.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">登録疾患</h2>
            <div className="space-y-2">
              {profile.diseases.map((disease) => (
                <div
                  key={disease.disease_id}
                  className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-blue-600">•</span>
                  <span className="text-gray-800">{disease.disease_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">基本情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">性別</p>
              <p className="text-gray-900">{genderLabels[profile.gender]}</p>
            </div>
            {profile.date_of_birth && (
              <div>
                <p className="text-sm text-gray-500">生年月日</p>
                <p className="text-gray-900">{new Date(profile.date_of_birth).toLocaleDateString('ja-JP')}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">国</p>
              <p className="text-gray-900">📍 {profile.country.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">言語</p>
              <p className="text-gray-900">🌐 {profile.language}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">タイムゾーン</p>
              <p className="text-gray-900">⏰ {profile.timezone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">登録日</p>
              <p className="text-gray-900">📅 {new Date(profile.created_at).toLocaleDateString('ja-JP')}</p>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">プライバシー設定</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">プロフィール公開設定</span>
              <span className="text-gray-900 font-medium">{visibilityLabels[profile.profile_visibility]}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">メールアドレス公開</span>
              <span className="text-gray-900 font-medium">{profile.show_email ? '公開' : '非公開'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">オンライン状態表示</span>
              <span className="text-gray-900 font-medium">{profile.show_online_status ? '表示' : '非表示'}</span>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 hover:underline"
          >
            ← ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

