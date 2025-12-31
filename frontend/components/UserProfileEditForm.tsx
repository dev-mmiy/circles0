/**
 * User Profile Edit Form Component
 * Form for editing user profile information
 */

'use client';

import React, { useState, FormEvent } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { UserProfile, UserProfileUpdate } from '@/lib/api/users';
import { COUNTRIES, getCountryName } from '@/lib/utils/countries';
import { debugLog } from '@/lib/utils/debug';

interface UserProfileEditFormProps {
  user: UserProfile;
  onSave: (updates: UserProfileUpdate) => Promise<void>;
  onCancel: () => void;
}

export function UserProfileEditForm({ user, onSave, onCancel }: UserProfileEditFormProps) {
  const t = useTranslations('userProfileEdit');
  const locale = useLocale();
  const [formData, setFormData] = useState<UserProfileUpdate>({
    nickname: user.nickname,
    first_name: user.first_name || undefined,
    last_name: user.last_name || undefined,
    phone: user.phone || undefined,
    username: user.username || undefined, // Normalize None/null to undefined
    bio: user.bio || undefined,
    date_of_birth: user.date_of_birth || undefined,
    gender: user.gender,
    country: user.country || undefined,
    language: user.language || undefined,
    preferred_language: user.preferred_language || undefined,
    profile_visibility: user.profile_visibility,
    show_email: user.show_email,
    show_online_status: user.show_online_status,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Clean up form data: remove empty strings and convert to undefined
      // Only include fields that have actually changed
      const cleanedData: UserProfileUpdate = {};

      // Helper function to normalize values for comparison
      const normalizeValue = (val: any): any => {
        if (val === '' || val === null || val === undefined) return null;
        if (typeof val === 'string') return val.trim() || null;
        return val;
      };

      Object.entries(formData).forEach(([key, value]) => {
        const originalValue = user[key as keyof UserProfile];
        const normalizedValue = normalizeValue(value);
        const normalizedOriginal = normalizeValue(originalValue);

        // Special handling for username: skip if unchanged or empty
        if (key === 'username') {
          // If both are null/empty/undefined, skip
          if (normalizedValue === null && normalizedOriginal === null) {
            return;
          }
          // If new value is empty/null but original had a value, allow clearing
          if (normalizedValue === null && normalizedOriginal !== null) {
            cleanedData[key as keyof UserProfileUpdate] = undefined as any;
            return;
          }
          // Only include username if it's actually different and not empty
          if (normalizedValue !== normalizedOriginal && normalizedValue !== null) {
            cleanedData[key as keyof UserProfileUpdate] = normalizedValue as any;
          }
          return; // Skip further processing for username
        }

        // Only include if value is different from original
        if (normalizedValue !== normalizedOriginal) {
          // If new value is null/empty and original was also null/empty, skip
          if (normalizedValue === null && normalizedOriginal === null) {
            return;
          }

          // Include the field if it's changed
          cleanedData[key as keyof UserProfileUpdate] = normalizedValue as any;
        }
      });

      debugLog.log('Submitting cleaned profile data:', cleanedData);
      debugLog.log('Original user data:', { username: user.username, nickname: user.nickname });
      debugLog.log('Form data:', formData);

      // Don't send request if nothing changed
      if (Object.keys(cleanedData).length === 0) {
        debugLog.log('No changes detected, skipping save');
        return;
      }

      await onSave(cleanedData);
    } catch (err: any) {
      debugLog.error('Error saving profile:', err);

      // Handle localized error messages for nickname uniqueness
      if (err.code === 'NICKNAME_ALREADY_EXISTS') {
        setError(
          locale === 'ja'
            ? err.message_ja ||
                'このニックネームは既に他のユーザーに使用されています。別のニックネームを選んでください。'
            : err.message ||
                'This nickname is already taken by another user. Please choose a different nickname.'
        );
      } else {
        setError(err instanceof Error ? err.message : t('errors.saveFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 sm:p-6"
    >
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">{t('title')}</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Public Information */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
          {t('sections.publicInfo')}
        </h3>

        <div className="space-y-4">
          {/* Nickname (required) */}
          <div>
            <label
              htmlFor="nickname"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('fields.nickname')} <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              id="nickname"
              name="nickname"
              value={formData.nickname || ''}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder={t('placeholders.nickname')}
            />
          </div>

          {/* Username (optional) */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('fields.username')}
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder={t('placeholders.username')}
            />
          </div>

          {/* Bio */}
          <div>
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('fields.bio')}
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio || ''}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder={t('placeholders.bio')}
            />
          </div>

          {/* Country */}
          <div>
            <label
              htmlFor="country"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('fields.country')}
            </label>
            <select
              id="country"
              name="country"
              value={formData.country || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">{t('country.select')}</option>
              {COUNTRIES.map(country => (
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
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
          {t('sections.privateInfo')}
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* First Name */}
          <div>
            <label
              htmlFor="first_name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('fields.firstName')}
            </label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Last Name */}
          <div>
            <label
              htmlFor="last_name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('fields.lastName')}
            </label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('fields.phone')}
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder={t('placeholders.phone')}
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label
              htmlFor="date_of_birth"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('fields.dateOfBirth')}
            </label>
            <input
              type="date"
              id="date_of_birth"
              name="date_of_birth"
              value={formData.date_of_birth || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Gender */}
          <div className="col-span-2">
            <label
              htmlFor="gender"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('fields.gender')}
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">{t('gender.select')}</option>
              <option value="male">{t('gender.male')}</option>
              <option value="female">{t('gender.female')}</option>
              <option value="other">{t('gender.other')}</option>
              <option value="prefer_not_to_say">{t('gender.preferNotToSay')}</option>
            </select>
          </div>

          {/* Preferred Language */}
          <div className="col-span-2">
            <label
              htmlFor="preferred_language"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('fields.preferredLanguage')}
            </label>
            <select
              id="preferred_language"
              name="preferred_language"
              value={formData.preferred_language || 'ja'}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="ja">{t('languages.ja')}</option>
              <option value="en">{t('languages.en')}</option>
              <option value="es">{t('languages.es')}</option>
              <option value="fr">{t('languages.fr')}</option>
              <option value="de">{t('languages.de')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
          {t('sections.preferences')}
        </h3>

        <div className="space-y-4">
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
              value={formData.profile_visibility || 'limited'}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="public">{t('visibility.public')}</option>
              <option value="limited">{t('visibility.limited')}</option>
              <option value="private">{t('visibility.private')}</option>
            </select>
          </div>

          {/* Show Email */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="show_email"
              name="show_email"
              checked={formData.show_email || false}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label
              htmlFor="show_email"
              className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t('privacy.showEmail')}
            </label>
          </div>

          {/* Show Online Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="show_online_status"
              name="show_online_status"
              checked={formData.show_online_status || false}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label
              htmlFor="show_online_status"
              className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t('privacy.showOnlineStatus')}
            </label>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {t('actions.cancel')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400"
        >
          {saving ? t('actions.saving') : t('actions.save')}
        </button>
      </div>
    </form>
  );
}
