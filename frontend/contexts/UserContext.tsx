/**
 * User Context
 * Manages global user state and authentication
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useRouter, usePathname } from '@/i18n/routing';
import { useLocale } from 'next-intl';
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
  const locale = useLocale();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAutoSwitched, setHasAutoSwitched] = useState<boolean>(false);

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
        // Use current locale for registration page
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

  // Auto-switch locale based on user's preferred_language
  useEffect(() => {
    if (!user || !isAuthenticated || hasAutoSwitched) {
      return;
    }

    // Check if user has manually overridden locale preference
    const localeOverride = localStorage.getItem('locale_override');
    if (localeOverride === 'true') {
      return;
    }

    // Map preferred_language to locale (support ja, en)
    const preferredLocale = user.preferred_language === 'en' ? 'en' : 'ja';
    
    // Only switch if current locale differs from preferred locale
    if (locale !== preferredLocale) {
      console.log(`Auto-switching locale from ${locale} to ${preferredLocale} based on user preference`);
      setHasAutoSwitched(true);
      
      // Navigate to the same pathname with the new locale
      router.replace(pathname, { locale: preferredLocale });
    }
  }, [user, locale, isAuthenticated, hasAutoSwitched, pathname, router]);

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
