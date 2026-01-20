/**
 * API client for blood pressure records.
 */

import { debugLog } from '@/lib/utils/debug';
import { getApiBaseUrl } from '@/lib/config';

const apiClient = getApiBaseUrl();

export interface BloodPressureRecord {
  id: string;
  user_id: string;
  recorded_at: string;
  systolic: number;
  diastolic: number;
  visibility: 'public' | 'followers_only' | 'private';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBloodPressureRecordData {
  recorded_at: string;
  systolic: number;
  diastolic: number;
  visibility?: 'public' | 'followers_only' | 'private';
  notes?: string;
}

export interface UpdateBloodPressureRecordData {
  recorded_at?: string;
  systolic?: number;
  diastolic?: number;
  visibility?: 'public' | 'followers_only' | 'private';
  notes?: string;
}

/**
 * Get blood pressure records for the current user.
 */
export async function getBloodPressureRecords(
  skip: number = 0,
  limit: number = 20,
  accessToken: string,
  startDate?: Date,
  endDate?: Date
): Promise<BloodPressureRecord[]> {
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
  
  const url = `${apiClient}/api/v1/blood-pressure-records?${queryParams.toString()}`;

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
        .catch(() => ({ detail: 'Failed to fetch blood pressure records' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[getBloodPressureRecords] Error:', error);
    throw error;
  }
}

/**
 * Get a specific blood pressure record by ID.
 */
export async function getBloodPressureRecord(
  recordId: string,
  accessToken: string
): Promise<BloodPressureRecord> {
  const url = `${apiClient}/api/v1/blood-pressure-records/${recordId}`;

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
        .catch(() => ({ detail: 'Failed to fetch blood pressure record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[getBloodPressureRecord] Error:', error);
    throw error;
  }
}

/**
 * Create a new blood pressure record.
 */
export async function createBloodPressureRecord(
  data: CreateBloodPressureRecordData,
  accessToken: string
): Promise<BloodPressureRecord> {
  const url = `${apiClient}/api/v1/blood-pressure-records`;

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
        .catch(() => ({ detail: 'Failed to create blood pressure record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[createBloodPressureRecord] Error:', error);
    throw error;
  }
}

/**
 * Update a blood pressure record.
 */
export async function updateBloodPressureRecord(
  recordId: string,
  data: UpdateBloodPressureRecordData,
  accessToken: string
): Promise<BloodPressureRecord> {
  const url = `${apiClient}/api/v1/blood-pressure-records/${recordId}`;

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
        .catch(() => ({ detail: 'Failed to update blood pressure record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[updateBloodPressureRecord] Error:', error);
    throw error;
  }
}

/**
 * Delete a blood pressure record.
 */
export async function deleteBloodPressureRecord(
  recordId: string,
  accessToken: string
): Promise<void> {
  const url = `${apiClient}/api/v1/blood-pressure-records/${recordId}`;

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
        .catch(() => ({ detail: 'Failed to delete blood pressure record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
  } catch (error: any) {
    debugLog.error('[deleteBloodPressureRecord] Error:', error);
    throw error;
  }
}
