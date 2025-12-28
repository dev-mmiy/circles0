import { getApiBaseUrl } from '@/lib/config';

export interface Disease {
  id: number;
  name: string;
  disease_code?: string;
  description?: string;
  category?: string;
  severity_level?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations?: DiseaseTranslation[];
}

export interface DiseaseTranslation {
  id: number;
  disease_id: number;
  language_code: string;
  translated_name: string;
  details?: string;
  created_at: string;
  updated_at: string;
}

export interface DiseaseCategory {
  id: number;
  category_code: string;
  parent_category_id?: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations?: DiseaseCategoryTranslation[];
}

export interface DiseaseCategoryTranslation {
  id: number;
  category_id: number;
  language_code: string;
  translated_name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface DiseaseStatus {
  id: number;
  status_code: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations?: DiseaseStatusTranslation[];
}

export interface DiseaseStatusTranslation {
  id: number;
  status_id: number;
  language_code: string;
  translated_name: string;
  description?: string;
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
      Authorization: `Bearer ${accessToken}`,
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
      Authorization: `Bearer ${accessToken}`,
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
export async function removeDiseaseFromUser(diseaseId: number, accessToken: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/users/me/diseases/${diseaseId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to remove disease');
  }
}

/**
 * Get disease categories
 */
export async function getDiseaseCategories(rootOnly: boolean = false): Promise<DiseaseCategory[]> {
  const url = rootOnly
    ? `${getApiBaseUrl()}/api/v1/diseases/categories/?root_only=true`
    : `${getApiBaseUrl()}/api/v1/diseases/categories/`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch disease categories');
  }

  return response.json();
}

/**
 * Get disease category by ID
 */
export async function getDiseaseCategory(categoryId: number): Promise<DiseaseCategory> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/diseases/categories/${categoryId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch disease category');
  }

  return response.json();
}

/**
 * Get diseases by category
 */
export async function getDiseasesByCategory(
  categoryId: number,
  skip: number = 0,
  limit: number = 100
): Promise<Disease[]> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/diseases/categories/${categoryId}/diseases?skip=${skip}&limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch diseases by category');
  }

  return response.json();
}

/**
 * Get disease statuses
 */
export async function getDiseaseStatuses(): Promise<DiseaseStatus[]> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/diseases/statuses/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch disease statuses');
  }

  return response.json();
}

/**
 * Get disease translation
 */
export async function getDiseaseTranslation(
  diseaseId: number,
  languageCode: string
): Promise<DiseaseTranslation> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/diseases/${diseaseId}/translations/${languageCode}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch disease translation');
  }

  return response.json();
}

/**
 * Create a new disease
 */
export async function createDisease(
  name: string,
  accessToken: string
): Promise<Disease> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/diseases/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name,
      is_active: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create disease');
  }

  return response.json();
}
