/**
 * Hashtag Search Component
 * Search for hashtags and display posts containing them
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  searchHashtags,
  getPostsByHashtag,
  getPopularHashtags,
  type Hashtag,
} from '@/lib/api/search';
import { Post } from '@/lib/api/posts';
import PostCard from './PostCard';

interface HashtagSearchProps {
  onSearch?: (hashtag: string) => void;
  initialHashtag?: string;
}

export function HashtagSearch({ onSearch, initialHashtag }: HashtagSearchProps) {
  const { getAccessTokenSilently } = useAuth0();
  const t = useTranslations('hashtagSearch');
  const [searchQuery, setSearchQuery] = useState(initialHashtag || '');
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(initialHashtag || null);
  const [hashtagSuggestions, setHashtagSuggestions] = useState<Hashtag[]>([]);
  const [popularHashtags, setPopularHashtags] = useState<Hashtag[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [skip, setSkip] = useState(0);
  const limit = 20;

  // Load popular hashtags on mount
  useEffect(() => {
    const loadPopularHashtags = async () => {
      try {
        const accessToken = await getAccessTokenSilently().catch(() => undefined);
        const popular = await getPopularHashtags(10, accessToken);
        setPopularHashtags(popular);
      } catch (err) {
        console.error('Failed to load popular hashtags:', err);
      }
    };
    loadPopularHashtags();
  }, [getAccessTokenSilently]);

  const handleHashtagSearch = async (query: string) => {
    if (!query.trim()) {
      setHashtagSuggestions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const accessToken = await getAccessTokenSilently().catch(() => undefined);
      const hashtags = await searchHashtags({ q: query, limit: 10 }, accessToken);
      setHashtagSuggestions(hashtags);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Hashtag search error:', err);
      setError(err instanceof Error ? err.message : t('errors.searchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleHashtagSelect = async (hashtagName: string) => {
    setSelectedHashtag(hashtagName);
    setSearchQuery(hashtagName);
    setShowSuggestions(false);
    setSkip(0);
    setError(null);

    if (onSearch) {
      onSearch(hashtagName);
    }

    // Load posts for this hashtag
    setLoadingPosts(true);
    try {
      const accessToken = await getAccessTokenSilently().catch(() => undefined);
      const postsData = await getPostsByHashtag(hashtagName, 0, limit, accessToken);
      setPosts(postsData);
    } catch (err) {
      console.error('Failed to load posts:', err);
      setError(err instanceof Error ? err.message : t('errors.loadPostsFailed'));
    } finally {
      setLoadingPosts(false);
    }
  };

  // Load posts if initial hashtag is provided
  useEffect(() => {
    if (initialHashtag) {
      handleHashtagSelect(initialHashtag);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHashtag]);

  // Search hashtags as user types
  useEffect(() => {
    if (searchQuery.trim().length > 0 && !selectedHashtag) {
      const timeoutId = setTimeout(() => {
        handleHashtagSearch(searchQuery);
      }, 300); // Debounce 300ms

      return () => clearTimeout(timeoutId);
    } else {
      setHashtagSuggestions([]);
      setShowSuggestions(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedHashtag]);

  const loadMorePosts = async () => {
    if (!selectedHashtag || loadingPosts) return;

    setLoadingPosts(true);
    try {
      const accessToken = await getAccessTokenSilently().catch(() => undefined);
      const newPosts = await getPostsByHashtag(selectedHashtag, skip + limit, limit, accessToken);
      setPosts(prev => [...prev, ...newPosts]);
      setSkip(prev => prev + limit);
    } catch (err) {
      console.error('Failed to load more posts:', err);
      setError(err instanceof Error ? err.message : t('errors.loadPostsFailed'));
    } finally {
      setLoadingPosts(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setSelectedHashtag(null);
                setPosts([]);
              }}
              onFocus={() => {
                if (hashtagSuggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              placeholder={t('placeholder')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-5 h-5 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              if (searchQuery.trim()) {
                handleHashtagSelect(searchQuery.trim().replace(/^#/, ''));
              }
            }}
            disabled={!searchQuery.trim() || loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {t('search')}
          </button>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && hashtagSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {hashtagSuggestions.map(hashtag => (
              <button
                key={hashtag.id}
                onClick={() => handleHashtagSelect(hashtag.name)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  #{hashtag.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Popular Hashtags */}
      {!selectedHashtag && popularHashtags.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('popularHashtags')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {popularHashtags.map(hashtag => (
              <button
                key={hashtag.id}
                onClick={() => handleHashtagSelect(hashtag.name)}
                className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                #{hashtag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Posts List */}
      {selectedHashtag && (
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {t('postsForHashtag', { hashtag: selectedHashtag })}
            </h2>
          </div>

          {loadingPosts && posts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">{t('loading')}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-600 dark:text-gray-400">{t('noPosts')}</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {posts.map(post => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>

              {posts.length >= limit && (
                <div className="mt-6 text-center">
                  <button
                    onClick={loadMorePosts}
                    disabled={loadingPosts}
                    className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingPosts ? t('loading') : t('loadMore')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
