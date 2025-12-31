/**
 * Follow API client
 */

import { getApiBaseUrl } from '../config';

const API_BASE_URL = getApiBaseUrl();

export interface UserFollowSummary {
  id: string;
  member_id: string;
  nickname: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export interface FollowResponse {
  id: string;
  follower_id: string;
  following_id: string;
  is_active: boolean;
  created_at: string;
}

export interface FollowerResponse {
  id: string;
  follower_id: string;
  created_at: string;
  follower: UserFollowSummary | null;
}

export interface FollowingResponse {
  id: string;
  following_id: string;
  created_at: string;
  following: UserFollowSummary | null;
}

export interface FollowStats {
  follower_count: number;
  following_count: number;
  is_following: boolean;
  is_followed_by: boolean;
}

/**
 * Follow a user
 */
export async function followUser(userId: string, accessToken: string): Promise<FollowResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/follows/users/${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to follow user' }));
    throw new Error(error.detail || 'Failed to follow user');
  }

  return response.json();
}

/**
 * Unfollow a user
 */
export async function unfollowUser(userId: string, accessToken: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/follows/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to unfollow user' }));
    throw new Error(error.detail || 'Failed to unfollow user');
  }
}

/**
 * Get user's followers
 */
export async function getFollowers(
  userId: string,
  skip: number = 0,
  limit: number = 50
): Promise<FollowerResponse[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/follows/users/${userId}/followers?skip=${skip}&limit=${limit}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to get followers' }));
    throw new Error(error.detail || 'Failed to get followers');
  }

  return response.json();
}

/**
 * Get users that this user follows
 */
export async function getFollowing(
  userId: string,
  skip: number = 0,
  limit: number = 50
): Promise<FollowingResponse[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/follows/users/${userId}/following?skip=${skip}&limit=${limit}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to get following' }));
    throw new Error(error.detail || 'Failed to get following');
  }

  return response.json();
}

/**
 * Get follow statistics for a user
 */
export async function getFollowStats(userId: string, accessToken?: string): Promise<FollowStats> {
  const headers: HeadersInit = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/follows/users/${userId}/stats`, { headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to get follow stats' }));
    throw new Error(error.detail || 'Failed to get follow stats');
  }

  return response.json();
}

/**
 * Check if current user is following a user
 */
export async function checkIsFollowing(userId: string, accessToken: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/api/v1/follows/users/${userId}/is-following`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to check follow status' }));
    throw new Error(error.detail || 'Failed to check follow status');
  }

  const data = await response.json();
  return data.is_following;
}
