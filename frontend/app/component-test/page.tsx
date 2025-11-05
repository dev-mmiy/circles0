/**
 * Component Test Page
 * Tests all newly implemented components
 */

'use client';

import React, { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useDisease } from '@/contexts/DiseaseContext';
import { UserProfileCard } from '@/components/UserProfileCard';
import { UserProfileEditForm } from '@/components/UserProfileEditForm';
import { DiseaseList } from '@/components/DiseaseList';
import { DiseaseForm } from '@/components/DiseaseForm';
import { DiseaseStatusBadge, SeverityBadge } from '@/components/DiseaseStatusBadge';
import { CategorySelector } from '@/components/CategorySelector';
import { updateCurrentUserProfile } from '@/lib/api/users';
import { useAuth0 } from '@auth0/auth0-react';

export default function ComponentTestPage() {
  const { user, loading: userLoading, refreshUser } = useUser();
  const {
    diseases,
    categories,
    statuses,
    userDiseases,
    loadingMasterData,
    addDisease,
    updateDisease,
    removeDisease,
    searchDiseasesByName,
  } = useDisease();

  const { isAuthenticated, loginWithRedirect, getAccessTokenSilently } = useAuth0();

  // UI State
  const [editProfileMode, setEditProfileMode] = useState(false);
  const [showAddDiseaseForm, setShowAddDiseaseForm] = useState(false);
  const [editingDisease, setEditingDisease] = useState<any>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>();

  // Handle profile save
  const handleProfileSave = async (updates: any) => {
    try {
      const token = await getAccessTokenSilently();
      await updateCurrentUserProfile(token, updates);
      await refreshUser();
      setEditProfileMode(false);
      alert('プロフィールを更新しました！');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('プロフィールの更新に失敗しました');
    }
  };

  // Handle disease add
  const handleDiseaseAdd = async (data: any) => {
    try {
      await addDisease(data);
      setShowAddDiseaseForm(false);
      alert('疾患を追加しました！');
    } catch (error) {
      console.error('Error adding disease:', error);
      alert('疾患の追加に失敗しました');
    }
  };

  // Handle disease edit
  const handleDiseaseEdit = async (data: any) => {
    try {
      if (editingDisease) {
        await updateDisease(editingDisease.id, data);
        setEditingDisease(null);
        alert('疾患を更新しました！');
      }
    } catch (error) {
      console.error('Error updating disease:', error);
      alert('疾患の更新に失敗しました');
    }
  };

  // Handle disease delete
  const handleDiseaseDelete = async (disease: any) => {
    if (confirm(`本当に「${disease.disease?.name}」を削除しますか？`)) {
      try {
        await removeDisease(disease.id);
        alert('疾患を削除しました！');
      } catch (error) {
        console.error('Error deleting disease:', error);
        alert('疾患の削除に失敗しました');
      }
    }
  };

  // Loading state
  if (userLoading || loadingMasterData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            コンポーネントテストページ
          </h1>
          <p className="text-gray-600 mb-6">
            このページを表示するにはログインが必要です
          </p>
          <button
            onClick={() => loginWithRedirect()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">
          コンポーネントテストページ
        </h1>

        {/* Master Data Info */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">マスターデータ統計</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{diseases.length}</p>
              <p className="text-sm text-gray-600">疾患数</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{categories.length}</p>
              <p className="text-sm text-gray-600">カテゴリ数</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{statuses.length}</p>
              <p className="text-sm text-gray-600">ステータス数</p>
            </div>
          </div>
        </div>

        {/* Badge Tests */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">バッジコンポーネント</h2>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">疾患ステータスバッジ</h3>
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <DiseaseStatusBadge key={status.id} status={status} size="md" />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3">重症度バッジ</h3>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <SeverityBadge key={level} level={level} size="md" />
              ))}
            </div>
          </div>
        </div>

        {/* Category Selector Test */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">カテゴリセレクター</h2>
          <CategorySelector
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
            label="カテゴリを選択"
            placeholder="カテゴリを選んでください"
          />
          {selectedCategoryId && (
            <div className="mt-4 p-3 bg-blue-50 rounded">
              <p className="text-sm text-gray-700">
                選択されたカテゴリID: <span className="font-semibold">{selectedCategoryId}</span>
              </p>
            </div>
          )}
        </div>

        {/* User Profile Section */}
        {user && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">ユーザープロフィール</h2>
            {editProfileMode ? (
              <UserProfileEditForm
                user={user}
                onSave={handleProfileSave}
                onCancel={() => setEditProfileMode(false)}
              />
            ) : (
              <UserProfileCard
                user={user}
                onEdit={() => setEditProfileMode(true)}
                showPrivateInfo={true}
              />
            )}
          </div>
        )}

        {/* Disease Management Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">疾患管理</h2>
            <button
              onClick={() => setShowAddDiseaseForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              疾患を追加
            </button>
          </div>

          {/* Add Form */}
          {showAddDiseaseForm && (
            <div className="mb-6">
              <DiseaseForm
                mode="add"
                diseases={diseases}
                categories={categories}
                statuses={statuses}
                onSubmit={handleDiseaseAdd}
                onCancel={() => setShowAddDiseaseForm(false)}
                onSearchDiseases={searchDiseasesByName}
              />
            </div>
          )}

          {/* Edit Form */}
          {editingDisease && (
            <div className="mb-6">
              <DiseaseForm
                mode="edit"
                diseases={diseases}
                categories={categories}
                statuses={statuses}
                initialData={editingDisease}
                onSubmit={handleDiseaseEdit}
                onCancel={() => setEditingDisease(null)}
              />
            </div>
          )}

          {/* Disease List */}
          <DiseaseList
            diseases={userDiseases}
            onEdit={setEditingDisease}
            onDelete={handleDiseaseDelete}
            loading={false}
          />
        </div>
      </div>
    </div>
  );
}
