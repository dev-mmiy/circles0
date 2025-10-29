'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUserProfile, updateCurrentUserProfile, UserProfile, UserProfileUpdate } from '@/lib/api/users';
import { Disease, getCurrentUserDiseases, searchDiseases, addDiseaseToUser, removeDiseaseFromUser } from '@/lib/api/diseases';

export default function EditProfilePage() {
  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<UserProfileUpdate>({});
  
  // Disease management state
  const [userDiseases, setUserDiseases] = useState<Disease[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Disease[]>([]);
  const [searchingDiseases, setSearchingDiseases] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      try {
        const token = await getAccessTokenSilently();
        const data = await getCurrentUserProfile(token);
        setProfile(data);
        
        // Initialize form data
        setFormData({
          display_name: data.display_name,
          username: data.username || '',
          bio: data.bio || '',
          date_of_birth: data.date_of_birth || '',
          gender: data.gender,
          country: data.country,
          language: data.language,
          timezone: data.timezone,
          profile_visibility: data.profile_visibility,
          show_email: data.show_email,
          show_online_status: data.show_online_status,
        });
        
        // Fetch user's diseases
        const diseases = await getCurrentUserDiseases(token);
        setUserDiseases(diseases);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (!isLoading) {
      fetchProfile();
    }
  }, [isAuthenticated, isLoading, user, getAccessTokenSilently]);

  // Disease search handler
  const handleDiseaseSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearchingDiseases(true);
    try {
      const results = await searchDiseases(query.trim(), 10);
      setSearchResults(results);
    } catch (err) {
      console.error('Failed to search diseases:', err);
    } finally {
      setSearchingDiseases(false);
    }
  };
  
  // Add disease handler
  const handleAddDisease = async (disease: Disease) => {
    try {
      const token = await getAccessTokenSilently();
      await addDiseaseToUser(disease.id, token);
      
      // Update local state
      setUserDiseases([...userDiseases, disease]);
      setSearchQuery('');
      setSearchResults([]);
      setSuccessMessage('疾患を追加しました');
    } catch (err) {
      console.error('Failed to add disease:', err);
      setError(err instanceof Error ? err.message : '疾患の追加に失敗しました');
    }
  };
  
  // Remove disease handler
  const handleRemoveDisease = async (diseaseId: number) => {
    try {
      const token = await getAccessTokenSilently();
      await removeDiseaseFromUser(diseaseId, token);
      
      // Update local state
      setUserDiseases(userDiseases.filter(d => d.id !== diseaseId));
      setSuccessMessage('疾患を削除しました');
    } catch (err) {
      console.error('Failed to remove disease:', err);
      setError(err instanceof Error ? err.message : '疾患の削除に失敗しました');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSaving(true);

    try {
      const token = await getAccessTokenSilently();
      
      // Clean up form data (remove empty strings)
      const updateData: UserProfileUpdate = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== '' && value !== undefined) {
          updateData[key as keyof UserProfileUpdate] = value as any;
        }
      });

      const updatedProfile = await updateCurrentUserProfile(token, updateData);
      setProfile(updatedProfile);
      setSuccessMessage('プロフィールを更新しました！');
      
      // Redirect to profile page after 2 seconds
      setTimeout(() => {
        router.push('/profile/me');
      }, 2000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err instanceof Error ? err.message : 'プロフィールの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">プロフィール編集</h1>
            <p className="text-gray-600 mt-2">あなたの情報を編集してください</p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display Name */}
            <div>
              <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-2">
                表示名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="display_name"
                name="display_name"
                value={formData.display_name || ''}
                onChange={handleChange}
                required
                maxLength={100}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                placeholder="山田 太郎"
              />
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                ユーザー名
              </label>
              <div className="flex items-center">
                <span className="text-gray-500 mr-2">@</span>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username || ''}
                  onChange={handleChange}
                  maxLength={50}
                  pattern="[a-z0-9_]+"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="yamada_taro"
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">小文字の英数字とアンダースコアのみ使用できます</p>
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                自己紹介
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio || ''}
                onChange={handleChange}
                maxLength={500}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                placeholder="自己紹介を入力してください..."
              />
              <p className="text-sm text-gray-500 mt-1">{(formData.bio || '').length} / 500</p>
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-2">
                生年月日
              </label>
              <input
                type="date"
                id="date_of_birth"
                name="date_of_birth"
                value={formData.date_of_birth || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>

            {/* Gender */}
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                性別
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender || 'prefer_not_to_say'}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              >
                <option value="male">男性</option>
                <option value="female">女性</option>
                <option value="other">その他</option>
                <option value="prefer_not_to_say">回答しない</option>
              </select>
            </div>

            {/* Country */}
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                国
              </label>
              <select
                id="country"
                name="country"
                value={formData.country || 'jp'}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              >
                <option value="jp">日本 (JP)</option>
                <option value="us">アメリカ (US)</option>
                <option value="uk">イギリス (UK)</option>
                <option value="cn">中国 (CN)</option>
                <option value="kr">韓国 (KR)</option>
              </select>
            </div>

            {/* Language */}
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                言語
              </label>
              <select
                id="language"
                name="language"
                value={formData.language || 'ja'}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              >
                <option value="ja">日本語 (ja)</option>
                <option value="en">English (en)</option>
                <option value="zh">中文 (zh)</option>
                <option value="ko">한국어 (ko)</option>
              </select>
            </div>

            {/* Timezone */}
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                タイムゾーン
              </label>
              <select
                id="timezone"
                name="timezone"
                value={formData.timezone || 'Asia/Tokyo'}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              >
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
              </select>
            </div>

            {/* Disease Management */}
            <div className="pt-6 border-t border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">疾患情報</h2>
              
              {/* Current Diseases */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  登録済み疾患
                </label>
                {userDiseases.length > 0 ? (
                  <div className="space-y-2">
                    {userDiseases.map((disease) => (
                      <div
                        key={disease.id}
                        className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{disease.name}</p>
                          {disease.description && (
                            <p className="text-sm text-gray-600">{disease.description}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDisease(disease.id)}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-100 rounded-md transition-colors"
                        >
                          削除
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">疾患が登録されていません</p>
                )}
              </div>
              
              {/* Search and Add Disease */}
              <div className="mb-4">
                <label htmlFor="disease_search" className="block text-sm font-medium text-gray-700 mb-2">
                  疾患を追加
                </label>
                <input
                  type="text"
                  id="disease_search"
                  value={searchQuery}
                  onChange={(e) => handleDiseaseSearch(e.target.value)}
                  placeholder="疾患名で検索..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
                
                {/* Search Results */}
                {searchingDiseases && (
                  <p className="mt-2 text-sm text-gray-500">検索中...</p>
                )}
                
                {searchResults.length > 0 && (
                  <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((disease) => {
                      const alreadyAdded = userDiseases.some(d => d.id === disease.id);
                      return (
                        <button
                          key={disease.id}
                          type="button"
                          onClick={() => !alreadyAdded && handleAddDisease(disease)}
                          disabled={alreadyAdded}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            alreadyAdded
                              ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                              : 'bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-400'
                          }`}
                        >
                          <p className="font-medium text-gray-900">{disease.name}</p>
                          {disease.description && (
                            <p className="text-sm text-gray-600">{disease.description}</p>
                          )}
                          {alreadyAdded && (
                            <p className="text-xs text-gray-500 mt-1">既に追加済み</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                
                {searchQuery.trim().length >= 2 && !searchingDiseases && searchResults.length === 0 && (
                  <p className="mt-2 text-sm text-gray-500">検索結果がありません</p>
                )}
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="pt-6 border-t border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">プライバシー設定</h2>

              {/* Profile Visibility */}
              <div className="mb-4">
                <label htmlFor="profile_visibility" className="block text-sm font-medium text-gray-700 mb-2">
                  プロフィール公開設定
                </label>
                <select
                  id="profile_visibility"
                  name="profile_visibility"
                  value={formData.profile_visibility || 'limited'}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                >
                  <option value="public">公開 - 誰でも閲覧可能</option>
                  <option value="limited">限定公開 - ログインユーザーのみ</option>
                  <option value="private">非公開 - 自分のみ</option>
                </select>
              </div>

              {/* Show Email */}
              <div className="mb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="show_email"
                    name="show_email"
                    checked={formData.show_email || false}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="show_email" className="ml-2 block text-sm text-gray-700">
                    メールアドレスを公開する
                  </label>
                </div>
                <p className="ml-6 text-xs text-gray-500 mt-1">
                  ※ セキュリティ上の理由により、現在メールアドレスは非公開です
                </p>
              </div>

              {/* Show Online Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show_online_status"
                  name="show_online_status"
                  checked={formData.show_online_status || false}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="show_online_status" className="ml-2 block text-sm text-gray-700">
                  オンライン状態を表示する
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <Link
                href="/profile/me"
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

