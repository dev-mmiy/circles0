'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslations } from 'next-intl';
import Header from '@/components/Header';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { getUserPosts, type Post } from '@/lib/api/posts';
import { useUser } from '@/contexts/UserContext';
import { useDataLoader } from '@/lib/hooks/useDataLoader';
import { Calendar, List, Plus } from 'lucide-react';
import PostFormModal from '@/components/PostFormModal';
import PostCard from '@/components/PostCard';

type ViewMode = 'calendar' | 'list';

export default function MealPage() {
  const { isAuthenticated, isLoading: authLoading, getAccessTokenSilently } = useAuth0();
  const { user } = useUser();
  const t = useTranslations('meal');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  // Data loader for meal records
  const {
    items: records = [],
    isLoading,
    isLoadingMore,
    isRefreshing,
    error,
    hasMore,
    load,
    loadMore,
    refresh,
    retry,
    clearError,
  } = useDataLoader<Post>({
    loadFn: useCallback(async (skip, limit) => {
      if (!isAuthenticated || !user) {
        throw new Error('Authentication required');
      }
      const token = await getAccessTokenSilently();
      
      // Load only meal records
      const items = await getUserPosts(user.id, skip, limit, 'meal', token);
      
      return { items };
    }, [isAuthenticated, user, getAccessTokenSilently]),
    limit: 20,
  });

  // Load records when component mounts
  useEffect(() => {
    if (isAuthenticated && user && !authLoading) {
      load();
    }
  }, [isAuthenticated, user, authLoading, load]);

  // Handle form submission
  const handlePostCreated = useCallback(() => {
    refresh();
    setIsFormModalOpen(false);
  }, [refresh]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">{t('authRequired')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
        </div>

        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <List className="w-4 h-4" />
                <span>{t('viewMode.list')}</span>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>{t('viewMode.calendar')}</span>
              </button>
            </div>

            {/* Add Meal Button */}
            <button
              onClick={() => setIsFormModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t('addMeal')}</span>
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <ErrorDisplay
            error={error}
            onRetry={retry}
            onDismiss={clearError}
          />
        )}

        {/* Content */}
        {viewMode === 'list' ? (
          <div className="space-y-4">
            {isLoading && records.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : records.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">{t('noRecords')}</p>
              </div>
            ) : (
              <>
                {records.map((record) => (
                  <PostCard
                    key={record.id}
                    post={record}
                    onPostUpdated={refresh}
                    onPostDeleted={refresh}
                  />
                ))}
                {hasMore && (
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    {isLoadingMore ? t('loading') : t('loadMore')}
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">{t('calendarComingSoon')}</p>
          </div>
        )}

        {/* Form Modal */}
        {isFormModalOpen && (
          <PostFormModal
            isOpen={isFormModalOpen}
            onClose={() => setIsFormModalOpen(false)}
            onPostCreated={handlePostCreated}
            initialPostType="health_record"
            initialHealthRecordType="meal"
          />
        )}
      </div>
    </div>
  );
}

