'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Link } from '@/i18n/routing';
import Header from '@/components/Header';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { extractErrorInfo } from '@/lib/utils/errorHandler';
import { createGroup, CreateGroupData } from '@/lib/api/groups';
import { searchUsers, UserSearchParams } from '@/lib/api/search';
import { UserPublicProfile } from '@/lib/api/users';
import { ArrowLeft, X, Search, UserPlus } from 'lucide-react';
import { setAuthToken } from '@/lib/api/client';
import { useUser } from '@/contexts/UserContext';

export default function NewGroupPage() {
  const { isAuthenticated, isLoading: authLoading, getAccessTokenSilently } = useAuth0();
  const { user: currentUser } = useUser();
  const router = useRouter();
  const t = useTranslations('groups');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<UserPublicProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserPublicProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<any>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // 認証チェック
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      if (!isRedirecting) {
        setIsRedirecting(true);
        router.push('/');
      }
      return;
    }
  }, [authLoading, isAuthenticated, router, isRedirecting]);

  // ユーザー検索
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // 認証トークンを取得して設定
      let accessToken: string | undefined;
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          setAuthToken(token);
          accessToken = token;
        } catch (tokenError) {
          console.warn('Failed to get access token:', tokenError);
          setAuthToken(null);
        }
      }

      const params: UserSearchParams = {
        q: searchQuery,
        limit: 20,
      };

      const results = await searchUsers(params, accessToken);
      // 既に選択されているユーザーと自分を除外
      const selectedIds = new Set([
        ...selectedMembers.map(m => m.id),
        currentUser?.id || '',
      ]);
      setSearchResults(results.filter(u => !selectedIds.has(u.id)));
    } catch (err: any) {
      console.error('Search error:', err);
      const errorInfo = extractErrorInfo(err);
      setError(errorInfo);
    } finally {
      setIsSearching(false);
    }
  };

  // Enterキーで検索
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // メンバーを追加
  const handleAddMember = (user: UserPublicProfile) => {
    if (selectedMembers.find(m => m.id === user.id)) {
      return; // 既に追加済み
    }
    setSelectedMembers([...selectedMembers, user]);
    setSearchQuery('');
    setSearchResults([]);
  };

  // メンバーを削除
  const handleRemoveMember = (userId: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== userId));
  };

  // グループを作成
  const handleCreateGroup = async () => {
    if (!name.trim()) {
      alert(t('nameRequired'));
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // 認証トークンを設定
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          setAuthToken(token);
        } catch (tokenError) {
          console.warn('Failed to get access token:', tokenError);
          setAuthToken(null);
        }
      }

      const data: CreateGroupData = {
        name: name.trim(),
        description: description.trim() || null,
        member_ids: selectedMembers.map(m => m.id),
      };

      const group = await createGroup(data);
      router.push(`/groups/${group.id}`);
    } catch (err: any) {
      console.error('Failed to create group:', err);
      const errorInfo = extractErrorInfo(err);
      setError(errorInfo);
    } finally {
      setIsCreating(false);
    }
  };

  if (authLoading || isRedirecting) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-6">
            <Link
              href="/groups"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              {t('backToGroups')}
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{t('createGroup')}</h1>
            <p className="text-gray-600 mt-2">{t('createGroupDescription')}</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6">
              <ErrorDisplay
                error={error}
                onRetry={() => {}}
                showDetails={false}
              />
            </div>
          )}

          {/* Create Group Form */}
          <div className="bg-white rounded-lg shadow p-6">
            {/* Group Name */}
            <div className="mb-6">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                {t('groupName')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('groupNamePlaceholder')}
                maxLength={255}
              />
            </div>

            {/* Group Description */}
            <div className="mb-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                {t('groupDescription')}
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('groupDescriptionPlaceholder')}
                rows={4}
                maxLength={5000}
              />
            </div>

            {/* Add Members */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('addMembers')}
              </label>
              
              {/* Search Input */}
              <div className="flex gap-2 mb-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('searchUsersPlaceholder')}
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSearching ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    t('search')
                  )}
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mb-4 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="p-3 hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.nickname}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600 font-medium">
                              {user.nickname[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{user.nickname}</div>
                          {user.member_id && (
                            <div className="text-sm text-gray-500">ID: {user.member_id}</div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddMember(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title={t('addMember')}
                      >
                        <UserPlus className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Members */}
              {selectedMembers.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    {t('selectedMembers')} ({selectedMembers.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map((member) => (
                      <div
                        key={member.id}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full"
                      >
                        <span className="text-sm font-medium">{member.nickname}</span>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Link
                href="/groups"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('cancel')}
              </Link>
              <button
                onClick={handleCreateGroup}
                disabled={isCreating || !name.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {t('creating')}
                  </span>
                ) : (
                  t('create')
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


