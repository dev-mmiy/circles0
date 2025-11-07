'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDisease } from '@/contexts/DiseaseContext';
import { DiseaseForm } from '@/components/DiseaseForm';
import { UserDiseaseCreate, UserDiseaseUpdate } from '@/lib/api/users';

export default function AddDiseasePage() {
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
        throw new Error('疾患を選択してください');
      }
      await addDisease(data as UserDiseaseCreate);
      router.push('/profile/me');
    } catch (err) {
      console.error('Failed to add disease:', err);
      setError(err instanceof Error ? err.message : 'Failed to add disease');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">疾患を追加</h1>
          <p className="mt-2 text-gray-600">
            登録する疾患の情報を入力してください
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
            ← プロフィールに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
