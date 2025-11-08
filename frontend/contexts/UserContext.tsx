/**
 * User Context
 * Manages global user state and authentication
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useRouter } from 'next/navigation';
import { UserProfile, UserProfileUpdate } from '@/lib/api/users';
import { getCurrentUserProfile, updateCurrentUserProfile } from '@/lib/api/users';

interface UserContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  updateUserProfile: (updates: UserProfileUpdate) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const { isAuthenticated, getAccessTokenSilently, isLoading: auth0Loading } = useAuth0();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile from backend
  const fetchUserProfile = async () => {
    if (!isAuthenticated) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const accessToken = await getAccessTokenSilently();
      const userProfile = await getCurrentUserProfile(accessToken);
      setUser(userProfile);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user profile';

      // If user doesn't exist (404), redirect to registration
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        console.log('User profile not found, redirecting to registration...');
        router.push('/register');
        setLoading(false);
        return;
      }

      setError(errorMessage);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Load user profile when authenticated
  useEffect(() => {
    if (!auth0Loading) {
      fetchUserProfile();
    }
  }, [isAuthenticated, auth0Loading]);

  // Refresh user profile
  const refreshUser = async () => {
    await fetchUserProfile();
  };

  // Update user profile with API call
  const updateUserProfile = async (updates: UserProfileUpdate) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      console.log('Updating user profile with data:', updates);

      // Optimistic update
      setUser({ ...user, ...updates });

      // Call API to update profile
      const accessToken = await getAccessTokenSilently();
      const updatedUser = await updateCurrentUserProfile(accessToken, updates);

      // Update with actual response from server
      setUser(updatedUser);
    } catch (err) {
      console.error('Error updating user profile:', err);
      // Revert optimistic update on error
      await fetchUserProfile();
      throw err;
    }
  };

  const value: UserContextType = {
    user,
    loading,
    error,
    refreshUser,
    updateUserProfile,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
