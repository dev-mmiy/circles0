/**
 * API client for weight records.
 */

import { debugLog } from '@/lib/utils/debug';
import { getApiBaseUrl } from '@/lib/config';

const apiClient = getApiBaseUrl();

export interface WeightRecord {
  id: string;
  user_id: string;
  recorded_at: string;
  value: number;
  unit: 'kg' | 'lb';
  visibility: 'public' | 'followers_only' | 'private';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWeightRecordData {
  recorded_at: string;
  value: number;
  unit?: 'kg' | 'lb';
  visibility?: 'public' | 'followers_only' | 'private';
  notes?: string;
}

export interface UpdateWeightRecordData {
  recorded_at?: string;
  value?: number;
  unit?: 'kg' | 'lb';
  visibility?: 'public' | 'followers_only' | 'private';
  notes?: string;
}

/**
 * Get weight records for the current user.
 */
export async function getWeightRecords(
  skip: number = 0,
  limit: number = 20,
  accessToken: string,
  startDate?: Date,
  endDate?: Date
): Promise<WeightRecord[]> {
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
  
  const url = `${apiClient}/api/v1/weight-records?${queryParams.toString()}`;

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
        .catch(() => ({ detail: 'Failed to fetch weight records' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[getWeightRecords] Error:', error);
    throw error;
  }
}

/**
 * Get a specific weight record by ID.
 */
export async function getWeightRecord(
  recordId: string,
  accessToken: string
): Promise<WeightRecord> {
  const url = `${apiClient}/api/v1/weight-records/${recordId}`;

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
        .catch(() => ({ detail: 'Failed to fetch weight record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[getWeightRecord] Error:', error);
    throw error;
  }
}

/**
 * Create a new weight record.
 */
export async function createWeightRecord(
  data: CreateWeightRecordData,
  accessToken: string
): Promise<WeightRecord> {
  const url = `${apiClient}/api/v1/weight-records`;

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
        .catch(() => ({ detail: 'Failed to create weight record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[createWeightRecord] Error:', error);
    throw error;
  }
}

/**
 * Update a weight record.
 */
export async function updateWeightRecord(
  recordId: string,
  data: UpdateWeightRecordData,
  accessToken: string
): Promise<WeightRecord> {
  const url = `${apiClient}/api/v1/weight-records/${recordId}`;

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
        .catch(() => ({ detail: 'Failed to update weight record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[updateWeightRecord] Error:', error);
    throw error;
  }
}

/**
 * Delete a weight record.
 */
export async function deleteWeightRecord(recordId: string, accessToken: string): Promise<void> {
  const url = `${apiClient}/api/v1/weight-records/${recordId}`;

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
        .catch(() => ({ detail: 'Failed to delete weight record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
  } catch (error: any) {
    debugLog.error('[deleteWeightRecord] Error:', error);
    throw error;
  }
}
