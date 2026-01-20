/**
 * API client for body fat percentage records.
 */

import { debugLog } from '@/lib/utils/debug';
import { getApiBaseUrl } from '@/lib/config';

const apiClient = getApiBaseUrl();

export interface BodyFatRecord {
  id: string;
  user_id: string;
  recorded_at: string;
  percentage: number;
  visibility: 'public' | 'followers_only' | 'private';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBodyFatRecordData {
  recorded_at: string;
  percentage: number;
  visibility?: 'public' | 'followers_only' | 'private';
  notes?: string;
}

export interface UpdateBodyFatRecordData {
  recorded_at?: string;
  percentage?: number;
  visibility?: 'public' | 'followers_only' | 'private';
  notes?: string;
}

/**
 * Get body fat records for the current user.
 */
export async function getBodyFatRecords(
  skip: number = 0,
  limit: number = 20,
  accessToken: string,
  startDate?: Date,
  endDate?: Date
): Promise<BodyFatRecord[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('skip', skip.toString());
  queryParams.append('limit', limit.toString());
  
  // 日付範囲パラメータを追加
  if (startDate) {
    queryParams.append('start_date', startDate.toISOString());
  }
  if (endDate) {
    queryParams.append('end_date', endDate.toISOString());
  }
  
  const url = `${apiClient}/api/v1/body-fat-records?${queryParams.toString()}`;

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
        .catch(() => ({ detail: 'Failed to fetch body fat records' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[getBodyFatRecords] Error:', error);
    throw error;
  }
}

/**
 * Get a specific body fat record by ID.
 */
export async function getBodyFatRecord(
  recordId: string,
  accessToken: string
): Promise<BodyFatRecord> {
  const url = `${apiClient}/api/v1/body-fat-records/${recordId}`;

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
        .catch(() => ({ detail: 'Failed to fetch body fat record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[getBodyFatRecord] Error:', error);
    throw error;
  }
}

/**
 * Create a new body fat record.
 */
export async function createBodyFatRecord(
  data: CreateBodyFatRecordData,
  accessToken: string
): Promise<BodyFatRecord> {
  const url = `${apiClient}/api/v1/body-fat-records`;

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
        .catch(() => ({ detail: 'Failed to create body fat record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[createBodyFatRecord] Error:', error);
    throw error;
  }
}

/**
 * Update a body fat record.
 */
export async function updateBodyFatRecord(
  recordId: string,
  data: UpdateBodyFatRecordData,
  accessToken: string
): Promise<BodyFatRecord> {
  const url = `${apiClient}/api/v1/body-fat-records/${recordId}`;

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
        .catch(() => ({ detail: 'Failed to update body fat record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[updateBodyFatRecord] Error:', error);
    throw error;
  }
}

/**
 * Delete a body fat record.
 */
export async function deleteBodyFatRecord(recordId: string, accessToken: string): Promise<void> {
  const url = `${apiClient}/api/v1/body-fat-records/${recordId}`;

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
        .catch(() => ({ detail: 'Failed to delete body fat record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
  } catch (error: any) {
    debugLog.error('[deleteBodyFatRecord] Error:', error);
    throw error;
  }
}
