/**
 * API client for heart rate records.
 */

import { debugLog } from '@/lib/utils/debug';
import { getApiBaseUrl } from '@/lib/apiClient';

const apiClient = getApiBaseUrl();

export interface HeartRateRecord {
  id: string;
  user_id: string;
  recorded_at: string;
  bpm: number;
  visibility: 'public' | 'followers_only' | 'private';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateHeartRateRecordData {
  recorded_at: string;
  bpm: number;
  visibility?: 'public' | 'followers_only' | 'private';
  notes?: string;
}

export interface UpdateHeartRateRecordData {
  recorded_at?: string;
  bpm?: number;
  visibility?: 'public' | 'followers_only' | 'private';
  notes?: string;
}

/**
 * Get heart rate records for the current user.
 */
export async function getHeartRateRecords(
  skip: number = 0,
  limit: number = 20,
  accessToken: string
): Promise<HeartRateRecord[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('skip', skip.toString());
  queryParams.append('limit', limit.toString());
  const url = `${apiClient}/api/v1/heart-rate-records?${queryParams.toString()}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch heart rate records' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[getHeartRateRecords] Error:', error);
    throw error;
  }
}

/**
 * Get a specific heart rate record by ID.
 */
export async function getHeartRateRecord(
  recordId: string,
  accessToken: string
): Promise<HeartRateRecord> {
  const url = `${apiClient}/api/v1/heart-rate-records/${recordId}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch heart rate record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[getHeartRateRecord] Error:', error);
    throw error;
  }
}

/**
 * Create a new heart rate record.
 */
export async function createHeartRateRecord(
  data: CreateHeartRateRecordData,
  accessToken: string
): Promise<HeartRateRecord> {
  const url = `${apiClient}/api/v1/heart-rate-records`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to create heart rate record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[createHeartRateRecord] Error:', error);
    throw error;
  }
}

/**
 * Update a heart rate record.
 */
export async function updateHeartRateRecord(
  recordId: string,
  data: UpdateHeartRateRecordData,
  accessToken: string
): Promise<HeartRateRecord> {
  const url = `${apiClient}/api/v1/heart-rate-records/${recordId}`;
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to update heart rate record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[updateHeartRateRecord] Error:', error);
    throw error;
  }
}

/**
 * Delete a heart rate record.
 */
export async function deleteHeartRateRecord(
  recordId: string,
  accessToken: string
): Promise<void> {
  const url = `${apiClient}/api/v1/heart-rate-records/${recordId}`;
  
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to delete heart rate record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
  } catch (error: any) {
    debugLog.error('[deleteHeartRateRecord] Error:', error);
    throw error;
  }
}

