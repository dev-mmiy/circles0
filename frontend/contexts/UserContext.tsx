/**
 * User Context
 * Manages global user state and authentication
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { UserProfile } from '@/lib/api/users';
import { getCurrentUserProfile } from '@/lib/api/users';

interface UserContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const { isAuthenticated, getAccessTokenSilently, isLoading: auth0Loading } = useAuth0();
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
      setError(err instanceof Error ? err.message : 'Failed to fetch user profile');
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

  // Optimistic update for user profile
  const updateUserProfile = (updates: Partial<UserProfile>) => {
    if (user) {
      setUser({ ...user, ...updates });
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
