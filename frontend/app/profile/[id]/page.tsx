'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface User {
  id: string;
  member_id: string;
  formatted_member_id: string;
  email: string;
  nickname: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  full_name: string;
  phone?: string;
  birth_date?: string;
  country_code?: string;
  timezone: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  is_profile_public: boolean;
  show_age_range: boolean;
  preferred_language: string;
  preferred_locale: string;
  created_at: string;
  last_active_at?: string;
}

export default function ProfilePage() {
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/v1/users/${userId}`);

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else if (response.status === 404) {
          setError('User not found');
        } else if (response.status === 403) {
          setError('Profile is private');
        } else {
          setError('Failed to load profile');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/" className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">👤</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">User Not Found</h1>
          <p className="text-gray-600 mb-4">The requested user could not be found.</p>
          <Link href="/" className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {user.avatar_url ? (
                  <Image
                    className="h-20 w-20 rounded-full border-4 border-white"
                    src={user.avatar_url}
                    alt={user.full_name}
                    width={80}
                    height={80}
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center border-4 border-white">
                    <span className="text-2xl font-bold text-gray-600">
                      {user.first_name.charAt(0).toUpperCase()}
                      {user.last_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="ml-6 text-white">
                <h1 className="text-3xl font-bold">{user.full_name}</h1>
                <p className="text-blue-100 text-lg">@{user.nickname}</p>
                <p className="text-blue-200 text-sm">Member ID: {user.formatted_member_id}</p>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="px-6 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Info */}
              <div className="lg:col-span-2">
                <div className="space-y-6">
                  {/* Bio */}
                  {user.bio && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-3">About</h2>
                      <p className="text-gray-700 leading-relaxed">{user.bio}</p>
                    </div>
                  )}

                  {/* Contact Information */}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">
                      Contact Information
                    </h2>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <span className="text-gray-500 w-24">Email:</span>
                        <span className="text-gray-900">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center">
                          <span className="text-gray-500 w-24">Phone:</span>
                          <span className="text-gray-900">{user.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">
                      Personal Information
                    </h2>
                    <div className="space-y-2">
                      {user.birth_date && (
                        <div className="flex items-center">
                          <span className="text-gray-500 w-24">Age:</span>
                          <span className="text-gray-900">
                            {user.show_age_range
                              ? `${getAge(user.birth_date)} years old`
                              : 'Not shown'}
                          </span>
                        </div>
                      )}
                      {user.country_code && (
                        <div className="flex items-center">
                          <span className="text-gray-500 w-24">Country:</span>
                          <span className="text-gray-900">{user.country_code}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <span className="text-gray-500 w-24">Timezone:</span>
                        <span className="text-gray-900">{user.timezone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Member Since */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Member Since</h3>
                  <p className="text-gray-600">{formatDate(user.created_at)}</p>
                </div>

                {/* Last Active */}
                {user.last_active_at && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Last Active</h3>
                    <p className="text-gray-600">{formatDate(user.last_active_at)}</p>
                  </div>
                )}

                {/* Preferences */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Preferences</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Language:</span>
                      <span className="text-gray-900">{user.preferred_language}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Locale:</span>
                      <span className="text-gray-900">{user.preferred_locale}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Link
                    href="/"
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-center block"
                  >
                    Back to Home
                  </Link>
                  <Link
                    href="/register"
                    className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-center block"
                  >
                    Create New Account
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
