/**
 * User API client for profile management
 */

import { getApiBaseUrl } from '../config';

export interface UserProfile {
  id: string;
  auth0_id: string;
  email: string;
  email_verified: boolean;
  display_name: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
  date_of_birth?: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  country: string;
  language: string;
  timezone: string;
  profile_visibility: 'public' | 'limited' | 'private';
  show_email: boolean;
  show_online_status: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  is_active: boolean;
  diseases: UserDisease[];
}

export interface UserDisease {
  disease_id: string;
  disease_name: string;
}

export interface UserProfileUpdate {
  display_name?: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  country?: string;
  language?: string;
  timezone?: string;
  profile_visibility?: 'public' | 'limited' | 'private';
  show_email?: boolean;
  show_online_status?: boolean;
}

export interface UserPublicProfile {
  id: string;
  display_name: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
  country: string;
  created_at: string;
  diseases: UserDisease[];
}

/**
 * Get current user's profile
 */
export async function getCurrentUserProfile(accessToken: string): Promise<UserProfile> {
  const response = await fetch(`${getApiBaseUrl()}/users/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch user profile');
  }

  return response.json();
}

/**
 * Update current user's profile
 */
export async function updateCurrentUserProfile(
  accessToken: string,
  data: UserProfileUpdate
): Promise<UserProfile> {
  const response = await fetch(`${getApiBaseUrl()}/users/me`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update user profile');
  }

  return response.json();
}

/**
 * Create or get user from Auth0 data
 */
export async function createOrGetUser(data: {
  auth0_id: string;
  email: string;
  email_verified: boolean;
  display_name: string;
  avatar_url?: string;
}): Promise<UserProfile> {
  const response = await fetch(`${getApiBaseUrl()}/users/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create user');
  }

  return response.json();
}

/**
 * Get public profile of a user
 */
export async function getUserPublicProfile(
  userId: string,
  accessToken?: string
): Promise<UserPublicProfile> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${getApiBaseUrl()}/users/${userId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch user profile');
  }

  return response.json();
}

/**
 * Delete current user's account
 */
export async function deleteCurrentUser(accessToken: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/users/me`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete user');
  }
}

