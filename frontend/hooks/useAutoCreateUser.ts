/**
 * Hook to automatically create user profile on first login
 */

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { createOrGetUser } from '@/lib/api/users';

export function useAutoCreateUser() {
  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const [userCreated, setUserCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createUser = async () => {
      if (!isAuthenticated || !user || userCreated) {
        return;
      }

      try {
        // Create or get user from database
        await createOrGetUser({
          auth0_id: user.sub || '',
          email: user.email || '',
          email_verified: user.email_verified || false,
          display_name: user.name || user.email || 'User',
          avatar_url: user.picture,
        });

        setUserCreated(true);
        console.log('User profile created/retrieved successfully');
      } catch (err) {
        console.error('Failed to create user profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to create user profile');
      }
    };

    if (!isLoading && isAuthenticated && user) {
      createUser();
    }
  }, [isAuthenticated, isLoading, user, userCreated]);

  return { userCreated, error };
}

