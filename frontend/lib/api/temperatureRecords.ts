/**
 * API client for temperature records.
 */

import { debugLog } from '@/lib/utils/debug';
import { getApiBaseUrl } from '@/lib/config';

const apiClient = getApiBaseUrl();

export interface TemperatureRecord {
  id: string;
  user_id: string;
  recorded_at: string;
  value: number;
  unit: 'celsius' | 'fahrenheit';
  visibility: 'public' | 'followers_only' | 'private';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTemperatureRecordData {
  recorded_at: string;
  value: number;
  unit?: 'celsius' | 'fahrenheit';
  visibility?: 'public' | 'followers_only' | 'private';
  notes?: string;
}

export interface UpdateTemperatureRecordData {
  recorded_at?: string;
  value?: number;
  unit?: 'celsius' | 'fahrenheit';
  visibility?: 'public' | 'followers_only' | 'private';
  notes?: string;
}

/**
 * Get temperature records for the current user.
 */
export async function getTemperatureRecords(
  skip: number = 0,
  limit: number = 20,
  accessToken: string,
  startDate?: Date,
  endDate?: Date
): Promise<TemperatureRecord[]> {
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
  
  const url = `${apiClient}/api/v1/temperature-records?${queryParams.toString()}`;

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
        .catch(() => ({ detail: 'Failed to fetch temperature records' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[getTemperatureRecords] Error:', error);
    throw error;
  }
}

/**
 * Get a specific temperature record by ID.
 */
export async function getTemperatureRecord(
  recordId: string,
  accessToken: string
): Promise<TemperatureRecord> {
  const url = `${apiClient}/api/v1/temperature-records/${recordId}`;

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
        .catch(() => ({ detail: 'Failed to fetch temperature record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[getTemperatureRecord] Error:', error);
    throw error;
  }
}

/**
 * Create a new temperature record.
 */
export async function createTemperatureRecord(
  data: CreateTemperatureRecordData,
  accessToken: string
): Promise<TemperatureRecord> {
  const url = `${apiClient}/api/v1/temperature-records`;

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
        .catch(() => ({ detail: 'Failed to create temperature record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[createTemperatureRecord] Error:', error);
    throw error;
  }
}

/**
 * Update a temperature record.
 */
export async function updateTemperatureRecord(
  recordId: string,
  data: UpdateTemperatureRecordData,
  accessToken: string
): Promise<TemperatureRecord> {
  const url = `${apiClient}/api/v1/temperature-records/${recordId}`;

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
        .catch(() => ({ detail: 'Failed to update temperature record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    debugLog.error('[updateTemperatureRecord] Error:', error);
    throw error;
  }
}

/**
 * Delete a temperature record.
 */
export async function deleteTemperatureRecord(
  recordId: string,
  accessToken: string
): Promise<void> {
  const url = `${apiClient}/api/v1/temperature-records/${recordId}`;

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
        .catch(() => ({ detail: 'Failed to delete temperature record' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
  } catch (error: any) {
    debugLog.error('[deleteTemperatureRecord] Error:', error);
    throw error;
  }
}
