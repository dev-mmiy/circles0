/**
 * API client for SpO2 records.
 */

import { debugLog } from '@/lib/utils/debug';
import { getApiBaseUrl } from '@/lib/config';

const apiClient = getApiBaseUrl();

export interface SpO2Record {
  id: string;
  user_id: string;
  recorded_at: string;
  percentage: number;
  visibility: 'public' | 'followers_only' | 'private';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSpO2RecordData {
  recorded_at: string;
  percentage: number;
  visibility?: 'public' | 'followers_only' | 'private';
  notes?: string;
}

export interface UpdateSpO2RecordData {
  recorded_at?: string;
  percentage?: number;
  visibility?: 'public' | 'followers_only' | 'private';
  notes?: string;
}

/**
 * Get SpO2 records for the current user.
 */
export async function getSpO2Records(
  skip: number = 0,
  limit: number = 20,
  accessToken: string
): Promise<SpO2Record[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('skip', skip.toString());
  queryParams.append('limit', limit.toString());
  const url = `${apiClient}/api/v1/spo2-records?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: 'Failed to fetch SpO2 records' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[getSpO2Records] Error:', error);
    throw error;
  }
}

/**
 * Get a specific SpO2 record by ID.
 */
export async function getSpO2Record(recordId: string, accessToken: string): Promise<SpO2Record> {
  const url = `${apiClient}/api/v1/spo2-records/${recordId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: 'Failed to fetch SpO2 record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[getSpO2Record] Error:', error);
    throw error;
  }
}

/**
 * Create a new SpO2 record.
 */
export async function createSpO2Record(
  data: CreateSpO2RecordData,
  accessToken: string
): Promise<SpO2Record> {
  const url = `${apiClient}/api/v1/spo2-records`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: 'Failed to create SpO2 record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[createSpO2Record] Error:', error);
    throw error;
  }
}

/**
 * Update a SpO2 record.
 */
export async function updateSpO2Record(
  recordId: string,
  data: UpdateSpO2RecordData,
  accessToken: string
): Promise<SpO2Record> {
  const url = `${apiClient}/api/v1/spo2-records/${recordId}`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: 'Failed to update SpO2 record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[updateSpO2Record] Error:', error);
    throw error;
  }
}

/**
 * Delete a SpO2 record.
 */
export async function deleteSpO2Record(recordId: string, accessToken: string): Promise<void> {
  const url = `${apiClient}/api/v1/spo2-records/${recordId}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: 'Failed to delete SpO2 record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
  } catch (error: any) {
    debugLog.error('[deleteSpO2Record] Error:', error);
    throw error;
  }
}
