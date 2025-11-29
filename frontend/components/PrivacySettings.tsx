/**
 * Privacy Settings Component
 * Component for managing profile visibility and field-level privacy settings
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslations } from 'next-intl';
import { UserProfile, getFieldVisibilities, setFieldVisibility, updateCurrentUserProfile } from '@/lib/api/users';
import { debugLog } from '@/lib/utils/debug';

interface PrivacySettingsProps {
  user: UserProfile;
  onProfileVisibilityUpdate?: (visibility: 'public' | 'limited' | 'private') => void;
}

export function PrivacySettings({ user, onProfileVisibilityUpdate }: PrivacySettingsProps) {
  const { getAccessTokenSilently } = useAuth0();
  const t = useTranslations('userProfileEdit');
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'limited' | 'private'>(user.profile_visibility || 'limited');
  const [fieldVisibilities, setFieldVisibilities] = useState<Record<string, string>>({});
  const [loadingVisibilities, setLoadingVisibilities] = useState(true);
  const [updatingVisibility, setUpdatingVisibility] = useState<string | null>(null);
  const [updatingProfileVisibility, setUpdatingProfileVisibility] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load field visibilities on mount
  useEffect(() => {
    const loadFieldVisibilities = async () => {
      try {
        const accessToken = await getAccessTokenSilently();
        const response = await getFieldVisibilities(accessToken);
        setFieldVisibilities(response.field_visibilities);
      } catch (err) {
        debugLog.error('Failed to load field visibilities:', err);
      } finally {
        setLoadingVisibilities(false);
      }
    };

    loadFieldVisibilities();
  }, [getAccessTokenSilently]);

  // Handle preset selection
  const handlePresetSelect = async (preset: 'public' | 'limited' | 'private' | 'same_disease_only') => {
    try {
      setError(null);
      const accessToken = await getAccessTokenSilently();
      
      // Update profile visibility
      let newProfileVisibility: 'public' | 'limited' | 'private' = 'limited';
      if (preset === 'public') {
        newProfileVisibility = 'public';
      } else if (preset === 'private') {
        newProfileVisibility = 'private';
      } else {
        newProfileVisibility = 'limited';
      }
      
      setUpdatingProfileVisibility(true);
      await updateCurrentUserProfile(accessToken, { profile_visibility: newProfileVisibility });
      setProfileVisibility(newProfileVisibility);
      if (onProfileVisibilityUpdate) {
        onProfileVisibilityUpdate(newProfileVisibility);
      }
      
      // Update field visibilities based on preset
      const fieldVisibilityMap: Record<string, 'public' | 'limited' | 'private' | 'same_disease_only'> = {
        username: preset === 'public' ? 'public' : preset === 'same_disease_only' ? 'same_disease_only' : 'limited',
        bio: preset === 'public' ? 'public' : preset === 'same_disease_only' ? 'same_disease_only' : 'limited',
        country: preset === 'public' ? 'public' : preset === 'same_disease_only' ? 'same_disease_only' : 'limited',
        date_of_birth: preset === 'private' ? 'private' : preset === 'same_disease_only' ? 'same_disease_only' : 'limited',
        gender: preset === 'private' ? 'private' : preset === 'same_disease_only' ? 'same_disease_only' : 'limited',
        language: preset === 'public' ? 'public' : preset === 'same_disease_only' ? 'same_disease_only' : 'limited',
        preferred_language: preset === 'public' ? 'public' : preset === 'same_disease_only' ? 'same_disease_only' : 'limited',
        email: preset === 'private' ? 'private' : preset === 'same_disease_only' ? 'same_disease_only' : 'limited',
        online_status: preset === 'private' ? 'private' : preset === 'same_disease_only' ? 'same_disease_only' : 'limited',
      };
      
      // Update all field visibilities
      const updates = Object.entries(fieldVisibilityMap).map(([field, visibility]) =>
        setFieldVisibility(accessToken, field, visibility)
      );
      
      await Promise.all(updates);
      
      // Update local state
      setFieldVisibilities(prev => ({ ...prev, ...fieldVisibilityMap }));
    } catch (err) {
      debugLog.error('Failed to apply preset:', err);
      setError(err instanceof Error ? err.message : t('visibilityPresets.applyFailed'));
    } finally {
      setUpdatingProfileVisibility(false);
    }
  };

  // Handle profile visibility change
  const handleProfileVisibilityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVisibility = e.target.value as 'public' | 'limited' | 'private';
    try {
      setError(null);
      setUpdatingProfileVisibility(true);
      const accessToken = await getAccessTokenSilently();
      await updateCurrentUserProfile(accessToken, { profile_visibility: newVisibility });
      setProfileVisibility(newVisibility);
      if (onProfileVisibilityUpdate) {
        onProfileVisibilityUpdate(newVisibility);
      }
    } catch (err) {
      debugLog.error('Failed to update profile visibility:', err);
      setError(err instanceof Error ? err.message : t('errors.saveFailed'));
    } finally {
      setUpdatingProfileVisibility(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Visibility Presets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('visibilityPresets.title')}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('visibilityPresets.description')}</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handlePresetSelect('public')}
            disabled={updatingProfileVisibility}
            className="px-4 py-2 border-2 border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('visibilityPresets.public')}
          </button>
          <button
            type="button"
            onClick={() => handlePresetSelect('limited')}
            disabled={updatingProfileVisibility}
            className="px-4 py-2 border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('visibilityPresets.limited')}
          </button>
          <button
            type="button"
            onClick={() => handlePresetSelect('same_disease_only')}
            disabled={updatingProfileVisibility}
            className="px-4 py-2 border-2 border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('visibilityPresets.sameDiseaseOnly')}
          </button>
          <button
            type="button"
            onClick={() => handlePresetSelect('private')}
            disabled={updatingProfileVisibility}
            className="px-4 py-2 border-2 border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('visibilityPresets.private')}
          </button>
        </div>
      </div>

      {/* Profile Visibility */}
      <div>
        <label
          htmlFor="profile_visibility"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {t('fields.profileVisibility')}
        </label>
        <select
          id="profile_visibility"
          name="profile_visibility"
          value={profileVisibility}
          onChange={handleProfileVisibilityChange}
          disabled={updatingProfileVisibility}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="public">{t('visibility.public')}</option>
          <option value="limited">{t('visibility.limited')}</option>
          <option value="private">{t('visibility.private')}</option>
        </select>
      </div>

      {/* Field-Level Visibility Settings */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('sections.fieldVisibility')}</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">{t('fieldVisibility.description')}</p>

        {loadingVisibilities ? (
          <div className="text-center py-4">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{t('fieldVisibility.loading')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { field: 'username', label: t('fields.username') },
              { field: 'bio', label: t('fields.bio') },
              { field: 'country', label: t('fields.country') },
              { field: 'date_of_birth', label: t('fields.dateOfBirth') },
              { field: 'gender', label: t('fields.gender') },
              { field: 'language', label: t('fields.language') },
              { field: 'preferred_language', label: t('fields.preferredLanguage') },
              { field: 'email', label: t('fields.email') },
              { field: 'online_status', label: t('fields.onlineStatus') },
            ].map(({ field, label }) => (
              <div key={field} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
                <select
                  value={fieldVisibilities[field] || 'limited'}
                  onChange={async (e) => {
                    const newVisibility = e.target.value as 'public' | 'limited' | 'private' | 'same_disease_only';
                    setUpdatingVisibility(field);
                    try {
                      const accessToken = await getAccessTokenSilently();
                      await setFieldVisibility(accessToken, field, newVisibility);
                      setFieldVisibilities(prev => ({ ...prev, [field]: newVisibility }));
                    } catch (err) {
                      debugLog.error(`Failed to update visibility for ${field}:`, err);
                      setError(err instanceof Error ? err.message : t('fieldVisibility.updateFailed'));
                    } finally {
                      setUpdatingVisibility(null);
                    }
                  }}
                  disabled={updatingVisibility === field}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                >
                  <option value="public">{t('fieldVisibility.options.public')}</option>
                  <option value="limited">{t('fieldVisibility.options.limited')}</option>
                  <option value="private">{t('fieldVisibility.options.private')}</option>
                  <option value="same_disease_only">{t('fieldVisibility.options.sameDiseaseOnly')}</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
