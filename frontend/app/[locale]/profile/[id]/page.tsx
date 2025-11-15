'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { getUserPublicProfile, UserPublicProfile } from '@/lib/api/users';
import { getFollowStats, type FollowStats } from '@/lib/api/follows';
import FollowButton from '@/components/FollowButton';
import FollowersList from '@/components/FollowersList';
import FollowingList from '@/components/FollowingList';

export default function PublicProfilePage() {
  const t = useTranslations('publicProfilePage');
  const locale = useLocale();
  const params = useParams();
  const userId = params.id as string;
  const { getAccessTokenSilently, isAuthenticated, user } = useAuth0();
  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [followStats, setFollowStats] = useState<FollowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'followers' | 'following'>('posts');

  const isOwnProfile = user?.sub === profile?.id;

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

        // Fetch follow stats
        try {
          const stats = await getFollowStats(data.id, token);
          setFollowStats(stats);
        } catch (err) {
          console.error('Failed to fetch follow stats:', err);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError(err instanceof Error ? err.message : t('error'));
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId, isAuthenticated, getAccessTokenSilently, t]);

  const handleFollowChange = async (isFollowing: boolean) => {
    if (!followStats) return;

    // Update follower count optimistically
    setFollowStats({
      ...followStats,
      follower_count: followStats.follower_count + (isFollowing ? 1 : -1),
      is_following: isFollowing,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">{t('error')}</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
          >
            {t('goToHome')}
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('profileNotFound')}</h1>
          <p className="text-gray-600 mb-4">{t('profileNotFoundMessage')}</p>
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
          >
            {t('goToHome')}
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
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{profile.nickname}</h1>
                  {profile.username && <p className="text-gray-600 mt-1">@{profile.username}</p>}
                </div>
                {/* Follow Button */}
                {!isOwnProfile && profile && followStats && (
                  <FollowButton
                    userId={profile.id}
                    initialIsFollowing={followStats.is_following}
                    onFollowChange={handleFollowChange}
                  />
                )}
              </div>

              {/* Follow Stats */}
              {followStats && (
                <div className="mt-4 flex items-center space-x-6 text-sm">
                  <button
                    onClick={() => setActiveTab('followers')}
                    className="hover:text-blue-600 transition-colors"
                  >
                    <span className="font-bold">{followStats.follower_count}</span>{' '}
                    <span className="text-gray-500">{t('followers')}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('following')}
                    className="hover:text-blue-600 transition-colors"
                  >
                    <span className="font-bold">{followStats.following_count}</span>{' '}
                    <span className="text-gray-500">{t('following')}</span>
                  </button>
                </div>
              )}

              <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                {profile.country && <span>📍 {profile.country.toUpperCase()}</span>}
                <span>📅 {t('registered')} {new Date(profile.created_at).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US')}</span>
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('bio')}</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-4 px-6 text-sm font-medium transition-colors ${
                  activeTab === 'posts'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('tabs.posts')}
              </button>
              <button
                onClick={() => setActiveTab('followers')}
                className={`py-4 px-6 text-sm font-medium transition-colors ${
                  activeTab === 'followers'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('tabs.followers')}
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={`py-4 px-6 text-sm font-medium transition-colors ${
                  activeTab === 'following'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('tabs.following')}
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'posts' && (
              <div>
                {/* Diseases */}
                {profile.diseases && profile.diseases.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('registeredDiseases')}</h2>
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
                {/* TODO: Add user posts here in the future */}
                <div className="mt-6 text-center text-gray-500">
                  <p>{t('postsComingSoon')}</p>
                </div>
              </div>
            )}

            {activeTab === 'followers' && (
              <FollowersList userId={profile.id} />
            )}

            {activeTab === 'following' && (
              <FollowingList userId={profile.id} />
            )}
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-blue-600 hover:text-blue-700 hover:underline">
            {t('backToHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
