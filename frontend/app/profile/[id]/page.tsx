'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getUserPublicProfile, UserPublicProfile } from '@/lib/api/users';

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        let token: string | undefined;

        // Try to get access token if authenticated
        if (isAuthenticated) {
          try {
            token = await getAccessTokenSilently();
          } catch (err) {
            console.log('Failed to get access token, continuing without auth');
          }
        }

        const data = await getUserPublicProfile(userId, token);
        setProfile(data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId, isAuthenticated, getAccessTokenSilently]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
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
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h1>
          <p className="text-gray-600 mb-4">The profile you are looking for could not be found.</p>
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start space-x-6">
            {/* Avatar */}
            <div className="relative">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.nickname}
                  width={96}
                  height={96}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                  {profile.nickname.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{profile.nickname}</h1>
              {profile.username && <p className="text-gray-600 mt-1">@{profile.username}</p>}
              <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                {profile.country && <span>📍 {profile.country.toUpperCase()}</span>}
                <span>📅 登録: {new Date(profile.created_at).toLocaleDateString('ja-JP')}</span>
              </div>
            </div>
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
              {profile.diseases.map(disease => (
                <div
                  key={disease.id}
                  className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-blue-600">•</span>
                  <span className="text-gray-800">{disease.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-blue-600 hover:text-blue-700 hover:underline">
            ← ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
