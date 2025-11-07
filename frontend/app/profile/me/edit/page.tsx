'use client';

import { useAuth0 } from '@auth0/auth0-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { UserProfileEditForm } from '@/components/UserProfileEditForm';

export default function EditProfilePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth0();
  const { user, loading: userLoading, updateUserProfile } = useUser();
  const router = useRouter();

  const loading = authLoading || userLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Log In</h1>
          <p className="text-gray-600 mb-4">You need to be logged in to edit your profile.</p>
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

  const handleSave = async (updatedUser: any) => {
    updateUserProfile(updatedUser);
    // Redirect to profile page
    router.push('/profile/me');
  };

  const handleCancel = () => {
    router.push('/profile/me');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">プロフィール編集</h1>
            <p className="text-gray-600 mt-2">あなたの情報を編集してください</p>
          </div>

          {/* Edit Form */}
          <UserProfileEditForm user={user} onSave={handleSave} onCancel={handleCancel} />
        </div>
      </div>
    </div>
  );
}
