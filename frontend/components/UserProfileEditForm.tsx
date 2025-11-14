/**
 * User Profile Edit Form Component
 * Form for editing user profile information
 */

'use client';

import React, { useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { UserProfile, UserProfileUpdate } from '@/lib/api/users';

interface UserProfileEditFormProps {
  user: UserProfile;
  onSave: (updates: UserProfileUpdate) => Promise<void>;
  onCancel: () => void;
}

export function UserProfileEditForm({ user, onSave, onCancel }: UserProfileEditFormProps) {
  const t = useTranslations('userProfileEdit');
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
    timezone: user.timezone,
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
      const cleanedData: UserProfileUpdate = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          cleanedData[key as keyof UserProfileUpdate] = value as any;
        }
      });

      console.log('Submitting cleaned profile data:', cleanedData);
      await onSave(cleanedData);
    } catch (err) {
      console.error('Error saving profile:', err);
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
            <input
              type="text"
              id="country"
              name="country"
              value={formData.country || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('placeholders.country')}
            />
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
              <option value="ja">日本語</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
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
              value={formData.profile_visibility || 'public'}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="public">{t('visibility.public')}</option>
              <option value="limited">{t('visibility.limited')}</option>
              <option value="private">{t('visibility.private')}</option>
            </select>
          </div>

          {/* Privacy Options */}
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="show_email"
                checked={formData.show_email || false}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{t('privacy.showEmail')}</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="show_online_status"
                checked={formData.show_online_status || false}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{t('privacy.showOnlineStatus')}</span>
            </label>
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
