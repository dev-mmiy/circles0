'use client';

import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { debugLog } from '@/lib/utils/debug';

export default function SignupPage() {
  const { loginWithRedirect } = useAuth0();
  const router = useRouter();
  const t = useTranslations('signup');
  const [formData, setFormData] = useState({
    email: '',
    nickname: '',
    username: '',
  });
  const [errors, setErrors] = useState<{
    email?: string;
    nickname?: string;
    username?: string;
    submit?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = t('errors.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('errors.emailInvalid');
    }

    // Nickname validation
    if (!formData.nickname.trim()) {
      newErrors.nickname = t('errors.nicknameRequired');
    } else if (formData.nickname.trim().length < 1 || formData.nickname.trim().length > 50) {
      newErrors.nickname = t('errors.nicknameLength');
    }

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = t('errors.usernameRequired');
    } else if (formData.username.trim().length < 1 || formData.username.trim().length > 50) {
      newErrors.username = t('errors.usernameLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // Store registration data in sessionStorage
      const registrationData = {
        email: formData.email.trim(),
        nickname: formData.nickname.trim(),
        username: formData.username.trim(),
      };
      sessionStorage.setItem('registration_data', JSON.stringify(registrationData));

      // Redirect to Auth0 signup with email pre-filled
      await loginWithRedirect({
        authorizationParams: {
          screen_hint: 'signup',
          login_hint: formData.email.trim(),
        },
        appState: {
          returnTo: '/register/complete',
        },
      });
    } catch (err) {
      debugLog.error('Failed to redirect to Auth0:', err);
      setErrors({
        submit: err instanceof Error ? err.message : t('errors.redirectFailed'),
      });
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{t('subtitle')}</p>

          {errors.submit && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400">{errors.submit}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('email')} <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${
                  errors.email
                    ? 'border-red-300 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder={t('emailPlaceholder')}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Nickname */}
            <div>
              <label
                htmlFor="nickname"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('nickname')} <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="text"
                id="nickname"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                required
                maxLength={50}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${
                  errors.nickname
                    ? 'border-red-300 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder={t('nicknamePlaceholder')}
              />
              {errors.nickname && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.nickname}</p>
              )}
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('nicknameHelp')}</p>
            </div>

            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('username')} <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                maxLength={50}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${
                  errors.username
                    ? 'border-red-300 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder={t('usernamePlaceholder')}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>
              )}
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('usernameHelp')}</p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? t('submitting') : t('submitButton')}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              {t('alreadyHaveAccount')}{' '}
              <Link
                href="/login"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                {t('loginLink')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
