'use client';

import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useUser } from '@/contexts/UserContext';
import { UserProfileCard } from '@/components/UserProfileCard';
import { useDisease } from '@/contexts/DiseaseContext';
import { useRouter } from '@/i18n/routing';
import { EditDiseaseForm } from '@/components/EditDiseaseForm';
import { UserDiseaseDetailed, UserDiseaseUpdate } from '@/lib/api/users';
import Header from '@/components/Header';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { PrivacySettings } from '@/components/PrivacySettings';

export default function MyProfilePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth0();
  const t = useTranslations('myProfile');
  const locale = useLocale();
  const { user, loading: userLoading, updateUserProfile, refreshUser } = useUser();
  const { userDiseases, loadingUserDiseases, statuses, removeDisease, updateDisease } =
    useDisease();
  const router = useRouter();

  // Edit modal state
  const [editingDisease, setEditingDisease] = useState<UserDiseaseDetailed | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loading = authLoading || userLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('loadingProfile')}</p>
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

  const handleEdit = () => {
    router.push('/profile/me/edit');
  };

  const handleEditDisease = (disease: UserDiseaseDetailed) => {
    // Toggle: if already editing this disease, close it; otherwise, open it
    if (editingDisease?.id === disease.id) {
      setEditingDisease(null);
      setIsEditModalOpen(false);
    } else {
      setEditingDisease(disease);
      setIsEditModalOpen(true);
    }
  };

  const handleSaveDisease = async (userDiseaseId: number, data: UserDiseaseUpdate) => {
    try {
      await updateDisease(userDiseaseId, data);
      setIsEditModalOpen(false);
      setEditingDisease(null);
    } catch (error) {
      console.error('Failed to update disease:', error);
      throw error; // Re-throw to let modal handle error display
    }
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingDisease(null);
  };

  const handleDeleteDisease = async (disease: UserDiseaseDetailed) => {
    // Get localized disease name based on current locale
    let diseaseName = disease.disease?.name || '';
    if (disease.disease?.translations && disease.disease.translations.length > 0) {
      const translation = disease.disease.translations.find(
        (t) => t.language_code === locale
      );
      if (translation) {
        diseaseName = translation.translated_name;
      } else {
        const jaTranslation = disease.disease.translations.find((t) => t.language_code === 'ja');
        if (jaTranslation) {
          diseaseName = jaTranslation.translated_name;
        }
      }
    }

    if (window.confirm(t('deleteConfirm', { diseaseName }))) {
      try {
        await removeDisease(disease.id);
      } catch (error) {
        console.error('Failed to delete disease:', error);
        alert(t('deleteFailed'));
      }
    }
  };

  const handleAvatarUpdate = async (avatarUrl: string | null) => {
    await updateUserProfile({ avatar_url: avatarUrl ?? undefined });
    // Refresh user data to ensure the image is updated
    await refreshUser();
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Card */}
        <div className="mb-6">
          <UserProfileCard 
            user={user} 
            showPrivateInfo={true} 
            onEdit={handleEdit}
            userDiseases={userDiseases}
            onEditDisease={handleEditDisease}
            onDeleteDisease={handleDeleteDisease}
            editingDiseaseId={editingDisease?.id || null}
            editForm={
              editingDisease &&
              isEditModalOpen && (
                <EditDiseaseForm
                  userDisease={editingDisease}
                  statuses={statuses}
                  onSave={handleSaveDisease}
                  onCancel={handleCloseEditModal}
                />
              )
            }
            loadingUserDiseases={loadingUserDiseases}
            addDiseaseButtonHref="/diseases/add"
            addDiseaseButtonLabel={t('addDiseaseButton')}
            onAvatarUpdate={handleAvatarUpdate}
          />
        </div>

        {/* Privacy Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('privacySettings')}</h2>
          <PrivacySettings 
            user={user} 
            onProfileVisibilityUpdate={(visibility) => {
              // Update user context when visibility changes
              updateUserProfile({ profile_visibility: visibility });
            }}
          />
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/blocks"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
            >
              {t('viewBlockedUsers')}
            </Link>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('themeSettings')}</h2>
          <div className="flex items-center justify-between">
            <p className="text-gray-600 dark:text-gray-400 text-sm">{t('themeDescription')}</p>
            <ThemeSwitcher />
          </div>
        </div>

        {/* Language Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('languageSettings')}</h2>
          <div className="flex items-center justify-between">
            <p className="text-gray-600 dark:text-gray-400 text-sm">{t('languageDescription')}</p>
            <LanguageSwitcher />
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
