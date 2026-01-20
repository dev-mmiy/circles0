/**
 * API client for blood glucose records.
 */

import { debugLog } from '@/lib/utils/debug';
import { getApiBaseUrl } from '@/lib/config';

const apiClient = getApiBaseUrl();

export interface BloodGlucoseRecord {
  id: string;
  user_id: string;
  recorded_at: string;
  value: number;
  timing?: 'fasting' | 'postprandial';
  visibility: 'public' | 'followers_only' | 'private';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBloodGlucoseRecordData {
  recorded_at: string;
  value: number;
  timing?: 'fasting' | 'postprandial';
  visibility?: 'public' | 'followers_only' | 'private';
  notes?: string;
}

export interface UpdateBloodGlucoseRecordData {
  recorded_at?: string;
  value?: number;
  timing?: 'fasting' | 'postprandial';
  visibility?: 'public' | 'followers_only' | 'private';
  notes?: string;
}

/**
 * Get blood glucose records for the current user.
 */
export async function getBloodGlucoseRecords(
  skip: number = 0,
  limit: number = 20,
  accessToken: string,
  startDate?: Date,
  endDate?: Date
): Promise<BloodGlucoseRecord[]> {
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
  
  const url = `${apiClient}/api/v1/blood-glucose-records?${queryParams.toString()}`;

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
        .catch(() => ({ detail: 'Failed to fetch blood glucose records' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[getBloodGlucoseRecords] Error:', error);
    throw error;
  }
}

/**
 * Get a specific blood glucose record by ID.
 */
export async function getBloodGlucoseRecord(
  recordId: string,
  accessToken: string
): Promise<BloodGlucoseRecord> {
  const url = `${apiClient}/api/v1/blood-glucose-records/${recordId}`;

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
        .catch(() => ({ detail: 'Failed to fetch blood glucose record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[getBloodGlucoseRecord] Error:', error);
    throw error;
  }
}

/**
 * Create a new blood glucose record.
 */
export async function createBloodGlucoseRecord(
  data: CreateBloodGlucoseRecordData,
  accessToken: string
): Promise<BloodGlucoseRecord> {
  const url = `${apiClient}/api/v1/blood-glucose-records`;

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
        .catch(() => ({ detail: 'Failed to create blood glucose record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[createBloodGlucoseRecord] Error:', error);
    throw error;
  }
}

/**
 * Update a blood glucose record.
 */
export async function updateBloodGlucoseRecord(
  recordId: string,
  data: UpdateBloodGlucoseRecordData,
  accessToken: string
): Promise<BloodGlucoseRecord> {
  const url = `${apiClient}/api/v1/blood-glucose-records/${recordId}`;

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
        .catch(() => ({ detail: 'Failed to update blood glucose record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[updateBloodGlucoseRecord] Error:', error);
    throw error;
  }
}

/**
 * Delete a blood glucose record.
 */
export async function deleteBloodGlucoseRecord(
  recordId: string,
  accessToken: string
): Promise<void> {
  const url = `${apiClient}/api/v1/blood-glucose-records/${recordId}`;

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
        .catch(() => ({ detail: 'Failed to delete blood glucose record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
  } catch (error: any) {
    debugLog.error('[deleteBloodGlucoseRecord] Error:', error);
    throw error;
  }
}
