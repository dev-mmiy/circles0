/**
 * Search API client for diseases, users, and hashtags
 */

import { getApiBaseUrl } from '../config';
import { Post } from './posts';
import { UserPublicProfile } from './users';

/**
 * Extract error message from API error response
 */
function extractErrorMessage(error: any, defaultMessage: string): string {
  if (error.detail) {
    if (Array.isArray(error.detail)) {
      // Validation errors - format array of errors
      return error.detail.map((e: any) => {
        if (typeof e === 'string') return e;
        if (e.msg) return e.msg;
        if (e.loc && e.msg) return `${e.loc.join('.')}: ${e.msg}`;
        return JSON.stringify(e);
      }).join(', ');
    } else if (typeof error.detail === 'string') {
      return error.detail;
    } else {
      // If detail is an object, stringify it
      return JSON.stringify(error.detail);
    }
  } else if (error.message) {
    return typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
  } else {
    return JSON.stringify(error);
  }
}

export interface DiseaseSearchParams {
  q?: string; // Search query (name, code, or translation)
  category_ids?: string; // Comma-separated category IDs
  icd_code?: string; // ICD-10 code (exact, partial match, or range like 'E11-E15')
  icd_code_from?: string; // ICD-10 code range start
  icd_code_to?: string; // ICD-10 code range end
  language?: string; // Preferred language
  sort_by?: 'name' | 'disease_code' | 'created_at'; // Sort field
  sort_order?: 'asc' | 'desc'; // Sort order
  limit?: number; // Maximum results
}

export interface UserSearchParams {
  q?: string; // Search by nickname or username
  disease_ids?: string; // Comma-separated disease IDs
  country?: string; // Filter by country code
  language?: string; // Filter by preferred language
  member_id?: string; // Search by exact member ID
  sort_by?: 'created_at' | 'last_login_at' | 'nickname'; // Sort field
  sort_order?: 'asc' | 'desc'; // Sort order
  limit?: number; // Maximum results
}

export interface DiseaseSearchResult {
  id: number;
  name: string;
  disease_code?: string;
  description?: string;
  category?: string;
  severity_level?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations?: Array<{
    language_code: string;
    translated_name: string;
    details?: string;
  }>;
}

/**
 * Search for diseases with advanced filters
 */
export async function searchDiseases(
  params: DiseaseSearchParams,
  accessToken?: string
): Promise<DiseaseSearchResult[]> {
  const queryParams = new URLSearchParams();

  if (params.q) queryParams.append('q', params.q);
  if (params.category_ids) queryParams.append('category_ids', params.category_ids);
  if (params.icd_code) queryParams.append('icd_code', params.icd_code);
  if (params.icd_code_from) queryParams.append('icd_code_from', params.icd_code_from);
  if (params.icd_code_to) queryParams.append('icd_code_to', params.icd_code_to);
  if (params.language) queryParams.append('language', params.language);
  if (params.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params.sort_order) queryParams.append('sort_order', params.sort_order);
  if (params.limit) queryParams.append('limit', params.limit.toString());

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/diseases/search?${queryParams.toString()}`,
    {
      method: 'GET',
      headers,
    }
  );

  if (!response.ok) {
    let errorMessage = 'Failed to search diseases';
    try {
      const error = await response.json();
      errorMessage = extractErrorMessage(error, errorMessage);
    } catch {
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * Search for users with filters
 */
export async function searchUsers(
  params: UserSearchParams,
  accessToken?: string
): Promise<UserPublicProfile[]> {
  const queryParams = new URLSearchParams();

  if (params.q) queryParams.append('q', params.q);
  if (params.disease_ids) queryParams.append('disease_ids', params.disease_ids);
  if (params.country) queryParams.append('country', params.country);
  if (params.language) queryParams.append('language', params.language);
  if (params.member_id) queryParams.append('member_id', params.member_id);
  if (params.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params.sort_order) queryParams.append('sort_order', params.sort_order);
  if (params.limit) queryParams.append('limit', params.limit.toString());

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/users/search?${queryParams.toString()}`,
    {
      method: 'GET',
      headers,
    }
  );

  if (!response.ok) {
    let errorMessage = 'Failed to search users';
    try {
      const error = await response.json();
      errorMessage = extractErrorMessage(error, errorMessage);
    } catch {
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}

export interface HashtagSearchParams {
  q?: string; // Search query (hashtag name)
  limit?: number; // Maximum results
}

export interface Hashtag {
  id: string;
  name: string;
  created_at: string;
}

/**
 * Search for hashtags
 */
export async function searchHashtags(
  params: HashtagSearchParams,
  accessToken?: string
): Promise<Hashtag[]> {
  const queryParams = new URLSearchParams();

  if (params.q) queryParams.append('q', params.q);
  if (params.limit) queryParams.append('limit', params.limit.toString());

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/hashtags?${queryParams.toString()}`,
    {
      method: 'GET',
      headers,
    }
  );

  if (!response.ok) {
    let errorMessage = 'Failed to search hashtags';
    try {
      const error = await response.json();
      errorMessage = extractErrorMessage(error, errorMessage);
    } catch {
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * Get popular hashtags
 */
export async function getPopularHashtags(
  limit: number = 20,
  accessToken?: string
): Promise<Hashtag[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('limit', limit.toString());

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/hashtags/popular?${queryParams.toString()}`,
    {
      method: 'GET',
      headers,
    }
  );

  if (!response.ok) {
    let errorMessage = 'Failed to get popular hashtags';
    try {
      const error = await response.json();
      errorMessage = extractErrorMessage(error, errorMessage);
    } catch {
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * Get posts by hashtag
 */
export async function getPostsByHashtag(
  hashtagName: string,
  skip: number = 0,
  limit: number = 20,
  accessToken?: string
): Promise<Post[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('skip', skip.toString());
  queryParams.append('limit', limit.toString());

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/posts/hashtag/${encodeURIComponent(hashtagName)}?${queryParams.toString()}`,
    {
      method: 'GET',
      headers,
    }
  );

  if (!response.ok) {
    let errorMessage = 'Failed to get posts by hashtag';
    try {
      const error = await response.json();
      errorMessage = extractErrorMessage(error, errorMessage);
    } catch {
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * Autocomplete ICD-10 codes
 */
export async function autocompleteIcdCodes(
  query: string,
  limit: number = 10,
  accessToken?: string
): Promise<string[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('q', query);
  queryParams.append('limit', limit.toString());

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/diseases/codes/autocomplete?${queryParams.toString()}`,
    {
      method: 'GET',
      headers,
    }
  );

  if (!response.ok) {
    let errorMessage = 'Failed to autocomplete ICD codes';
    try {
      const error = await response.json();
      errorMessage = extractErrorMessage(error, errorMessage);
    } catch {
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    throw error;
  }

  const data = await response.json();
  return data.codes || [];
}
