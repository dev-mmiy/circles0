import { getApiBaseUrl } from '@/lib/config';

export interface Disease {
  id: number;
  name: string;
  description?: string;
  category?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get list of all diseases
 */
export async function getDiseases(skip: number = 0, limit: number = 100): Promise<Disease[]> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/diseases/?skip=${skip}&limit=${limit}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch diseases');
  }

  return response.json();
}

/**
 * Search diseases by name
 */
export async function searchDiseases(query: string, limit: number = 10): Promise<Disease[]> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/diseases/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to search diseases');
  }

  return response.json();
}

/**
 * Get current user's diseases
 */
export async function getCurrentUserDiseases(accessToken: string): Promise<Disease[]> {
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
 * Add a disease to current user's profile
 */
export async function addDiseaseToUser(
  diseaseId: number,
  accessToken: string
): Promise<{ message: string; disease: Disease }> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/users/me/diseases/${diseaseId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to add disease');
  }

  return response.json();
}

/**
 * Remove a disease from current user's profile
 */
export async function removeDiseaseFromUser(
  diseaseId: number,
  accessToken: string
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

