/**
 * User Profile Card Component
 * Displays user profile information including member ID, nickname, and basic info
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { UserProfile } from '@/lib/api/users';

interface UserProfileCardProps {
  user: UserProfile;
  onEdit?: () => void;
  showPrivateInfo?: boolean;
}

export function UserProfileCard({ user, onEdit, showPrivateInfo = false }: UserProfileCardProps) {
  const t = useTranslations('userProfileCard');
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

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      {/* Header with avatar */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
        <div className="flex items-center space-x-4">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.nickname}
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
              <p className="text-gray-700">{user.country}</p>
            </div>
          )}
          {user.preferred_language && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">{t('language')}</h3>
              <p className="text-gray-700">{user.preferred_language}</p>
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

        {/* Disease count */}
        {user.diseases && user.diseases.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              {t('diseaseCount')}: <span className="font-semibold">{user.diseases.length}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
