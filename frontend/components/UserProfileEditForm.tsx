/**
 * User Profile Edit Form Component
 * Form for editing user profile information
 */

'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useTransition } from 'react';
import { UserProfile, UserProfileUpdate, getFieldVisibilities, setFieldVisibility, AllFieldVisibilityResponse } from '@/lib/api/users';
import { COUNTRIES, getCountryName } from '@/lib/utils/countries';
import { debugLog } from '@/lib/utils/debug';

interface UserProfileEditFormProps {
  user: UserProfile;
  onSave: (updates: UserProfileUpdate) => Promise<void>;
  onCancel: () => void;
}

export function UserProfileEditForm({ user, onSave, onCancel }: UserProfileEditFormProps) {
  const { getAccessTokenSilently } = useAuth0();
  const t = useTranslations('userProfileEdit');
  const tLang = useTranslations('languageSwitcher');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<UserProfileUpdate>({
    nickname: user.nickname,
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone,
    username: user.username,
    bio: user.bio,
    date_of_birth: user.date_of_birth,
    gender: user.gender,
    country: user.country,
    language: user.language,
    preferred_language: user.preferred_language,
    profile_visibility: user.profile_visibility,
    show_email: user.show_email,
    show_online_status: user.show_online_status,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldVisibilities, setFieldVisibilities] = useState<Record<string, string>>({});
  const [loadingVisibilities, setLoadingVisibilities] = useState(true);
  const [updatingVisibility, setUpdatingVisibility] = useState<string | null>(null);

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

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value || undefined }));
    }
  };

  // Handle preset selection
  const handlePresetSelect = async (preset: 'public' | 'limited' | 'private' | 'same_disease_only') => {
    try {
      const accessToken = await getAccessTokenSilently();
      
      // Update profile visibility
      let profileVisibility: 'public' | 'limited' | 'private' = 'limited';
      if (preset === 'public') {
        profileVisibility = 'public';
      } else if (preset === 'private') {
        profileVisibility = 'private';
      } else {
        profileVisibility = 'limited';
      }
      
      setFormData(prev => ({ ...prev, profile_visibility: profileVisibility }));
      
      // Update field visibilities based on preset
      const fieldVisibilityMap: Record<string, 'public' | 'limited' | 'private' | 'same_disease_only'> = {
        username: preset === 'public' ? 'public' : preset === 'same_disease_only' ? 'same_disease_only' : 'limited',
        bio: preset === 'public' ? 'public' : preset === 'same_disease_only' ? 'same_disease_only' : 'limited',
        country: preset === 'public' ? 'public' : preset === 'same_disease_only' ? 'same_disease_only' : 'limited',
        date_of_birth: preset === 'private' ? 'private' : preset === 'same_disease_only' ? 'same_disease_only' : 'limited',
        gender: preset === 'private' ? 'private' : preset === 'same_disease_only' ? 'same_disease_only' : 'limited',
        language: preset === 'public' ? 'public' : preset === 'same_disease_only' ? 'same_disease_only' : 'limited',
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
    }
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Clean up form data: remove empty strings and convert to undefined
      const cleanedData: UserProfileUpdate = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          cleanedData[key as keyof UserProfileUpdate] = value as any;
        }
      });

      debugLog.log('Submitting cleaned profile data:', cleanedData);
      await onSave(cleanedData);
    } catch (err) {
      debugLog.error('Error saving profile:', err);
      setError(err instanceof Error ? err.message : t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('title')}</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Public Information */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">{t('sections.publicInfo')}</h3>

        <div className="space-y-4">
          {/* Nickname (required) */}
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
              {t('fields.nickname')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="nickname"
              name="nickname"
              value={formData.nickname || ''}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('placeholders.nickname')}
            />
          </div>

          {/* Username (optional) */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              {t('fields.username')}
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('placeholders.username')}
            />
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
              {t('fields.bio')}
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio || ''}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('placeholders.bio')}
            />
          </div>

          {/* Country */}
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
              {t('fields.country')}
            </label>
            <select
              id="country"
              name="country"
              value={formData.country || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('country.select')}</option>
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {locale === 'ja' ? country.nameJa : country.nameEn}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Private Information */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">{t('sections.privateInfo')}</h3>

        <div className="grid grid-cols-2 gap-4">
          {/* First Name */}
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
              {t('fields.firstName')}
            </label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
              {t('fields.lastName')}
            </label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              {t('fields.phone')}
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('placeholders.phone')}
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">
              {t('fields.dateOfBirth')}
            </label>
            <input
              type="date"
              id="date_of_birth"
              name="date_of_birth"
              value={formData.date_of_birth || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Gender */}
          <div className="col-span-2">
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
              {t('fields.gender')}
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('gender.select')}</option>
              <option value="male">{t('gender.male')}</option>
              <option value="female">{t('gender.female')}</option>
              <option value="other">{t('gender.other')}</option>
              <option value="prefer_not_to_say">{t('gender.preferNotToSay')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">{t('sections.preferences')}</h3>

        <div className="space-y-4">
          {/* Preferred Language */}
          <div>
            <label
              htmlFor="preferred_language"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('fields.preferredLanguage')}
            </label>
            <select
              id="preferred_language"
              name="preferred_language"
              value={formData.preferred_language || 'ja'}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ja">{t('languages.ja')}</option>
              <option value="en">{t('languages.en')}</option>
              <option value="es">{t('languages.es')}</option>
              <option value="fr">{t('languages.fr')}</option>
              <option value="de">{t('languages.de')}</option>
            </select>
          </div>

          {/* Profile Visibility Presets */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('visibilityPresets.title')}
            </label>
            <p className="text-xs text-gray-500 mb-3">{t('visibilityPresets.description')}</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handlePresetSelect('public')}
                className="px-4 py-2 border-2 border-blue-200 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
              >
                {t('visibilityPresets.public')}
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect('limited')}
                className="px-4 py-2 border-2 border-gray-200 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
              >
                {t('visibilityPresets.limited')}
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect('same_disease_only')}
                className="px-4 py-2 border-2 border-green-200 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
              >
                {t('visibilityPresets.sameDiseaseOnly')}
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect('private')}
                className="px-4 py-2 border-2 border-red-200 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                {t('visibilityPresets.private')}
              </button>
            </div>
          </div>

          {/* Profile Visibility */}
          <div>
            <label
              htmlFor="profile_visibility"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('fields.profileVisibility')}
            </label>
            <select
              id="profile_visibility"
              name="profile_visibility"
              value={formData.profile_visibility || 'limited'}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="public">{t('visibility.public')}</option>
              <option value="limited">{t('visibility.limited')}</option>
              <option value="private">{t('visibility.private')}</option>
            </select>
          </div>

        </div>
      </div>

      {/* Field-Level Visibility Settings */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">{t('sections.fieldVisibility')}</h3>
        <p className="text-sm text-gray-600 mb-4">{t('fieldVisibility.description')}</p>

        {loadingVisibilities ? (
          <div className="text-center py-4">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-gray-600 mt-2">{t('fieldVisibility.loading')}</p>
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
              { field: 'email', label: t('fields.email') },
              { field: 'online_status', label: t('fields.onlineStatus') },
            ].map(({ field, label }) => (
              <div key={field} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <label className="text-sm font-medium text-gray-700">{label}</label>
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
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
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

      {/* Language Settings */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">{t('sections.language')}</h3>
        <p className="text-sm text-gray-600 mb-4">{t('language.description')}</p>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <label className="text-sm font-medium text-gray-700">{t('language.displayLanguage')}</label>
            <select
              value={locale}
              onChange={(e) => {
                const newLocale = e.target.value as 'ja' | 'en';
                // Mark that user has manually overridden locale preference
                localStorage.setItem('locale_override', 'true');
                startTransition(() => {
                  // Navigate to the same page but with the new locale
                  router.replace(pathname, { locale: newLocale });
                });
              }}
              disabled={isPending}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            >
              <option value="ja">{tLang('languages.ja')}</option>
              <option value="en">{tLang('languages.en')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {t('actions.cancel')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? t('actions.saving') : t('actions.save')}
        </button>
      </div>
    </form>
  );
}
