'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useRouter } from '@/i18n/routing';
import { useUser } from '@/contexts/UserContext';
import { UserProfileEditForm } from '@/components/UserProfileEditForm';
import Header from '@/components/Header';

export default function EditProfilePage() {
  const t = useTranslations('editProfilePage');
  const { isAuthenticated, isLoading: authLoading } = useAuth0();
  const { user, loading: userLoading, updateUserProfile } = useUser();
  const router = useRouter();

  const loading = authLoading || userLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('pleaseLogIn')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{t('loginRequired')}</p>
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('goToHome')}
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('profileNotFound')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{t('profileLoadFailed')}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async (updatedUser: any) => {
    updateUserProfile(updatedUser);
    // Redirect to profile page
    router.push('/profile/me');
  };

  const handleCancel = () => {
    router.push('/profile/me');
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-3xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">{t('description')}</p>
            </div>

            {/* Edit Form */}
            <UserProfileEditForm user={user} onSave={handleSave} onCancel={handleCancel} />
          </div>
        </div>
      </div>
    </>
  );
}
