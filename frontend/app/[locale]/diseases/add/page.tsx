'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useDisease } from '@/contexts/DiseaseContext';
import { DiseaseForm } from '@/components/DiseaseForm';
import { UserDiseaseCreate, UserDiseaseUpdate } from '@/lib/api/users';

export default function AddDiseasePage() {
  const t = useTranslations('addDiseasePage');
  const router = useRouter();
  const {
    diseases,
    categories,
    statuses,
    addDisease,
    searchDiseasesByName,
    loadingMasterData,
  } = useDisease();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: UserDiseaseCreate | UserDiseaseUpdate) => {
    try {
      setError(null);
      setSubmitting(true);
      // Ensure disease_id is present for create mode
      if (!('disease_id' in data) || !data.disease_id) {
        throw new Error(t('errors.selectDisease'));
      }
      await addDisease(data as UserDiseaseCreate);
      router.push('/profile/me');
    } catch (err) {
      console.error('Failed to add disease:', err);
      setError(err instanceof Error ? err.message : t('errors.addFailed'));
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/profile/me');
  };

  if (loadingMasterData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-2 text-gray-600">
            {t('description')}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <DiseaseForm
            mode="add"
            diseases={diseases}
            categories={categories}
            statuses={statuses}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onSearchDiseases={searchDiseasesByName}
          />
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link
            href="/profile/me"
            className="text-blue-600 hover:text-blue-700 hover:underline"
          >
            {t('backToProfile')}
          </Link>
        </div>
      </div>
    </div>
  );
}
