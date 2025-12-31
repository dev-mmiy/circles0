'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth0 } from '@auth0/auth0-react';
import Image from 'next/image';
import { X, UserPlus, Trash2, Shield, ShieldAlert, LogOut, Camera, Users } from 'lucide-react';
import {
  Group,
  GroupMember,
  updateGroup,
  addMembers,
  removeMember,
  updateMemberRole,
  deleteGroup,
} from '@/lib/api/groups';
import { searchUsers, UserSearchParams } from '@/lib/api/search';
import { UserPublicProfile } from '@/lib/api/users';
import { useUser } from '@/contexts/UserContext';
import { extractErrorInfo } from '@/lib/utils/errorHandler';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { useRouter } from '@/i18n/routing';
import { setAuthToken } from '@/lib/api/client';
import { AvatarUploadModal } from '@/components/AvatarUploadModal';

interface GroupSettingsModalProps {
  group: Group;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function GroupSettingsModal({
  group,
  isOpen,
  onClose,
  onUpdate,
}: GroupSettingsModalProps) {
  const t = useTranslations('groups');
  const { user: currentUser } = useUser();
  const router = useRouter();
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'danger'>('general');
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [avatarUrl, setAvatarUrl] = useState(group.avatar_url);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<any>(null);
  const [isAvatarUploadModalOpen, setIsAvatarUploadModalOpen] = useState(false);

  // Member search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserPublicProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Update local state when group prop changes
  useEffect(() => {
    setName(group.name);
    setDescription(group.description || '');
    setAvatarUrl(group.avatar_url);
  }, [group.id, group.name, group.description, group.avatar_url]);

  if (!isOpen) return null;

  const isAdmin = group.members.find(m => m.user_id === currentUser?.id)?.is_admin;
  const isCreator = group.creator_id === currentUser?.id;

  const handleUpdateGroup = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    setError(null);
    try {
      const updateData = {
        name: name.trim(),
        description: description.trim() || null,
        avatar_url: avatarUrl || null,
      };
      console.log('Updating group with data:', updateData);
      await updateGroup(group.id, updateData);
      onUpdate();
      // Don't close modal, just show success or update state
    } catch (err) {
      console.error('Failed to update group:', err);
      setError(extractErrorInfo(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUploadComplete = async (newAvatarUrl: string | null) => {
    console.log('Avatar upload complete, new URL:', newAvatarUrl);
    setAvatarUrl(newAvatarUrl);
    setIsAvatarUploadModalOpen(false);
    // Automatically save the avatar URL when changed
    try {
      await updateGroup(group.id, {
        avatar_url: newAvatarUrl || null,
      });
      onUpdate();
    } catch (err) {
      setError(extractErrorInfo(err));
    }
  };

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
          console.log('Token obtained for search');
        } catch (tokenError) {
          console.warn('Failed to get access token:', tokenError);
          setAuthToken(null);
        }
      } else {
        console.warn('User is not authenticated');
      }

      console.log('Searching for users with query:', searchQuery);
      console.log('Access token available:', !!accessToken);
      if (accessToken) {
        console.log('Access token length:', accessToken.length);
      }
      const results = await searchUsers({ q: searchQuery, limit: 10 }, accessToken);
      console.log('Search results received:', results.length, 'users');
      console.log('Search results:', results);

      // Filter out existing members
      const memberIds = new Set(group.members.map(m => m.user_id));
      const filteredResults = results.filter(u => !memberIds.has(u.id));
      console.log(
        'Filtered results (excluding existing members):',
        filteredResults.length,
        'users'
      );

      setSearchResults(filteredResults);
    } catch (err) {
      console.error('Search error:', err);
      const errorInfo = extractErrorInfo(err);
      setError(errorInfo);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      await addMembers(group.id, { user_ids: [userId] });
      onUpdate();
      setSearchResults(searchResults.filter(u => u.id !== userId));
    } catch (err) {
      setError(extractErrorInfo(err));
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm(t('removeMemberConfirm'))) return;
    try {
      await removeMember(group.id, userId);
      onUpdate();
    } catch (err) {
      setError(extractErrorInfo(err));
    }
  };

  const handleUpdateRole = async (userId: string, isAdmin: boolean) => {
    try {
      await updateMemberRole(group.id, userId, { is_admin: isAdmin });
      onUpdate();
    } catch (err) {
      setError(extractErrorInfo(err));
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm(t('leaveGroupConfirm'))) return;
    try {
      await removeMember(group.id, currentUser!.id);
      router.push('/groups');
    } catch (err) {
      setError(extractErrorInfo(err));
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm(t('deleteGroupConfirm'))) return;
    try {
      await deleteGroup(group.id);
      router.push('/groups');
    } catch (err) {
      setError(extractErrorInfo(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">{t('groupSettings')}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'general'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('general')}
          >
            {t('general')}
          </button>
          <button
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'members'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('members')}
          >
            {t('members')}
          </button>
          <button
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'danger'
                ? 'border-b-2 border-red-500 text-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('danger')}
          >
            {t('dangerZone')}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4">
              <ErrorDisplay error={error} onRetry={() => setError(null)} showDetails={false} />
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Avatar Upload Section */}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('groupAvatar') || 'グループアバター'}
                  </label>
                  <div className="flex items-center gap-4">
                    {isAdmin ? (
                      <button
                        onClick={() => setIsAvatarUploadModalOpen(true)}
                        className="relative group cursor-pointer"
                        title={t('changeAvatar') || 'アバターを変更'}
                      >
                        {avatarUrl ? (
                          <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-gray-300">
                              <Image
                                src={avatarUrl}
                                alt={group.name}
                                width={96}
                                height={96}
                                className="rounded-full object-cover w-full h-full transition-opacity group-hover:opacity-80"
                              />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-full transition-all">
                              <span className="text-white text-xs opacity-0 group-hover:opacity-100 font-medium">
                                {t('change') || '変更'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center border-2 border-gray-300 group-hover:bg-blue-200 transition-colors">
                              <Users className="w-12 h-12 text-blue-600" />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-full transition-all">
                              <span className="text-white text-xs opacity-0 group-hover:opacity-100 font-medium">
                                {t('change') || '変更'}
                              </span>
                            </div>
                          </div>
                        )}
                      </button>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-gray-300">
                        {avatarUrl ? (
                          <Image
                            src={avatarUrl}
                            alt={group.name}
                            width={96}
                            height={96}
                            className="rounded-full object-cover w-full h-full"
                          />
                        ) : (
                          <Users className="w-12 h-12 text-blue-600" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('groupName')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('groupDescription')}
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  disabled={!isAdmin}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              {isAdmin && (
                <div className="flex justify-end">
                  <button
                    onClick={handleUpdateGroup}
                    disabled={isSaving || !name.trim()}
                    className="px-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSaving ? t('saving') : t('saveChanges')}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-6">
              {/* Add Member */}
              {isAdmin && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('addMembers')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder={t('searchUsersPlaceholder')}
                      className="flex-1 px-3 py-2 border rounded-lg"
                      onKeyPress={e => e.key === 'Enter' && handleSearch()}
                    />
                    <button
                      onClick={handleSearch}
                      disabled={isSearching || !searchQuery.trim()}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                    >
                      {isSearching ? (
                        <div className="w-5 h-5 border-4 border-gray-700 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        t('search')
                      )}
                    </button>
                  </div>
                  {isSearching && (
                    <div className="text-sm text-gray-500 text-center py-2">
                      {t('searching') || 'Searching...'}
                    </div>
                  )}
                  {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
                    <div className="text-sm text-gray-500 text-center py-2">
                      {t('noSearchResults') || 'No users found'}
                    </div>
                  )}
                  {searchResults.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                      {searchResults.map(user => (
                        <div
                          key={user.id}
                          className="p-2 flex items-center justify-between hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center relative overflow-hidden">
                              {user.avatar_url ? (
                                <Image
                                  src={user.avatar_url}
                                  alt=""
                                  width={32}
                                  height={32}
                                  className="rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-medium">
                                  {user.nickname?.[0] || '?'}
                                </span>
                              )}
                            </div>
                            <span>{user.nickname || 'Unknown'}</span>
                          </div>
                          <button
                            onClick={() => handleAddMember(user.id)}
                            className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                          >
                            <UserPlus className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Member List */}
              <div>
                <h3 className="font-medium mb-2">
                  {t('members')} ({group.members.length})
                </h3>
                <div className="space-y-2">
                  {group.members.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center relative overflow-hidden">
                          {member.user?.avatar_url ? (
                            <Image
                              src={member.user.avatar_url}
                              alt=""
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <span className="font-medium text-gray-600">
                              {member.user?.nickname?.[0] || '?'}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {member.user?.nickname}
                            {member.is_admin && <Shield className="w-4 h-4 text-blue-500" />}
                          </div>
                          {member.user?.username && (
                            <div className="text-xs text-gray-500">@{member.user.username}</div>
                          )}
                        </div>
                      </div>

                      {isAdmin && member.user_id !== currentUser?.id && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateRole(member.user_id, !member.is_admin)}
                            className={`p-1 rounded hover:bg-gray-200 ${
                              member.is_admin ? 'text-blue-600' : 'text-gray-400'
                            }`}
                            title={member.is_admin ? t('removeAdmin') : t('makeAdmin')}
                          >
                            <Shield className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleRemoveMember(member.user_id)}
                            className="p-1 text-red-500 rounded hover:bg-red-50"
                            title={t('removeMember')}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'danger' && (
            <div className="space-y-4">
              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <h3 className="font-medium text-red-800 mb-2">{t('leaveGroup')}</h3>
                <p className="text-sm text-red-600 mb-4">{t('leaveGroupDescription')}</p>
                <button
                  onClick={handleLeaveGroup}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  {t('leaveGroup')}
                </button>
              </div>

              {isCreator && (
                <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                  <h3 className="font-medium text-red-800 mb-2">{t('deleteGroup')}</h3>
                  <p className="text-sm text-red-600 mb-4">{t('deleteGroupDescription')}</p>
                  <button
                    onClick={handleDeleteGroup}
                    className="flex items-center gap-0.5 px-2 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('deleteGroup')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Avatar Upload Modal */}
      <AvatarUploadModal
        isOpen={isAvatarUploadModalOpen}
        onClose={() => setIsAvatarUploadModalOpen(false)}
        onUploadComplete={handleAvatarUploadComplete}
        currentAvatarUrl={avatarUrl || undefined}
      />
    </div>
  );
}
