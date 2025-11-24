/**
 * User Profile Card Component
 * Displays user profile information including member ID, nickname, and basic info
 */

'use client';

import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { UserProfile, UserDiseaseDetailed } from '@/lib/api/users';
import { getCountryName } from '@/lib/utils/countries';
import { DiseaseList } from './DiseaseList';

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
}: UserProfileCardProps) {
  const t = useTranslations('userProfileCard');
  const tLanguage = useTranslations('languageSwitcher');
  const locale = useLocale();
  
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
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      {/* Header with avatar */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
        <div className="flex items-center space-x-4">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
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
            {user.username && <p className="text-blue-100">@{user.username}</p>}
            <p className="text-sm text-blue-200 mt-1">{t('memberId')}: {user.member_id}</p>
          </div>
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              {t('editProfile')}
            </button>
          )}
        </div>
      </div>

      {/* Profile information */}
      <div className="p-6">
        {/* Bio */}
        {user.bio && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">{t('bio')}</h3>
            <p className="text-gray-700">{user.bio}</p>
          </div>
        )}

        {/* Public information */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {user.country && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">{t('country')}</h3>
              <p className="text-gray-700">{getCountryName(user.country, locale)}</p>
            </div>
          )}
          {user.preferred_language && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">{t('language')}</h3>
              <p className="text-gray-700">{formatLanguage(user.preferred_language)}</p>
            </div>
          )}
        </div>

        {/* Private information (only shown to owner) */}
        {showPrivateInfo && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('privateInfo')}</h3>
            <div className="grid grid-cols-2 gap-4">
              {user.first_name && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase mb-1">{t('firstName')}</h4>
                  <p className="text-gray-700">{user.first_name}</p>
                </div>
              )}
              {user.last_name && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase mb-1">{t('lastName')}</h4>
                  <p className="text-gray-700">{user.last_name}</p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-1">{t('email')}</h4>
                <p className="text-gray-700">{user.email}</p>
                {user.email_verified && (
                  <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    {t('emailVerified')}
                  </span>
                )}
              </div>
              {user.phone && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase mb-1">{t('phone')}</h4>
                  <p className="text-gray-700">{user.phone}</p>
                </div>
              )}
              {user.date_of_birth && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase mb-1">{t('dateOfBirth')}</h4>
                  <p className="text-gray-700">{formatDate(user.date_of_birth)}</p>
                </div>
              )}
              {user.gender && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase mb-1">{t('gender')}</h4>
                  <p className="text-gray-700">{formatGender(user.gender)}</p>
                </div>
              )}
            </div>

 
            {/* User Diseases - shown at the end of private information */}
            {userDiseases !== undefined && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase">{t('myDiseases')}</h3>
                  {addDiseaseButtonHref && (
                    <Link
                      href={addDiseaseButtonHref}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      {addDiseaseButtonLabel || t('addDisease')}
                    </Link>
                  )}
                </div>
              {/* Disease count */}
                {user.diseases && user.diseases.length > 0 && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      {t('diseaseCount')}: <span className="font-semibold">{user.diseases.length}</span>
                    </p>
                  </div>
                )}
                {loadingUserDiseases ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">{t('loading')}</p>
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
                  <p className="text-sm text-gray-500">{t('noDiseases')}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Account information */}
        <div className="border-t pt-6 mt-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="text-gray-500 mb-1">{t('accountCreated')}</h4>
              <p className="text-gray-700">{formatDate(user.created_at)}</p>
            </div>
            {user.last_login_at && (
              <div>
                <h4 className="text-gray-500 mb-1">{t('lastLogin')}</h4>
                <p className="text-gray-700">{formatDate(user.last_login_at)}</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
