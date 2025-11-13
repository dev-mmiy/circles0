'use client';

import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Link from 'next/link';
import { useUser } from '@/contexts/UserContext';
import { UserProfileCard } from '@/components/UserProfileCard';
import { DiseaseList } from '@/components/DiseaseList';
import { useDisease } from '@/contexts/DiseaseContext';
import { useRouter } from 'next/navigation';
import { EditDiseaseForm } from '@/components/EditDiseaseForm';
import { UserDiseaseDetailed, UserDiseaseUpdate } from '@/lib/api/users';
import Header from '@/components/Header';

export default function MyProfilePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth0();
  const { user, loading: userLoading } = useUser();
  const { userDiseases, loadingUserDiseases, statuses, removeDisease, updateDisease } =
    useDisease();
  const router = useRouter();

  // Edit modal state
  const [editingDisease, setEditingDisease] = useState<UserDiseaseDetailed | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loading = authLoading || userLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Log In</h1>
          <p className="text-gray-600 mb-4">You need to be logged in to view your profile.</p>
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h1>
          <p className="text-gray-600 mb-4">Your profile could not be loaded.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
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
    // Get localized disease name
    let diseaseName = disease.disease?.name || '';
    if (disease.disease?.translations && disease.disease.translations.length > 0) {
      const translation = disease.disease.translations.find(
        (t) => t.language_code === user.preferred_language
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

    if (window.confirm(`「${diseaseName}」を削除しますか？`)) {
      try {
        await removeDisease(disease.id);
      } catch (error) {
        console.error('Failed to delete disease:', error);
        alert('疾患の削除に失敗しました');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Card */}
        <div className="mb-6">
          <UserProfileCard user={user} showPrivateInfo={true} onEdit={handleEdit} />
        </div>

        {/* User Diseases */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">登録疾患</h2>
            <Link
              href="/diseases/add"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              + 疾患を追加
            </Link>
          </div>

          {loadingUserDiseases ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">読み込み中...</p>
            </div>
          ) : (
            <DiseaseList
              diseases={userDiseases}
              onEdit={handleEditDisease}
              onDelete={handleDeleteDisease}
              loading={loadingUserDiseases}
              editingDiseaseId={editingDisease?.id || null}
              preferredLanguage={user.preferred_language}
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
            />
          )}
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-blue-600 hover:text-blue-700 hover:underline">
            ← ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
