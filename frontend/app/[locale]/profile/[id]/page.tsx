'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import Header from '@/components/Header';
import { getUserPublicProfile, UserPublicProfile } from '@/lib/api/users';
import { getFollowStats, type FollowStats } from '@/lib/api/follows';
import { getUserPosts, type Post } from '@/lib/api/posts';
import { followUser, unfollowUser } from '@/lib/api/follows';
import { blockUser, unblockUser, checkBlockStatus, BlockStatus } from '@/lib/api/users';
import FollowersList from '@/components/FollowersList';
import FollowingList from '@/components/FollowingList';
import PostCard from '@/components/PostCard';
import FollowButton from '@/components/FollowButton';
import BlockButton from '@/components/BlockButton';
import { useUser } from '@/contexts/UserContext';
import { findOrCreateConversation } from '@/lib/api/messages';
import { setAuthToken } from '@/lib/api/client';
import { MessageCircle, UserPlus, UserCheck, Ban } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { getCountryName } from '@/lib/utils/countries';

export default function PublicProfilePage() {
  const t = useTranslations('publicProfilePage');
  const tMessages = useTranslations('messages');
  const tLanguage = useTranslations('languageSwitcher');
  const locale = useLocale();

  // Format language for display
  const formatLanguage = (languageCode?: string) => {
    if (!languageCode) return null;
    const languageKey = `languages.${languageCode}` as const;
    return tLanguage(languageKey, { defaultValue: languageCode });
  };
  const params = useParams();
  const userId = params?.id as string;
  const { getAccessTokenSilently, isAuthenticated, isLoading: authLoading } = useAuth0();
  const { user: currentUser } = useUser();
  const router = useRouter();
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [followStats, setFollowStats] = useState<FollowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'followers' | 'following'>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [blockStatus, setBlockStatus] = useState<BlockStatus | null>(null);
  const [isBlockLoading, setIsBlockLoading] = useState(false);
  const [isCheckingBlock, setIsCheckingBlock] = useState(true);

  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const POSTS_PER_PAGE = 20;

  // Compare UUIDs to determine if this is the current user's profile
  const isOwnProfile = currentUser?.id === profile?.id;

  useEffect(() => {
    // Wait for auth state to be determined
    if (authLoading) {
      return;
    }

    const fetchProfile = async () => {
      try {
        let token: string | undefined;

        // Try to get access token if authenticated
        if (isAuthenticated) {
          try {
            token = await getAccessTokenSilently();
          } catch (err) {
            console.log('Failed to get access token, continuing without auth');
            // If token retrieval fails, we'll try without auth
            // The API will return 403 if auth is required
          }
        }

        const data = await getUserPublicProfile(userId, token);
        setProfile(data);

        // Fetch follow stats
        try {
          const stats = await getFollowStats(data.id, token);
          setFollowStats(stats);
          setIsFollowing(stats.is_following);
        } catch (err) {
          console.error('Failed to fetch follow stats:', err);
        }

        // Check block status
        if (isAuthenticated && token) {
          try {
            const status = await checkBlockStatus(token, data.id);
            setBlockStatus(status);
          } catch (err) {
            console.error('Failed to check block status:', err);
            setBlockStatus({
              is_blocked: false,
              is_blocked_by: false,
              are_blocked: false,
            });
          } finally {
            setIsCheckingBlock(false);
          }
        } else {
          setIsCheckingBlock(false);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        const errorMessage = err instanceof Error ? err.message : t('error');

        // Check if it's a 403 error (authentication required)
        if (
          errorMessage.includes('only visible to authenticated users') ||
          errorMessage.includes('403') ||
          errorMessage.includes('Forbidden')
        ) {
          // If user is authenticated but got 403, it might be a token issue
          if (isAuthenticated) {
            setError(
              t('profileRequiresAuth') ||
                'This profile requires authentication. Please try refreshing the page.'
            );
          } else {
            setError(
              t('profileRequiresAuth') ||
                'This profile is only visible to authenticated users. Please log in to view this profile.'
            );
          }
        } else {
          setError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId, isAuthenticated, authLoading, getAccessTokenSilently, t]);

  const handleFollowChange = async (newIsFollowing: boolean) => {
    // Update follower count optimistically
    if (followStats) {
      setFollowStats({
        ...followStats,
        follower_count: followStats.follower_count + (newIsFollowing ? 1 : -1),
        is_following: newIsFollowing,
      });
    } else {
      // If followStats is not loaded yet, create a default one
      setFollowStats({
        follower_count: newIsFollowing ? 1 : 0,
        following_count: 0,
        is_following: newIsFollowing,
        is_followed_by: false,
      });
    }
    setIsFollowing(newIsFollowing);
  };

  // Handle follow toggle
  const handleFollowToggle = async () => {
    if (!isAuthenticated || !profile) return;

    setIsFollowingLoading(true);
    try {
      const token = await getAccessTokenSilently();
      if (isFollowing) {
        await unfollowUser(profile.id, token);
        handleFollowChange(false);
      } else {
        await followUser(profile.id, token);
        handleFollowChange(true);
      }
    } catch (error: any) {
      console.error('Failed to toggle follow:', error);
      alert(error.message || t('followButton.errors.updateFailed'));
    } finally {
      setIsFollowingLoading(false);
    }
  };

  // Handle block toggle
  const handleBlockToggle = async () => {
    if (!isAuthenticated || !profile || !blockStatus) return;

    setIsBlockLoading(true);
    try {
      const token = await getAccessTokenSilently();
      if (blockStatus.is_blocked) {
        await unblockUser(token, profile.id);
        setBlockStatus({
          ...blockStatus,
          is_blocked: false,
          are_blocked: false,
        });
      } else {
        await blockUser(token, profile.id);
        setBlockStatus({
          ...blockStatus,
          is_blocked: true,
          are_blocked: true,
        });
        // Refresh page if user is blocked
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Failed to toggle block:', error);
      alert(error.message || t('blockButton.errors.updateFailed'));
    } finally {
      setIsBlockLoading(false);
    }
  };

  // Load user posts
  const loadPosts = useCallback(
    async (reset: boolean = false, currentPageOverride?: number) => {
      if (!profile) return;

      try {
        setIsLoadingPosts(reset);
        setIsLoadingMore(!reset);
        setPostsError(null);

        const currentPage = reset ? 0 : currentPageOverride ?? page;
        let accessToken: string | undefined = undefined;

        if (isAuthenticated) {
          try {
            accessToken = await getAccessTokenSilently();
          } catch (err) {
            console.log('Failed to get access token, continuing without auth');
          }
        }

        const fetchedPosts = await getUserPosts(
          profile.id,
          currentPage * POSTS_PER_PAGE,
          POSTS_PER_PAGE,
          undefined, // healthRecordType
          accessToken
        );

        if (reset) {
          setPosts(fetchedPosts);
          setPage(0);
        } else {
          setPosts(prevPosts => [...prevPosts, ...fetchedPosts]);
        }

        setHasMore(fetchedPosts.length === POSTS_PER_PAGE);
      } catch (err) {
        console.error('Failed to load posts:', err);
        setPostsError(err instanceof Error ? err.message : t('errorLoadingPosts'));
      } finally {
        setIsLoadingPosts(false);
        setIsLoadingMore(false);
      }
    },
    [profile, isAuthenticated, getAccessTokenSilently, page, t]
  );

  // Load posts when activeTab changes to 'posts' or profile is loaded
  useEffect(() => {
    if (activeTab === 'posts' && profile) {
      loadPosts(true);
    }
  }, [activeTab, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load more posts
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadPosts(false, nextPage);
    }
  };

  // Handle post updates/deletions
  const handlePostUpdated = () => {
    loadPosts(true);
  };

  const handlePostDeleted = () => {
    loadPosts(true);
  };

  // Handle sending message
  const handleSendMessage = async () => {
    if (!isAuthenticated || !profile || isOwnProfile) {
      return;
    }

    setIsCreatingConversation(true);
    try {
      const token = await getAccessTokenSilently();
      setAuthToken(token);

      const conversationId = await findOrCreateConversation(profile.id);
      router.push(`/messages/${conversationId}`);
    } catch (err) {
      console.error('Failed to create conversation:', err);
      alert(tMessages('errorCreatingConversation'));
    } finally {
      setIsCreatingConversation(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">{t('loading')}</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">{t('error')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Link
              href="/"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
            >
              {t('goToHome')}
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {t('profileNotFound')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{t('profileNotFoundMessage')}</p>
            <Link
              href="/"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
            >
              {t('goToHome')}
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-col gap-6">
              {/* Avatar, Nickname, Username Row */}
              <div className="flex items-center gap-4 md:gap-6">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.nickname}
                      width={96}
                      height={96}
                      className="w-24 h-24 rounded-full object-cover"
                      style={{ width: 'auto', height: 'auto' }}
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                      {profile.nickname.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Nickname and Username */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 break-words">
                    {profile.nickname}
                  </h1>
                  {profile.username && (
                    <p className="text-gray-600 dark:text-gray-400 mt-1 break-words">
                      @{profile.username}
                    </p>
                  )}
                </div>

                {/* Action Buttons - Desktop only */}
                {!isOwnProfile && profile && isAuthenticated && (
                  <div className="hidden md:flex items-center space-x-3 flex-shrink-0">
                    <button
                      onClick={handleSendMessage}
                      disabled={isCreatingConversation}
                      className="flex flex-row items-center justify-center px-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={tMessages('sendMessage')}
                    >
                      {isCreatingConversation ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          <span className="text-xs md:text-sm">
                            {tMessages('creatingConversation')}
                          </span>
                        </>
                      ) : (
                        <>
                          <MessageCircle className="h-4 w-4 mr-2" />
                          <span className="text-xs md:text-sm">{tMessages('sendMessage')}</span>
                        </>
                      )}
                    </button>
                    <FollowButton
                      userId={profile.id}
                      initialIsFollowing={followStats?.is_following ?? false}
                      onFollowChange={handleFollowChange}
                    />
                    <BlockButton
                      userId={profile.id}
                      onBlockChange={isBlocked => {
                        // Refresh page if user is blocked/unblocked
                        if (isBlocked) {
                          window.location.reload();
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons - Mobile only (below avatar) */}
              {!isOwnProfile && profile && isAuthenticated && (
                <div className="md:hidden flex items-center justify-center space-x-2">
                  <button
                    onClick={handleSendMessage}
                    disabled={isCreatingConversation}
                    className="flex flex-col items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={tMessages('sendMessage')}
                  >
                    {isCreatingConversation ? (
                      <>
                        <svg className="animate-spin h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      </>
                    ) : (
                      <MessageCircle className="h-5 w-5 mb-1" />
                    )}
                  </button>
                  <FollowButton
                    userId={profile.id}
                    initialIsFollowing={followStats?.is_following ?? false}
                    onFollowChange={handleFollowChange}
                  />
                  <BlockButton
                    userId={profile.id}
                    onBlockChange={isBlocked => {
                      // Refresh page if user is blocked/unblocked
                      if (isBlocked) {
                        window.location.reload();
                      }
                    }}
                  />
                </div>
              )}

              {/* Basic Info Section */}
              <div className="flex-1 min-w-0">
                {/* Follow Stats */}
                {followStats && (
                  <div className="mt-4 flex items-center space-x-6 text-sm">
                    <button
                      onClick={() => setActiveTab('followers')}
                      className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-gray-700 dark:text-gray-300"
                    >
                      <span className="font-bold">{followStats.follower_count}</span>{' '}
                      <span className="text-gray-500 dark:text-gray-400">{t('followers')}</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('following')}
                      className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-gray-700 dark:text-gray-300"
                    >
                      <span className="font-bold">{followStats.following_count}</span>{' '}
                      <span className="text-gray-500 dark:text-gray-400">{t('following')}</span>
                    </button>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                  {profile.country && <span>📍 {getCountryName(profile.country, locale)}</span>}
                  {profile.preferred_language && formatLanguage(profile.preferred_language) && (
                    <span>🌐 {formatLanguage(profile.preferred_language)}</span>
                  )}
                  <span>
                    📅 {t('registered')}{' '}
                    {new Date(profile.created_at).toLocaleDateString(
                      locale === 'ja' ? 'ja-JP' : 'en-US'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t('bio')}
                </h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {profile.bio}
                </p>
              </div>
            )}

            {/* Registered Diseases */}
            {profile.diseases && profile.diseases.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  {t('registeredDiseases')}
                </h2>
                <div className="space-y-2">
                  {profile.diseases.map(disease => {
                    // Get localized disease name
                    const getDiseaseName = (): string => {
                      if (!disease.translations || disease.translations.length === 0) {
                        return disease.name; // Fallback to English name
                      }

                      // Try to find exact language match
                      const translation = disease.translations.find(
                        t => t.language_code === locale
                      );

                      if (translation) {
                        return translation.translated_name;
                      }

                      // Fallback: try Japanese, then English name
                      const jaTranslation = disease.translations.find(
                        t => t.language_code === 'ja'
                      );
                      return jaTranslation?.translated_name || disease.name;
                    };

                    return (
                      <div
                        key={disease.id}
                        className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <span className="text-blue-600 dark:text-blue-400">•</span>
                        <span className="text-gray-800 dark:text-gray-200">{getDiseaseName()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`py-4 px-6 text-sm font-medium transition-colors ${
                    activeTab === 'posts'
                      ? 'border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {t('tabs.posts')}
                </button>
                <button
                  onClick={() => setActiveTab('followers')}
                  className={`py-4 px-6 text-sm font-medium transition-colors ${
                    activeTab === 'followers'
                      ? 'border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {t('tabs.followers')}
                </button>
                <button
                  onClick={() => setActiveTab('following')}
                  className={`py-4 px-6 text-sm font-medium transition-colors ${
                    activeTab === 'following'
                      ? 'border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {t('tabs.following')}
                </button>
              </nav>
            </div>

            <div className="px-2 py-6">
              {activeTab === 'posts' && (
                <div>
                  {/* Posts */}
                  <div>
                    {isLoadingPosts && posts.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">{t('loadingPosts')}</p>
                      </div>
                    ) : postsError ? (
                      <div className="text-center py-8">
                        <p className="text-red-600 dark:text-red-400 mb-4">
                          {t('errorLoadingPosts')}
                        </p>
                        <button
                          onClick={() => loadPosts(true)}
                          className="px-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          {t('retry')}
                        </button>
                      </div>
                    ) : posts.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-600 dark:text-gray-400">{t('noPosts')}</p>
                        <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                          {t('noPostsMessage')}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {posts.map(post => (
                          <PostCard
                            key={post.id}
                            post={post}
                            showFullContent={false}
                            onPostUpdated={handlePostUpdated}
                            onPostDeleted={handlePostDeleted}
                          />
                        ))}

                        {/* Load More Button */}
                        {hasMore && (
                          <div className="text-center pt-4">
                            <button
                              onClick={handleLoadMore}
                              disabled={isLoadingMore}
                              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isLoadingMore ? t('loadingMore') : t('loadMore')}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'followers' && <FollowersList userId={profile.id} />}

              {activeTab === 'following' && <FollowingList userId={profile.id} />}
            </div>
          </div>

          {/* Back to Home */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              {t('backToHome')}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
