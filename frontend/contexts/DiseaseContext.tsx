/**
 * Disease Context
 * Manages disease master data and user's diseases
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Disease,
  DiseaseCategory,
  DiseaseStatus,
  getDiseases,
  getDiseaseCategories,
  getDiseaseStatuses,
  searchDiseases,
} from '@/lib/api/diseases';
import {
  UserDiseaseDetailed,
  UserDiseaseCreate,
  UserDiseaseUpdate,
  getUserDiseasesDetailed,
  addUserDiseaseDetailed,
  getUserDiseaseDetail,
  updateUserDisease,
  removeUserDisease,
} from '@/lib/api/users';
import { getAccessToken as getAccessTokenFromManager } from '@/lib/utils/tokenManager';
import { debugLog } from '@/lib/utils/debug';

interface DiseaseContextType {
  // Master data
  diseases: Disease[];
  categories: DiseaseCategory[];
  statuses: DiseaseStatus[];

  // User's diseases
  userDiseases: UserDiseaseDetailed[];

  // Loading states
  loadingMasterData: boolean;
  loadingUserDiseases: boolean;

  // Error states
  error: string | null;

  // Methods
  searchDiseasesByName: (query: string) => Promise<Disease[]>;
  refreshMasterData: () => Promise<void>;
  refreshUserDiseases: () => Promise<void>;
  addDisease: (data: UserDiseaseCreate) => Promise<UserDiseaseDetailed>;
  updateDisease: (diseaseId: number, data: UserDiseaseUpdate) => Promise<UserDiseaseDetailed>;
  removeDisease: (diseaseId: number) => Promise<void>;
  getDiseaseById: (diseaseId: number) => Disease | undefined;
  getCategoryById: (categoryId: number) => DiseaseCategory | undefined;
  getStatusById: (statusId: number) => DiseaseStatus | undefined;
}

const DiseaseContext = createContext<DiseaseContextType | undefined>(undefined);

interface DiseaseProviderProps {
  children: ReactNode;
}

export function DiseaseProvider({ children }: DiseaseProviderProps) {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  // Master data state
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [categories, setCategories] = useState<DiseaseCategory[]>([]);
  const [statuses, setStatuses] = useState<DiseaseStatus[]>([]);

  // User diseases state
  const [userDiseases, setUserDiseases] = useState<UserDiseaseDetailed[]>([]);

  // Loading states
  const [loadingMasterData, setLoadingMasterData] = useState<boolean>(true);
  const [loadingUserDiseases, setLoadingUserDiseases] = useState<boolean>(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Fetch master data (diseases, categories, statuses)
  const fetchMasterData = async () => {
    try {
      setLoadingMasterData(true);
      setError(null);

      const [diseasesData, categoriesData, statusesData] = await Promise.all([
        getDiseases(0, 1000),
        getDiseaseCategories(),
        getDiseaseStatuses(),
      ]);

      setDiseases(diseasesData);
      setCategories(categoriesData);
      setStatuses(statusesData);
    } catch (err) {
      debugLog.error('Error fetching master data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch master data');
    } finally {
      setLoadingMasterData(false);
    }
  };

  // Fetch user's diseases (requires authentication)
  const fetchUserDiseases = async () => {
    if (!isAuthenticated) {
      setUserDiseases([]);
      return;
    }

    try {
      setLoadingUserDiseases(true);
      setError(null);

      // Use tokenManager to prevent duplicate token requests
      const accessToken = await getAccessTokenFromManager(getAccessTokenSilently);

      // Fetch user diseases with detailed information
      const diseases = await getUserDiseasesDetailed(accessToken);
      setUserDiseases(diseases);
    } catch (err) {
      debugLog.error('Error fetching user diseases:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user diseases');
      setUserDiseases([]);
    } finally {
      setLoadingUserDiseases(false);
    }
  };

  // Load master data on mount
  useEffect(() => {
    fetchMasterData();
  }, []);

  // Load user diseases when authenticated
  // Add a small delay to avoid conflicts with other initial API calls
  useEffect(() => {
    if (isAuthenticated) {
      const timeoutId = setTimeout(() => {
        fetchUserDiseases();
      }, 200); // Delay to let UserProvider finish first
      return () => clearTimeout(timeoutId);
    } else {
      setUserDiseases([]);
    }
  }, [isAuthenticated]);

  // Search diseases by name
  const searchDiseasesByName = async (query: string): Promise<Disease[]> => {
    try {
      return await searchDiseases(query, 20);
    } catch (err) {
      debugLog.error('Error searching diseases:', err);
      throw err;
    }
  };

  // Refresh master data
  const refreshMasterData = async () => {
    await fetchMasterData();
  };

  // Refresh user diseases
  const refreshUserDiseases = async () => {
    await fetchUserDiseases();
  };

  // Add disease to user profile
  const addDisease = async (data: UserDiseaseCreate): Promise<UserDiseaseDetailed> => {
    try {
      // Use tokenManager to prevent duplicate token requests
      const accessToken = await getAccessTokenFromManager(getAccessTokenSilently);
      const newDisease = await addUserDiseaseDetailed(accessToken, data);

      // Update local state
      setUserDiseases(prev => [...prev, newDisease]);

      return newDisease;
    } catch (err) {
      debugLog.error('Error adding disease:', err);
      throw err;
    }
  };

  // Update disease information
  const updateDiseaseInfo = async (
    userDiseaseId: number,
    data: UserDiseaseUpdate
  ): Promise<UserDiseaseDetailed> => {
    try {
      // Use tokenManager to prevent duplicate token requests
      const accessToken = await getAccessTokenFromManager(getAccessTokenSilently);
      const updatedDisease = await updateUserDisease(accessToken, userDiseaseId, data);

      // Update local state
      setUserDiseases(prev => prev.map(d => (d.id === userDiseaseId ? updatedDisease : d)));

      return updatedDisease;
    } catch (err) {
      debugLog.error('Error updating disease:', err);
      throw err;
    }
  };

  // Remove disease from user profile
  const removeDiseaseFromProfile = async (diseaseId: number): Promise<void> => {
    try {
      // Use tokenManager to prevent duplicate token requests
      const accessToken = await getAccessTokenFromManager(getAccessTokenSilently);
      await removeUserDisease(accessToken, diseaseId);

      // Update local state
      setUserDiseases(prev => prev.filter(d => d.id !== diseaseId));
    } catch (err) {
      debugLog.error('Error removing disease:', err);
      throw err;
    }
  };

  // Get disease by ID
  const getDiseaseById = (diseaseId: number): Disease | undefined => {
    return diseases.find(d => d.id === diseaseId);
  };

  // Get category by ID
  const getCategoryById = (categoryId: number): DiseaseCategory | undefined => {
    return categories.find(c => c.id === categoryId);
  };

  // Get status by ID
  const getStatusById = (statusId: number): DiseaseStatus | undefined => {
    return statuses.find(s => s.id === statusId);
  };

  const value: DiseaseContextType = {
    diseases,
    categories,
    statuses,
    userDiseases,
    loadingMasterData,
    loadingUserDiseases,
    error,
    searchDiseasesByName,
    refreshMasterData,
    refreshUserDiseases,
    addDisease,
    updateDisease: updateDiseaseInfo,
    removeDisease: removeDiseaseFromProfile,
    getDiseaseById,
    getCategoryById,
    getStatusById,
  };

  return <DiseaseContext.Provider value={value}>{children}</DiseaseContext.Provider>;
}

export function useDisease(): DiseaseContextType {
  const context = useContext(DiseaseContext);
  if (context === undefined) {
    throw new Error('useDisease must be used within a DiseaseProvider');
  }
  return context;
}
