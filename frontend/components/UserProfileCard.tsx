/**
 * User Profile Card Component
 * Displays user profile information including member ID, nickname, and basic info
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useAuth0 } from '@auth0/auth0-react';
import { Link } from '@/i18n/routing';
import { ExternalLink, Pencil } from 'lucide-react';
import { UserProfile, UserDiseaseDetailed } from '@/lib/api/users';
import { getCountryName } from '@/lib/utils/countries';
import { DiseaseList } from './DiseaseList';
import { AvatarUploadModal } from './AvatarUploadModal';

interface UserProfileCardProps {
  user: UserProfile;
  onEdit?: () => void;
  showPrivateInfo?: boolean;
  userDiseases?: UserDiseaseDetailed[];
  onEditDisease?: (disease: UserDiseaseDetailed) => void;
  onDeleteDisease?: (disease: UserDiseaseDetailed) => void;
  editingDiseaseId?: number | null;
  editForm?: React.ReactNode;
  loadingUserDiseases?: boolean;
  addDiseaseButtonHref?: string;
  addDiseaseButtonLabel?: string;
  onAvatarUpdate?: (avatarUrl: string | null) => Promise<void>;
}

export function UserProfileCard({
  user,
  onEdit,
  showPrivateInfo = false,
  userDiseases,
  onEditDisease,
  onDeleteDisease,
  editingDiseaseId,
  editForm,
  loadingUserDiseases = false,
  addDiseaseButtonHref,
  addDiseaseButtonLabel,
  onAvatarUpdate,
}: UserProfileCardProps) {
  const t = useTranslations('userProfileCard');
  const tLanguage = useTranslations('languageSwitcher');
  const locale = useLocale();
  const { user: auth0User } = useAuth0();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Use avatar_url if available, otherwise fallback to Auth0 picture
  const avatarUrl = user.avatar_url || auth0User?.picture;

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return t('notAvailable');
    const localeMap: Record<string, string> = {
      ja: 'ja-JP',
      en: 'en-US',
    };
    return new Date(dateString).toLocaleDateString(localeMap[locale] || 'ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format gender for display
  const formatGender = (gender?: string) => {
    if (!gender) return t('notAvailable');
    const genderKey = `genderValues.${gender}` as const;
    return t(genderKey, { defaultValue: gender });
  };

  // Format language for display
  const formatLanguage = (languageCode?: string) => {
    if (!languageCode) return t('notAvailable');
    // Use languageSwitcher translations for language names
    const languageKey = `languages.${languageCode}` as const;
    return tLanguage(languageKey, { defaultValue: languageCode });
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
      {/* Header with avatar */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 p-6">
        <div className="flex items-center space-x-4">
          {showPrivateInfo && onAvatarUpdate ? (
            <button
              onClick={() => setIsAvatarModalOpen(true)}
              className="relative group cursor-pointer"
              title={t('changeAvatar')}
            >
              {avatarUrl ? (
                <div className="relative">
                  <Image
                    key={avatarUrl}
                    src={avatarUrl}
                    alt={user.nickname}
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-full border-4 border-white object-cover transition-opacity group-hover:opacity-80"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-full transition-all">
                    <span className="text-white text-xs opacity-0 group-hover:opacity-100 font-medium">
                      {t('change')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full border-4 border-white bg-white flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                  <span className="text-3xl text-blue-600 font-bold">
                    {user.nickname.charAt(0).toUpperCase()}
                  </span>
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-full transition-all">
                    <span className="text-white text-xs opacity-0 group-hover:opacity-100 font-medium">
                      {t('change')}
                    </span>
                  </div>
                </div>
              )}
            </button>
          ) : avatarUrl ? (
            <Image
              key={avatarUrl}
              src={avatarUrl}
              alt={user.nickname}
              width={80}
              height={80}
              className="w-20 h-20 rounded-full border-4 border-white object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full border-4 border-white bg-white flex items-center justify-center">
              <span className="text-3xl text-blue-600 font-bold">
                {user.nickname.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{user.nickname}</h2>
            {user.username && <p className="text-blue-100 dark:text-blue-200">@{user.username}</p>}
            <p className="text-sm text-blue-200 dark:text-blue-100 mt-1">
              {t('memberId')}: {user.member_id}
            </p>
          </div>
          {onEdit && (
            <div className="flex items-center gap-2">
              <Link
                href={`/profile/${user.id}`}
                className="p-2 bg-white dark:bg-gray-100 text-blue-600 dark:text-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-200 transition-colors"
                title={t('viewPublicProfile')}
              >
                <ExternalLink className="w-5 h-5" />
              </Link>
              <button
                onClick={onEdit}
                className="p-2 bg-white dark:bg-gray-100 text-blue-600 dark:text-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-200 transition-colors"
                title={t('editProfile')}
              >
                <Pencil className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile information */}
      <div className="p-6">
        {/* Bio */}
        {user.bio && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
              {t('bio')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300">{user.bio}</p>
          </div>
        )}

        {/* Public information */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {user.country && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                {t('country')}
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                {getCountryName(user.country, locale)}
              </p>
            </div>
          )}
          {user.preferred_language && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                {t('language')}
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                {formatLanguage(user.preferred_language)}
              </p>
            </div>
          )}
        </div>

        {/* Private information (only shown to owner) */}
        {showPrivateInfo && (
          <div className="border-t dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              {t('privateInfo')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {user.first_name && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    {t('firstName')}
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300">{user.first_name}</p>
                </div>
              )}
              {user.last_name && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    {t('lastName')}
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300">{user.last_name}</p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  {t('email')}
                </h4>
                <p className="text-gray-700 dark:text-gray-300">{user.email}</p>
                {user.email_verified && (
                  <span className="inline-block mt-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded">
                    {t('emailVerified')}
                  </span>
                )}
              </div>
              {user.phone && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    {t('phone')}
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300">{user.phone}</p>
                </div>
              )}
              {user.date_of_birth && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    {t('dateOfBirth')}
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300">
                    {formatDate(user.date_of_birth)}
                  </p>
                </div>
              )}
              {user.gender && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    {t('gender')}
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300">{formatGender(user.gender)}</p>
                </div>
              )}
            </div>

            {/* User Diseases - shown at the end of private information */}
            {userDiseases !== undefined && (
              <div className="mt-6 pt-6 border-t dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    {t('myDiseases')}
                  </h3>
                  {addDiseaseButtonHref && (
                    <Link
                      href={addDiseaseButtonHref}
                      className="px-2 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm"
                    >
                      {addDiseaseButtonLabel || t('addDisease')}
                    </Link>
                  )}
                </div>
                {/* Disease count */}
                {user.diseases && user.diseases.length > 0 && (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {t('diseaseCount')}:{' '}
                      <span className="font-semibold">{user.diseases.length}</span>
                    </p>
                  </div>
                )}
                {loadingUserDiseases ? (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('loading')}</p>
                  </div>
                ) : userDiseases.length > 0 ? (
                  <DiseaseList
                    diseases={userDiseases}
                    onEdit={onEditDisease}
                    onDelete={onDeleteDisease}
                    loading={loadingUserDiseases}
                    editingDiseaseId={editingDiseaseId}
                    preferredLanguage={user.preferred_language}
                    editForm={editForm}
                  />
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('noDiseases')}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Account information */}
        <div className="border-t dark:border-gray-700 pt-6 mt-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="text-gray-500 dark:text-gray-400 mb-1">{t('accountCreated')}</h4>
              <p className="text-gray-700 dark:text-gray-300">{formatDate(user.created_at)}</p>
            </div>
            {user.last_login_at && (
              <div>
                <h4 className="text-gray-500 dark:text-gray-400 mb-1">{t('lastLogin')}</h4>
                <p className="text-gray-700 dark:text-gray-300">{formatDate(user.last_login_at)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Avatar Upload Modal */}
      {showPrivateInfo && onAvatarUpdate && (
        <AvatarUploadModal
          isOpen={isAvatarModalOpen}
          onClose={() => setIsAvatarModalOpen(false)}
          onUploadComplete={async avatarUrl => {
            await onAvatarUpdate(avatarUrl);
          }}
          currentAvatarUrl={avatarUrl}
        />
      )}
    </div>
  );
}
