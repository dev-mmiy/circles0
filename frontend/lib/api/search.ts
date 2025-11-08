/**
 * Search API client for diseases and users
 */

import { getApiBaseUrl } from '../config';
import { UserPublicProfile } from './users';

export interface DiseaseSearchParams {
  q?: string; // Search query (name, code, or translation)
  category_ids?: string; // Comma-separated category IDs
  icd_code?: string; // ICD-10 code
  language?: string; // Preferred language
  limit?: number; // Maximum results
}

export interface UserSearchParams {
  q?: string; // Search by nickname or username
  disease_ids?: string; // Comma-separated disease IDs
  country?: string; // Filter by country code
  language?: string; // Filter by preferred language
  member_id?: string; // Search by exact member ID
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
  if (params.language) queryParams.append('language', params.language);
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
    const error = await response.json();
    throw new Error(error.detail || 'Failed to search diseases');
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
    const error = await response.json();
    throw new Error(error.detail || 'Failed to search users');
  }

  return response.json();
}
