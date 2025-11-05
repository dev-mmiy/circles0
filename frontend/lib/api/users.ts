/**
 * User API client for profile management
 */

import { getApiBaseUrl } from '../config';

export interface UserProfile {
  id: string;
  member_id: string; // 12-digit member ID
  auth0_id?: string;
  idp_id?: string;
  idp_provider: string;
  email: string;
  email_verified: boolean;

  // Private information (only visible to owner)
  first_name?: string;
  last_name?: string;
  phone?: string;

  // Public information
  nickname: string; // Public nickname (required)
  username?: string;
  bio?: string;
  avatar_url?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  country?: string;
  language?: string;
  preferred_language: string; // User's preferred language
  timezone?: string;

  // Privacy settings
  profile_visibility?: 'public' | 'limited' | 'private';
  show_email: boolean;
  show_online_status: boolean;

  // Metadata
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  is_active: boolean;
  diseases: UserDisease[];
}

export interface UserDisease {
  id: number;
  name: string;
  description?: string;
  category?: string;
}

export interface UserDiseaseDetailed {
  id: number;
  user_id: string;
  disease_id: number;
  status_id?: number;
  diagnosis_date?: string;
  diagnosis_doctor?: string;
  diagnosis_hospital?: string;
  severity_level?: number; // 1-5
  symptoms?: string;
  limitations?: string;
  medications?: string;
  notes?: string;
  is_public: boolean;
  is_searchable: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  disease?: {
    id: number;
    name: string;
    disease_code?: string;
    description?: string;
    translations?: Array<{
      id: number;
      language_code: string;
      translated_name: string;
      details?: string;
    }>;
  };
  status?: {
    id: number;
    status_code: string;
    display_order: number;
    translations?: Array<{
      id: number;
      language_code: string;
      translated_name: string;
      description?: string;
    }>;
  };
}

export interface UserDiseaseCreate {
  disease_id: number;
  status_id?: number;
  diagnosis_date?: string;
  diagnosis_doctor?: string;
  diagnosis_hospital?: string;
  severity_level?: number;
  symptoms?: string;
  limitations?: string;
  medications?: string;
  notes?: string;
  is_public?: boolean;
  is_searchable?: boolean;
}

export interface UserDiseaseUpdate {
  status_id?: number;
  diagnosis_date?: string;
  diagnosis_doctor?: string;
  diagnosis_hospital?: string;
  severity_level?: number;
  symptoms?: string;
  limitations?: string;
  medications?: string;
  notes?: string;
  is_public?: boolean;
  is_searchable?: boolean;
  is_active?: boolean;
}

export interface UserProfileUpdate {
  nickname?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  country?: string;
  language?: string;
  preferred_language?: string;
  timezone?: string;
  profile_visibility?: 'public' | 'limited' | 'private';
  show_email?: boolean;
  show_online_status?: boolean;
}

export interface UserPublicProfile {
  id: string;
  member_id: string; // 12-digit member ID (public)
  nickname: string; // Public nickname
  username?: string;
  bio?: string;
  avatar_url?: string;
  country?: string;
  created_at: string;
  diseases: UserDisease[];
}

/**
 * Get current user's profile
 */
export async function getCurrentUserProfile(accessToken: string): Promise<UserProfile> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/users/me`, {
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
  const response = await fetch(`${getApiBaseUrl()}/api/v1/users/me`, {
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
  nickname: string; // Required: public nickname
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  profile_visibility?: 'public' | 'limited' | 'private';
}): Promise<UserProfile> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/users/`, {
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

  const response = await fetch(`${getApiBaseUrl()}/api/v1/users/${userId}`, {
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
  const response = await fetch(`${getApiBaseUrl()}/api/v1/users/me`, {
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

/**
 * Get all diseases for current user with detailed information
 */
export async function getUserDiseasesDetailed(
  accessToken: string
): Promise<UserDiseaseDetailed[]> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/users/me/diseases`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch user diseases');
  }

  return response.json();
}

/**
 * Add disease to current user's profile with detailed information
 */
export async function addUserDiseaseDetailed(
  accessToken: string,
  data: UserDiseaseCreate
): Promise<UserDiseaseDetailed> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/users/me/diseases`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to add disease');
  }

  return response.json();
}

/**
 * Get detailed information about a specific disease in user's profile
 */
export async function getUserDiseaseDetail(
  accessToken: string,
  userDiseaseId: number
): Promise<UserDiseaseDetailed> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/users/me/diseases/${userDiseaseId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch disease details');
  }

  return response.json();
}

/**
 * Update user's disease information
 */
export async function updateUserDisease(
  accessToken: string,
  userDiseaseId: number,
  data: UserDiseaseUpdate
): Promise<UserDiseaseDetailed> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/users/me/diseases/${userDiseaseId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update disease');
  }

  return response.json();
}

/**
 * Remove disease from user's profile
 */
export async function removeUserDisease(
  accessToken: string,
  diseaseId: number
): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/users/me/diseases/${diseaseId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to remove disease');
  }
}

